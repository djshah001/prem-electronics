import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, pool } from '../../infrastructure/database/db.js';
import { users } from '../../infrastructure/database/schema/index.js';
import { businessesRepository } from './businesses.repository.js';
import { businessesService } from './businesses.service.js';

const billingAddress = { street: 'Test Street', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411001', country: 'India', source: 'customer' as const };

test('verification ownership is enforced while the same GSTIN remains account-scoped', async (t) => {
  const suffix = randomUUID();
  const created = await db.insert(users).values([
    { name: 'Business A', email: `business-a-${suffix}@example.test`, passwordHash: 'not-a-real-password-hash', isVerified: true },
    { name: 'Business B', email: `business-b-${suffix}@example.test`, passwordHash: 'not-a-real-password-hash', isVerified: true },
  ]).returning();
  t.after(async () => {
    await db.delete(users).where(eq(users.id, created[0].id));
    await db.delete(users).where(eq(users.id, created[1].id));
    await pool.end();
  });

  const checkedAt = new Date();
  const expiresAt = new Date(Date.now() + 60_000);
  const base = { gstin: '27AAPFU0939F1ZV', provider: 'fixture', registrationStatus: 'active', legalName: 'TEST REGISTRATION', stateCode: '27', stateName: 'Maharashtra', checkedAt, expiresAt };
  const verificationA = await businessesRepository.createVerification({ ...base, userId: created[0].id });
  const verificationB = await businessesRepository.createVerification({ ...base, userId: created[1].id });

  await assert.rejects(
    businessesService.create(created[1].id, { verificationId: verificationA.id, billingAddress, isDefault: true }),
    (error: any) => error?.statusCode === 404
  );
  const profileA = await businessesService.create(created[0].id, { verificationId: verificationA.id, billingAddress, isDefault: true });
  const profileB = await businessesService.create(created[1].id, { verificationId: verificationB.id, billingAddress, isDefault: true });
  assert.equal(profileA.gstin, profileB.gstin);
  assert.notEqual(profileA.userId, profileB.userId);
});
