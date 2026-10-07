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

  async createSession(userId: string, tokenHash: string, expiresAt: Date) {
    const [session] = await db.insert(authSessions)
      .values({ userId, tokenHash, expiresAt })
      .returning();
    return session;
  },

  async rotateSession(currentTokenHash: string, nextTokenHash: string, nextExpiresAt: Date): Promise<{ user: User; sessionId: string } | undefined> {
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
      const [nextSession] = await tx.insert(authSessions).values({
        userId: user.id,
        familyId: session.familyId,
        tokenHash: nextTokenHash,
        expiresAt: nextExpiresAt,
      }).returning({ id: authSessions.id });
      return { user, sessionId: nextSession.id };
    });
  },

  async findActiveSession(sessionId: string, userId: string) {
    const [session] = await db.select({ id: authSessions.id })
      .from(authSessions)
      .where(and(
        eq(authSessions.id, sessionId),
        eq(authSessions.userId, userId),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, new Date())
      ))
      .limit(1);
    return session;
  },

  async revokeSessionFamily(input: { tokenHash?: string; sessionId?: string }): Promise<void> {
    await db.transaction(async (tx) => {
      const lookup = input.tokenHash
        ? eq(authSessions.tokenHash, input.tokenHash)
        : input.sessionId
          ? eq(authSessions.id, input.sessionId)
          : undefined;
      if (!lookup) return;

      const [session] = await tx.select({ familyId: authSessions.familyId })
        .from(authSessions)
        .where(lookup)
        .for('update')
        .limit(1);
      if (!session) return;

      await tx.update(authSessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(authSessions.familyId, session.familyId), isNull(authSessions.revokedAt)));
    });
  },

  async revokeAllSessions(userId: string): Promise<void> {
    await db.update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
  },
};
