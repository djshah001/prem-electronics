import { eq } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db';
import { users, type NewUser, type User } from '../../infrastructure/database/schema/index';

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
};
