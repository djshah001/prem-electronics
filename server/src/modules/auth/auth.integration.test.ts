import assert from 'node:assert/strict';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import { users } from '../../infrastructure/database/schema/index.js';
import { authRepository } from './auth.repository.js';

test('revoking an old refresh token invalidates the entire rotated session family', async () => {
  const suffix = crypto.randomUUID();
  const [user] = await db.insert(users).values({
    name: 'P2 Auth Fixture', email: `p2-auth-${suffix}@example.test`, passwordHash: 'fixture-not-a-real-password-hash', isVerified: true,
  }).returning();
  try {
    const initial = await authRepository.createSession(user.id, `a${suffix.replaceAll('-', '')}`, new Date(Date.now() + 60_000));
    const rotated = await authRepository.rotateSession(`a${suffix.replaceAll('-', '')}`, `b${suffix.replaceAll('-', '')}`, new Date(Date.now() + 60_000));
    assert.ok(rotated);
    assert.ok(await authRepository.findActiveSession(rotated.sessionId, user.id));
    await authRepository.revokeSessionFamily({ tokenHash: `a${suffix.replaceAll('-', '')}` });
    assert.equal(await authRepository.findActiveSession(rotated.sessionId, user.id), undefined);
    assert.equal(await authRepository.findActiveSession(initial.id, user.id), undefined);
  } finally {
    await db.delete(users).where(eq(users.id, user.id));
  }
});
