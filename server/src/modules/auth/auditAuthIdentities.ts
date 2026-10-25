import { pool } from '../../infrastructure/database/db.js';
import { normalizeAuthPhone } from '../../infrastructure/otp/phone.js';

type AuditRow = {
  id: string;
  name: string;
  role: 'customer' | 'admin' | 'superadmin';
  is_blocked: boolean;
  phone: string | null;
  auth_phone_e164?: string | null;
  phone_verified_at?: Date | null;
};

const columnResult = await pool.query<{ exists: boolean }>(`select exists (
  select 1 from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = 'auth_phone_e164'
)`);
const migrated = columnResult.rows[0]?.exists === true;
const result = await pool.query<AuditRow>(migrated
  ? 'select id, name, role, is_blocked, phone, auth_phone_e164, phone_verified_at from users order by created_at asc'
  : 'select id, name, role, is_blocked, phone from users order by created_at asc');

const canonicalGroups = new Map<string, string[]>();
const records = result.rows.map((row) => {
  let untrustedContactCandidate: string | null = null;
  let contactIssue: string | null = null;
  if (row.phone) {
    try { untrustedContactCandidate = normalizeAuthPhone(row.phone); }
    catch (error) { contactIssue = error instanceof Error ? error.message : 'invalid contact phone'; }
  }
  const groupingPhone = row.auth_phone_e164 ?? untrustedContactCandidate;
  if (groupingPhone) canonicalGroups.set(groupingPhone, [...(canonicalGroups.get(groupingPhone) ?? []), row.id]);
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    isBlocked: row.is_blocked,
    trustedAuthPhoneE164: row.auth_phone_e164 ?? null,
    phoneVerifiedAt: row.phone_verified_at ?? null,
    trustedIdentity: Boolean(row.auth_phone_e164 && row.phone_verified_at),
    untrustedContactPhone: row.phone,
    untrustedContactCandidate,
    contactIssue,
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'dry-run',
  schemaMigrated: migrated,
  summary: {
    users: records.length,
    trustedVerifiedIdentities: records.filter((row) => row.trustedIdentity).length,
    missingTrustedIdentity: records.filter((row) => !row.trustedIdentity).length,
    invalidContactNumbers: records.filter((row) => row.contactIssue).length,
    privilegedUsers: records.filter((row) => row.role !== 'customer').length,
  },
  duplicates: [...canonicalGroups.entries()].filter(([, ids]) => ids.length > 1).map(([canonicalPhone, userIds]) => ({ canonicalPhone, userIds })),
  unresolved: records.filter((row) => !row.trustedIdentity),
  trusted: records.filter((row) => row.trustedIdentity),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
await pool.end();
