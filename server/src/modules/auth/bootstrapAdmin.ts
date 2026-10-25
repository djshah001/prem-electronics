import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db, pool } from '../../infrastructure/database/db.js';
import {
  authIdentityAuditEvents,
  authSessions,
  users,
} from '../../infrastructure/database/schema/index.js';
import { normalizeAuthPhone } from '../../infrastructure/otp/phone.js';

const bootstrapInputSchema = z.object({
  userId: z.string().uuid(),
  phone: z.string().min(8),
  role: z.enum(['admin', 'superadmin']).default('admin'),
});

type BootstrapInput = z.infer<typeof bootstrapInputSchema>;

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function maskPhone(phone: string | null) {
  if (!phone) return null;
  return `${phone.slice(0, 3)}******${phone.slice(-3)}`;
}

function parseConfirmation(args: string[]) {
  const argument = args.find((arg) => arg.startsWith('--confirm-user='));
  return argument?.slice('--confirm-user='.length);
}

async function bootstrapAdmin(input: BootstrapInput, apply: boolean) {
  const canonicalPhone = normalizeAuthPhone(input.phone);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, input.userId))
      .for('update')
      .limit(1);

    if (!user) throw new Error(`Unknown user ID: ${input.userId}`);
    if (user.isBlocked) {
      throw new Error(`User ${input.userId} is blocked and cannot be bootstrapped.`);
    }
    if (user.role === 'superadmin' && input.role === 'admin') {
      throw new Error('Refusing to downgrade an existing superadmin to admin.');
    }

    const [phoneConflict] = await tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.authPhoneE164, canonicalPhone),
          ne(users.id, input.userId),
        ),
      )
      .limit(1);

    if (phoneConflict) {
      throw new Error(
        `The reviewed phone is already assigned to user ${phoneConflict.id}.`,
      );
    }

    const alreadyProvisioned =
      user.role === input.role &&
      user.authPhoneE164 === canonicalPhone &&
      user.phoneVerifiedAt !== null &&
      user.isVerified &&
      user.onboardingCompletedAt !== null;

    const result = {
      userId: user.id,
      name: user.name,
      email: user.email,
      previousRole: user.role,
      nextRole: input.role,
      previousPhone: maskPhone(user.authPhoneE164),
      nextPhone: maskPhone(canonicalPhone),
      status: alreadyProvisioned
        ? 'already-provisioned'
        : apply
          ? 'applied'
          : 'pending',
    };

    if (!apply || alreadyProvisioned) return result;

    await tx
      .update(users)
      .set({
        role: input.role,
        authPhoneE164: canonicalPhone,
        phoneVerifiedAt: now,
        isVerified: true,
        onboardingCompletedAt: user.onboardingCompletedAt ?? now,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    await tx
      .update(authSessions)
      .set({ revokedAt: now })
      .where(eq(authSessions.userId, user.id));

    await tx.insert(authIdentityAuditEvents).values({
      userId: user.id,
      action: 'admin_bootstrap',
      previousPhoneHash: user.authPhoneE164
        ? sha256(user.authPhoneE164)
        : null,
      nextPhoneHash: sha256(canonicalPhone),
      actor: process.env.AUTH_BOOTSTRAP_ACTOR!.trim().slice(0, 100),
      metadata: JSON.stringify({
        previousRole: user.role,
        nextRole: input.role,
        source: 'private-admin-bootstrap',
        appliedAt: now.toISOString(),
      }),
    });

    return result;
  });
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const file = args.find((arg) => !arg.startsWith('--'));

  if (!file) {
    throw new Error(
      'Usage: npm run auth:bootstrap-admin -- <private-file.json> [--apply --confirm-user=<uuid>]',
    );
  }

  const input = bootstrapInputSchema.parse(
    JSON.parse(await readFile(file, 'utf8')),
  );

  if (apply) {
    const actor = process.env.AUTH_BOOTSTRAP_ACTOR?.trim();
    if (!actor) {
      throw new Error('AUTH_BOOTSTRAP_ACTOR is required when using --apply.');
    }
    if (parseConfirmation(args) !== input.userId) {
      throw new Error(
        `Applying requires --confirm-user=${input.userId} to acknowledge the role change.`,
      );
    }
  }

  const result = await bootstrapAdmin(input, apply);
  process.stdout.write(
    `${JSON.stringify({ mode: apply ? 'apply' : 'dry-run', result }, null, 2)}\n`,
  );
}

try {
  await main();
} finally {
  await pool.end();
}
