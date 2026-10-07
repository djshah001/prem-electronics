import { and, asc, eq, gt, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import { businessProfiles, gstVerifications, type NewBusinessProfile } from '../../infrastructure/database/schema/index.js';

export const businessesRepository = {
  async findFreshVerification(userId: string, gstin: string) {
    const [verification] = await db.select().from(gstVerifications).where(and(
      eq(gstVerifications.userId, userId), eq(gstVerifications.gstin, gstin), gt(gstVerifications.expiresAt, new Date())
    )).orderBy(asc(gstVerifications.expiresAt)).limit(1);
    return verification;
  },

  async createVerification(data: typeof gstVerifications.$inferInsert) {
    const [verification] = await db.insert(gstVerifications).values(data).returning();
    return verification;
  },

  async list(userId: string) {
    return db.select().from(businessProfiles).where(and(eq(businessProfiles.userId, userId), eq(businessProfiles.isArchived, false)))
      .orderBy(sql`${businessProfiles.isDefault} DESC`, asc(businessProfiles.createdAt));
  },

  async findById(id: string, userId: string) {
    const [profile] = await db.select().from(businessProfiles).where(and(
      eq(businessProfiles.id, id), eq(businessProfiles.userId, userId), eq(businessProfiles.isArchived, false)
    )).limit(1);
    return profile;
  },

  async findVerificationById(id: string, userId: string) {
    const [verification] = await db.select().from(gstVerifications).where(and(eq(gstVerifications.id, id), eq(gstVerifications.userId, userId))).limit(1);
    return verification;
  },

  async createFromVerification(userId: string, verificationId: string, editable: Omit<NewBusinessProfile, 'userId' | 'verificationId' | 'gstin' | 'legalName' | 'tradeName' | 'taxpayerType' | 'registrationStatus' | 'registrationStateCode' | 'registrationStateName' | 'registeredAddress' | 'verifiedAt'>) {
    return db.transaction(async (tx) => {
      const [verification] = await tx.select().from(gstVerifications).where(and(
        eq(gstVerifications.id, verificationId), eq(gstVerifications.userId, userId)
      )).for('update').limit(1);
      if (!verification) return { kind: 'missing' as const };
      if (verification.expiresAt <= new Date()) return { kind: 'expired' as const };
      if (verification.registrationStatus !== 'active') return { kind: 'inactive' as const };
      const [existing] = await tx.select().from(businessProfiles).where(and(
        eq(businessProfiles.userId, userId), eq(businessProfiles.gstin, verification.gstin)
      )).for('update').limit(1);
      const shouldDefault = editable.isDefault || !(await tx.select({ id: businessProfiles.id }).from(businessProfiles).where(and(
        eq(businessProfiles.userId, userId), eq(businessProfiles.isArchived, false)
      )).limit(1))[0];
      if (shouldDefault) await tx.update(businessProfiles).set({ isDefault: false }).where(eq(businessProfiles.userId, userId));
      const identity = {
        verificationId, gstin: verification.gstin, legalName: verification.legalName,
        tradeName: verification.tradeName, taxpayerType: verification.taxpayerType,
        registrationStatus: verification.registrationStatus, registrationStateCode: verification.stateCode,
        registrationStateName: verification.stateName, registeredAddress: verification.principalAddress,
        verifiedAt: verification.checkedAt,
      };
      if (existing) {
        const [profile] = await tx.update(businessProfiles).set({ ...identity, ...editable, isDefault: shouldDefault, isArchived: false, version: existing.version + 1, updatedAt: new Date() })
          .where(eq(businessProfiles.id, existing.id)).returning();
        return { kind: 'ok' as const, profile };
      }
      const [profile] = await tx.insert(businessProfiles).values({ userId, ...identity, ...editable, isDefault: shouldDefault }).returning();
      return { kind: 'ok' as const, profile };
    });
  },

  async update(id: string, userId: string, version: number, data: Partial<typeof businessProfiles.$inferInsert>) {
    return db.transaction(async (tx) => {
      const [current] = await tx.select().from(businessProfiles).where(and(eq(businessProfiles.id, id), eq(businessProfiles.userId, userId), eq(businessProfiles.isArchived, false))).for('update').limit(1);
      if (!current) return { kind: 'missing' as const };
      if (current.version !== version) return { kind: 'conflict' as const };
      if (data.isDefault) await tx.update(businessProfiles).set({ isDefault: false }).where(eq(businessProfiles.userId, userId));
      const [profile] = await tx.update(businessProfiles).set({ ...data, version: current.version + 1, updatedAt: new Date() })
        .where(eq(businessProfiles.id, id)).returning();
      return { kind: 'ok' as const, profile };
    });
  },

  async archive(id: string, userId: string) {
    return db.transaction(async (tx) => {
      const [current] = await tx.select().from(businessProfiles).where(and(eq(businessProfiles.id, id), eq(businessProfiles.userId, userId), eq(businessProfiles.isArchived, false))).for('update').limit(1);
      if (!current) return false;
      await tx.update(businessProfiles).set({ isArchived: true, isDefault: false, version: current.version + 1, updatedAt: new Date() }).where(eq(businessProfiles.id, id));
      if (current.isDefault) {
        const [replacement] = await tx.select({ id: businessProfiles.id }).from(businessProfiles).where(and(eq(businessProfiles.userId, userId), eq(businessProfiles.isArchived, false))).orderBy(asc(businessProfiles.createdAt)).limit(1);
        if (replacement) await tx.update(businessProfiles).set({ isDefault: true, updatedAt: new Date() }).where(eq(businessProfiles.id, replacement.id));
      }
      return true;
    });
  },
};
