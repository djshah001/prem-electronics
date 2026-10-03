import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import { authSessions, users, type NewUser, type User } from '../../infrastructure/database/schema/index.js';

export const authRepository = {
  async findByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  },

  async findById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  },

  async create(data: NewUser): Promise<User> {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  },

  async updateUser(userId: string, data: Partial<NewUser>): Promise<User> {
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  },

  async updateOTP(userId: string, otp: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({ otpToken: otp, otpExpiry: expiry, updatedAt: new Date() })
      .where(eq(users.id, userId));
  },

  async verifyUser(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ isVerified: true, otpToken: null, otpExpiry: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
  },

  async setResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({ resetToken: token, resetTokenExpiry: expiry, updatedAt: new Date() })
      .where(eq(users.id, userId));
  },

  async findByResetToken(token: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.resetToken, token))
      .limit(1);
    return result[0];
  },

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  },

  async createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await db.insert(authSessions).values({ userId, tokenHash, expiresAt });
  },

  async rotateSession(currentTokenHash: string, nextTokenHash: string, nextExpiresAt: Date): Promise<User | undefined> {
    return db.transaction(async (tx) => {
      const [session] = await tx.select().from(authSessions)
        .where(and(
          eq(authSessions.tokenHash, currentTokenHash),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date())
        ))
        .for('update')
        .limit(1);
      if (!session) return undefined;

      const [user] = await tx.select().from(users).where(eq(users.id, session.userId)).limit(1);
      if (!user || user.isBlocked || !user.isVerified) return undefined;

      await tx.update(authSessions)
        .set({ revokedAt: new Date() })
        .where(eq(authSessions.id, session.id));
      await tx.insert(authSessions).values({
        userId: user.id,
        tokenHash: nextTokenHash,
        expiresAt: nextExpiresAt,
      });
      return user;
    });
  },

  async revokeSession(tokenHash: string): Promise<void> {
    await db.update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.tokenHash, tokenHash), isNull(authSessions.revokedAt)));
  },

  async revokeAllSessions(userId: string): Promise<void> {
    await db.update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
  },
};
