import crypto from "crypto";
import { readFile } from "node:fs/promises";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, pool } from "../../infrastructure/database/db.js";
import {
  authIdentityAuditEvents,
  authSessions,
  users,
} from "../../infrastructure/database/schema/index.js";
import { normalizeAuthPhone } from "../../infrastructure/otp/phone.js";

const mappingSchema = z
  .array(z.object({ userId: z.string().uuid(), phone: z.string().min(8) }))
  .min(1);
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const privilegedOnly = args.includes("--privileged-only");
const file = args.find((arg) => !arg.startsWith("--"));
if (!file)
  throw new Error(
    "Usage: npm run auth:map-phones -- mappings.private.json [--apply] [--privileged-only]",
  );

const mappings = mappingSchema
  .parse(JSON.parse(await readFile(file, "utf8")))
  .map((mapping) => ({
    ...mapping,
    canonicalPhone: normalizeAuthPhone(mapping.phone),
  }));
const duplicateInputs = mappings.filter(
  (mapping, index) =>
    mappings.findIndex(
      (candidate) => candidate.canonicalPhone === mapping.canonicalPhone,
    ) !== index,
);
if (duplicateInputs.length)
  throw new Error(
    `Duplicate canonical phones in mapping input: ${duplicateInputs.map((entry) => entry.canonicalPhone).join(", ")}`,
  );

const review = await db.transaction(async (tx) => {
  const output: Array<Record<string, unknown>> = [];
  for (const mapping of mappings) {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, mapping.userId))
      .for("update")
      .limit(1);
    if (!user) throw new Error(`Unknown user ID: ${mapping.userId}`);
    if (privilegedOnly && user.role === "customer")
      throw new Error(`User ${mapping.userId} is not privileged.`);
    const [conflict] = await tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.authPhoneE164, mapping.canonicalPhone),
          ne(users.id, user.id),
        ),
      )
      .limit(1);
    if (conflict)
      throw new Error(
        `Phone ${mapping.canonicalPhone} is already linked to user ${conflict.id}`,
      );
    output.push({
      userId: user.id,
      role: user.role,
      isBlocked: user.isBlocked,
      previous: user.authPhoneE164,
      next: mapping.canonicalPhone,
      action: apply ? "apply" : "dry-run",
    });
    if (!apply) continue;
    const now = new Date();
    await tx
      .update(users)
      .set({
        authPhoneE164: mapping.canonicalPhone,
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
      action: privilegedOnly
        ? "admin_phone_bootstrap"
        : "reviewed_phone_mapping",
      previousPhoneHash: user.authPhoneE164
        ? crypto.createHash("sha256").update(user.authPhoneE164).digest("hex")
        : null,
      nextPhoneHash: crypto
        .createHash("sha256")
        .update(mapping.canonicalPhone)
        .digest("hex"),
      actor:
        process.env.AUTH_MAPPING_ACTOR?.slice(0, 100) ||
        "private_mapping_command",
      metadata: JSON.stringify({
        sourceFile: "private-local-file",
        appliedAt: now.toISOString(),
      }),
    });
  }
  return output;
});

process.stdout.write(
  `${JSON.stringify({ mode: apply ? "applied" : "dry-run", privilegedOnly, mappings: review }, null, 2)}\n`,
);
await pool.end();
