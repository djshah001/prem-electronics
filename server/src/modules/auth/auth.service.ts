import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { and, count, eq, gt, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { env } from '../../config/env.js';
import logger from '../../core/logger/logger.js';
import { AppError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../core/errors/appError.js';
import { db } from '../../infrastructure/database/db.js';
import {
  authIdentityAuditEvents,
  authSessions,
  marketingPreferences,
  mobileMarketingPreferences,
  whatsappMarketingSuppressions,
  otpChallenges,
  users,
  type OtpChallenge,
  type User,
} from '../../infrastructure/database/schema/index.js';
import { maskPhone, normalizeAuthPhone, toMsg91Identifier } from '../../infrastructure/otp/phone.js';
import { otpProvider, OtpProviderError } from '../../infrastructure/otp/otpProvider.js';
import { createAdminNotification } from '../notifications/notifications.service.js';
import { emailMasterService } from '../communications/email.service.js';
import { messageService } from '../communications/message.service.js';
import { authRepository } from './auth.repository.js';
import type { OnboardingInput, OtpVerifyInput, PhoneChangeCompleteInput } from './auth.schema.js';

type PublicAudience = 'customer' | 'admin';
type ChallengePurpose = 'customer_login' | 'admin_login' | 'phone_change_current' | 'phone_change_new';
type RequestContext = { ip: string; userAgent: string };

const ACTIVE_STATUSES = ['sending', 'sent', 'verifying', 'verified'] as const;
const bindingSecret = env.OTP_BINDING_SECRET ?? env.JWT_SECRET;

const hashValue = (value: string): string => crypto.createHmac('sha256', bindingSecret).update(value).digest('hex');
const randomToken = (): string => crypto.randomBytes(48).toString('base64url');
const providerRefKey = crypto.createHash('sha256').update(bindingSecret).digest();
const protectProviderRef = (value: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', providerRefKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
};
const revealProviderRef = (value: string): string => {
  try {
    const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
    if (!iv || !tag || !encrypted) throw new Error('invalid provider reference');
    const decipher = crypto.createDecipheriv('aes-256-gcm', providerRefKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    throw new AppError('OTP provider reference is invalid. Request a new code.', 409, { code: 'invalid_state' });
  }
};
const nowPlus = (seconds: number): Date => new Date(Date.now() + seconds * 1000);
const isPrivileged = (user: User): boolean => user.role === 'admin' || user.role === 'superadmin';

const sanitizeUser = (user: User) => {
  const { passwordHash, otpToken, otpExpiry, resetToken, resetTokenExpiry, ...safe } = user;
  return { ...safe, onboardingRequired: !user.onboardingCompletedAt };
};

const generateAccessToken = (user: User, sessionId: string): string => jwt.sign(
  { id: user.id, role: user.role, sid: sessionId, av: env.AUTH_TOKEN_VERSION },
  env.JWT_SECRET,
  { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN } as jwt.SignOptions
);

const newSessionMaterial = () => ({
  refreshToken: randomToken(),
  expiresAt: nowPlus(env.REFRESH_TOKEN_DAYS * 24 * 60 * 60),
});

const sessionResult = (user: User, sessionId: string, refreshToken: string) => ({
  accessToken: generateAccessToken(user, sessionId),
  refreshToken,
  user: sanitizeUser(user),
});

const challengeResponse = (challenge: Pick<OtpChallenge, 'id' | 'canonicalPhone' | 'expiresAt' | 'resendAvailableAt'>) => ({
  challengeId: challenge.id,
  maskedDestination: maskPhone(challenge.canonicalPhone),
  expiresAt: challenge.expiresAt.toISOString(),
  resendAvailableAt: challenge.resendAvailableAt.toISOString(),
  status: 'sent' as const,
});

const fail = (message: string, status: number, code: string, retryAfter?: Date): never => {
  throw new AppError(message, status, { code, ...(retryAfter ? { retryAfter: retryAfter.toISOString() } : {}) });
};

const normalizeProviderIdentifier = (identifier: string): string => {
  const trimmed = identifier.trim();
  return normalizeAuthPhone(trimmed.startsWith('+') ? trimmed : `+${trimmed}`);
};

const assertSendBudget = async (tx: any, canonicalPhone: string, context: RequestContext) => {
  const ipHash = hashValue(`ip:${context.ip}`);
  const deviceHash = hashValue(`device:${context.ip}:${context.userAgent.slice(0, 300)}`);
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60_000);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000);
  const hourAgo = new Date(Date.now() - 60 * 60_000);

  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`otp:${canonicalPhone}`}))`);
  const sends = sql<number>`coalesce(sum(1 + ${otpChallenges.resendCount}), 0)`;
  const [[phoneShort], [phoneDaily], [ipShort], [globalHourly]] = await Promise.all([
    tx.select({ value: sends }).from(otpChallenges).where(and(eq(otpChallenges.canonicalPhone, canonicalPhone), gte(otpChallenges.createdAt, fifteenMinutesAgo))),
    tx.select({ value: sends }).from(otpChallenges).where(and(eq(otpChallenges.canonicalPhone, canonicalPhone), gte(otpChallenges.createdAt, dayAgo))),
    tx.select({ value: sends }).from(otpChallenges).where(and(eq(otpChallenges.ipHash, ipHash), gte(otpChallenges.createdAt, fifteenMinutesAgo))),
    tx.select({ value: sends }).from(otpChallenges).where(gte(otpChallenges.createdAt, hourAgo)),
  ]);
  if (Number(phoneShort.value) >= env.OTP_PHONE_SENDS_PER_15_MINUTES) fail('Too many OTP requests. Try again later.', 429, 'rate_limited', new Date(Date.now() + 15 * 60_000));
  if (Number(phoneDaily.value) >= env.OTP_PHONE_SENDS_PER_DAY) fail('Daily OTP limit reached. Try again tomorrow.', 429, 'rate_limited', new Date(Date.now() + 24 * 60 * 60_000));
  if (Number(ipShort.value) >= env.OTP_IP_SENDS_PER_15_MINUTES) fail('Too many OTP requests from this network.', 429, 'rate_limited', new Date(Date.now() + 15 * 60_000));
  if (Number(globalHourly.value) >= env.OTP_GLOBAL_SENDS_PER_HOUR) fail('OTP service is temporarily busy.', 503, 'provider_unavailable', new Date(Date.now() + 60 * 60_000));
  return { ipHash, deviceHash };
};

const expireAndPruneChallenges = async () => {
  const now = new Date();
  await db.update(otpChallenges).set({ status: 'expired', updatedAt: now })
    .where(and(inArray(otpChallenges.status, ['sending', 'sent', 'verifying', 'verified']), lt(otpChallenges.expiresAt, now)));
  await db.execute(sql`delete from otp_challenges where id in (
    select id from otp_challenges where created_at < now() - interval '7 days' order by created_at asc limit 500
  )`);
};

const createChallenge = async (input: {
  canonicalPhone: string;
  purpose: ChallengePurpose;
  binding: string;
  context: RequestContext;
  boundUserId?: string;
  suppressDelivery?: boolean;
}): Promise<OtpChallenge> => {
  if (!env.OTP_AUTH_ENABLED) fail('Mobile authentication is temporarily unavailable.', 503, 'otp_disabled');
  await expireAndPruneChallenges();
  const expiresAt = nowPlus(env.OTP_LIFETIME_SECONDS);
  const resendAvailableAt = nowPlus(env.OTP_RESEND_COOLDOWN_SECONDS);

  const challenge = await db.transaction(async (tx) => {
    const { ipHash, deviceHash } = await assertSendBudget(tx, input.canonicalPhone, input.context);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`challenge:${input.canonicalPhone}`}))`);
    const [latest] = await tx.select({ generation: sql<number>`coalesce(max(${otpChallenges.generation}), 0)` })
      .from(otpChallenges).where(and(eq(otpChallenges.canonicalPhone, input.canonicalPhone), eq(otpChallenges.purpose, input.purpose)));
    await tx.update(otpChallenges).set({ status: 'superseded', updatedAt: new Date() })
      .where(and(eq(otpChallenges.canonicalPhone, input.canonicalPhone), inArray(otpChallenges.status, [...ACTIVE_STATUSES])));
    const [created] = await tx.insert(otpChallenges).values({
      canonicalPhone: input.canonicalPhone,
      purpose: input.purpose,
      boundUserId: input.boundUserId,
      bindingHash: hashValue(input.binding),
      provider: otpProvider.family,
      generation: Number(latest?.generation ?? 0) + 1,
      providerRequestRef: input.suppressDelivery ? protectProviderRef(randomToken()) : null,
      status: input.suppressDelivery ? 'sent' : 'sending',
      safeErrorCategory: input.suppressDelivery ? 'ineligible' : null,
      ipHash,
      deviceHash,
      expiresAt,
      resendAvailableAt,
    }).returning();
    if (!created) throw new AppError('Could not create OTP challenge.', 500);
    return created;
  });

  if (input.suppressDelivery) return challenge;

  try {
    const sent = await otpProvider.send(toMsg91Identifier(input.canonicalPhone));
    const [updated] = await db.update(otpChallenges).set({ providerRequestRef: protectProviderRef(sent.requestRef), status: 'sent', updatedAt: new Date() })
      .where(and(eq(otpChallenges.id, challenge.id), eq(otpChallenges.status, 'sending'))).returning();
    if (!updated) fail('This OTP request was superseded. Request a new code.', 409, 'superseded');
    return updated!;
  } catch (error) {
    await db.update(otpChallenges).set({ status: 'failed', safeErrorCategory: error instanceof OtpProviderError ? error.code : 'unavailable', updatedAt: new Date() })
      .where(eq(otpChallenges.id, challenge.id));
    throw new AppError('We could not confirm OTP delivery. Please request a new code.', 503, { code: 'provider_unavailable' });
  }
};

const acquireForVerification = async (challengeId: string, purpose: ChallengePurpose, binding: string) => db.transaction(async (tx) => {
  const [challenge] = await tx.select().from(otpChallenges).where(eq(otpChallenges.id, challengeId)).for('update').limit(1);
  if (!challenge || challenge.purpose !== purpose || challenge.bindingHash !== hashValue(binding)) fail('OTP session is invalid or expired.', 401, 'session_expired');
  if (challenge.status === 'consumed' || challenge.status === 'verified') fail('This OTP proof has already been used.', 409, 'already_used');
  if (challenge.status === 'superseded') fail('A newer OTP request replaced this one.', 409, 'superseded');
  if (challenge.expiresAt <= new Date()) {
    await tx.update(otpChallenges).set({ status: 'expired', updatedAt: new Date() }).where(eq(otpChallenges.id, challenge.id));
    fail('OTP has expired. Request a new code.', 410, 'expired');
  }
  if (challenge.status !== 'sent' || !challenge.providerRequestRef) fail('OTP session is not ready for verification.', 409, 'invalid_state');
  if (challenge.attemptCount >= env.OTP_MAX_ATTEMPTS) fail('Too many incorrect attempts. Request a new code.', 429, 'too_many_attempts');

  const recentAttempts = await tx.select({ value: sql<number>`coalesce(sum(${otpChallenges.attemptCount}), 0)` })
    .from(otpChallenges).where(and(eq(otpChallenges.canonicalPhone, challenge.canonicalPhone), gte(otpChallenges.createdAt, new Date(Date.now() - 15 * 60_000))));
  if (Number(recentAttempts[0]?.value ?? 0) >= env.OTP_MAX_ATTEMPTS * 2) fail('Too many verification attempts. Try again later.', 429, 'rate_limited');

  const nextAttempts = challenge.attemptCount + 1;
  await tx.update(otpChallenges).set({ attemptCount: nextAttempts, status: 'verifying', processingLeaseUntil: nowPlus(30), updatedAt: new Date() })
    .where(eq(otpChallenges.id, challenge.id));
  return { ...challenge, attemptCount: nextAttempts };
});

const markVerificationFailure = async (challenge: OtpChallenge & { attemptCount: number }, error: unknown): Promise<never> => {
  const category = error instanceof OtpProviderError ? error.code : 'unavailable';
  const terminal = challenge.attemptCount >= env.OTP_MAX_ATTEMPTS || category === 'already_used';
  await db.update(otpChallenges).set({
    status: terminal ? 'failed' : 'sent',
    processingLeaseUntil: null,
    safeErrorCategory: category,
    updatedAt: new Date(),
  }).where(and(eq(otpChallenges.id, challenge.id), eq(otpChallenges.status, 'verifying')));
  if (category === 'incorrect_code') fail(terminal ? 'Too many incorrect attempts. Request a new code.' : 'Incorrect OTP.', terminal ? 429 : 400, terminal ? 'too_many_attempts' : 'incorrect_code');
  if (category === 'expired' || category === 'already_used') fail('OTP is expired or already used. Request a new code.', 410, category);
  throw new AppError('OTP verification is temporarily unavailable.', 503, { code: 'provider_unavailable' });
};

const createSessionInTransaction = async (tx: any, userId: string) => {
  const material = newSessionMaterial();
  const [session] = await tx.insert(authSessions).values({ userId, tokenHash: hashValue(material.refreshToken), expiresAt: material.expiresAt }).returning();
  return { ...material, sessionId: session.id as string };
};

const verifyProvider = async (input: OtpVerifyInput, purpose: ChallengePurpose, binding: string) => {
  const challenge = await acquireForVerification(input.challengeId, purpose, binding);
  try {
    if (challenge.safeErrorCategory === 'ineligible') throw new OtpProviderError('incorrect_code', 'Incorrect OTP.');
    const proof = await otpProvider.verify(revealProviderRef(challenge.providerRequestRef!), input.code);
    const verifiedPhone = normalizeProviderIdentifier(proof.verifiedIdentifier);
    if (verifiedPhone !== challenge.canonicalPhone) throw new OtpProviderError('invalid_response', 'Provider proof did not match the challenge identifier.');
    return challenge;
  } catch (error) {
    return markVerificationFailure(challenge, error);
  }
};

const finalizePublicVerification = async (challenge: OtpChallenge, audience: PublicAudience) => {
  const continuationToken = randomToken();
  const material = newSessionMaterial();
  const result = await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(otpChallenges).where(eq(otpChallenges.id, challenge.id)).for('update').limit(1);
    if (!locked || locked.status !== 'verifying' || locked.expiresAt <= new Date()) fail('OTP session could not be finalized. Request a new code.', 409, 'invalid_state');
    const [user] = await tx.select().from(users).where(eq(users.authPhoneE164, locked.canonicalPhone)).limit(1);

    if (!user) {
      if (audience === 'admin') {
        await tx.update(otpChallenges).set({ status: 'consumed', consumedAt: new Date(), updatedAt: new Date() }).where(eq(otpChallenges.id, locked.id));
        throw new UnauthorizedError('This mobile number is not eligible for administrator access.');
      }
      await tx.update(otpChallenges).set({ status: 'verified', verifiedAt: new Date(), continuationHash: hashValue(continuationToken), processingLeaseUntil: null, updatedAt: new Date() })
        .where(eq(otpChallenges.id, locked.id));
      return { onboardingRequired: true as const, onboardingToken: continuationToken, maskedDestination: maskPhone(locked.canonicalPhone) };
    }

    if (user.isBlocked || !user.isVerified || !user.phoneVerifiedAt) {
      await tx.update(otpChallenges).set({ status: 'consumed', consumedAt: new Date(), updatedAt: new Date() }).where(eq(otpChallenges.id, locked.id));
      throw new ForbiddenError('This account is not eligible to sign in.');
    }
    if ((audience === 'admin') !== isPrivileged(user)) {
      await tx.update(otpChallenges).set({ status: 'consumed', consumedAt: new Date(), updatedAt: new Date() }).where(eq(otpChallenges.id, locked.id));
      throw new ForbiddenError(audience === 'customer' ? 'Use the administrator sign-in page for this account.' : 'This account is not eligible for administrator access.');
    }

    const [session] = await tx.insert(authSessions).values({ userId: user.id, tokenHash: hashValue(material.refreshToken), expiresAt: material.expiresAt }).returning();
    await tx.update(otpChallenges).set({ status: 'consumed', consumedAt: new Date(), processingLeaseUntil: null, updatedAt: new Date() }).where(eq(otpChallenges.id, locked.id));
    return { onboardingRequired: false as const, ...sessionResult(user, session.id, material.refreshToken) };
  });
  return result;
};

export const authService = {
  async requestOtp(phone: string, audience: PublicAudience, binding: string, context: RequestContext) {
    const canonicalPhone = normalizeAuthPhone(phone);
    const user = await authRepository.findByAuthPhone(canonicalPhone);
    const suppressDelivery = audience === 'admin' && (!user || !isPrivileged(user) || user.isBlocked || !user.phoneVerifiedAt);
    const challenge = await createChallenge({ canonicalPhone, purpose: audience === 'admin' ? 'admin_login' : 'customer_login', binding, context, suppressDelivery });
    // Keep account eligibility opaque before proof. Unknown admin requests receive the same shape.
    return challengeResponse(challenge);
  },

  async resendOtp(challengeId: string, audience: PublicAudience, binding: string, context: RequestContext) {
    const purpose = audience === 'admin' ? 'admin_login' : 'customer_login';
    const challenge = await db.transaction(async (tx) => {
      const [row] = await tx.select().from(otpChallenges).where(eq(otpChallenges.id, challengeId)).for('update').limit(1);
      if (!row || row.purpose !== purpose || row.bindingHash !== hashValue(binding) || row.status !== 'sent' || !row.providerRequestRef) fail('OTP session is invalid or expired.', 401, 'session_expired');
      if (row.expiresAt <= new Date()) fail('OTP has expired. Request a new code.', 410, 'expired');
      if (row.resendCount >= env.OTP_MAX_RESENDS) fail('Maximum resend limit reached. Request a new code later.', 429, 'too_many_resends');
      if (row.resendAvailableAt > new Date()) fail('Please wait before requesting another OTP.', 429, 'cooldown', row.resendAvailableAt);
      await assertSendBudget(tx, row.canonicalPhone, context);
      const resendAvailableAt = nowPlus(env.OTP_RESEND_COOLDOWN_SECONDS);
      const [updated] = await tx.update(otpChallenges).set({ resendCount: row.resendCount + 1, resendAvailableAt, updatedAt: new Date() })
        .where(eq(otpChallenges.id, row.id)).returning();
      return updated;
    });
    try {
      if (challenge.safeErrorCategory !== 'ineligible') await otpProvider.retry(revealProviderRef(challenge.providerRequestRef!));
    }
    catch { fail('OTP resend could not be confirmed. Please wait and request a new code.', 503, 'provider_unavailable'); }
    return challengeResponse(challenge);
  },

  async cancelOtp(challengeId: string, audience: PublicAudience, binding: string) {
    const purpose = audience === 'admin' ? 'admin_login' : 'customer_login';
    await db.update(otpChallenges).set({ status: 'superseded', updatedAt: new Date() }).where(and(
      eq(otpChallenges.id, challengeId),
      eq(otpChallenges.purpose, purpose),
      eq(otpChallenges.bindingHash, hashValue(binding)),
      inArray(otpChallenges.status, ['sending', 'sent', 'verifying'])
    ));
  },

  async verifyOtp(input: OtpVerifyInput, audience: PublicAudience, binding: string) {
    const purpose = audience === 'admin' ? 'admin_login' : 'customer_login';
    const challenge = await verifyProvider(input, purpose, binding);
    return finalizePublicVerification(challenge, audience);
  },

  async completeOnboarding(input: OnboardingInput) {
    const tokenHash = hashValue(input.onboardingToken);
    const normalizedEmail = input.email ? input.email.toLowerCase() : null;
    const material = newSessionMaterial();
    const result = await db.transaction(async (tx) => {
      const [challenge] = await tx.select().from(otpChallenges)
        .where(and(eq(otpChallenges.continuationHash, tokenHash), eq(otpChallenges.purpose, 'customer_login'))).for('update').limit(1);
      if (!challenge || challenge.status !== 'verified' || challenge.expiresAt <= new Date()) fail('Onboarding session is invalid or expired.', 401, 'session_expired');
      const [claimed] = await tx.select({ id: users.id }).from(users).where(eq(users.authPhoneE164, challenge.canonicalPhone)).limit(1);
      if (claimed) throw new ConflictError('This mobile number is already linked to an account. Sign in again.');
      if (normalizedEmail) {
        const [emailOwner] = await tx.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
        if (emailOwner) throw new ConflictError('That contact email is already in use. Use another email or leave it blank.');
      }
      const now = new Date();
      const [user] = await tx.insert(users).values({
        name: input.name,
        email: normalizedEmail,
        passwordHash: null,
        phone: challenge.canonicalPhone,
        authPhoneE164: challenge.canonicalPhone,
        phoneVerifiedAt: now,
        onboardingCompletedAt: now,
        isVerified: true,
        role: 'customer',
      }).returning();
      const [session] = await tx.insert(authSessions).values({ userId: user.id, tokenHash: hashValue(material.refreshToken), expiresAt: material.expiresAt }).returning();
      await tx.update(otpChallenges).set({ status: 'consumed', continuationHash: null, consumedAt: now, updatedAt: now }).where(eq(otpChallenges.id, challenge.id));
      await tx.insert(authIdentityAuditEvents).values({ userId: user.id, action: 'customer_identity_created', nextPhoneHash: hashValue(challenge.canonicalPhone), actor: 'self_service_otp' });
      await createAdminNotification(tx, {
        eventKey: `customer.registered:${user.id}`, type: 'customer_registered', severity: 'info',
        title: 'New customer registered', message: `${user.name} created a customer account.`,
        entityType: 'customer', entityId: user.id, destination: `/admin/customers/${user.id}`,
      });
      if (normalizedEmail) {
        await tx.insert(marketingPreferences).values({
          userId: user.id,
          email: normalizedEmail,
          optedIn: input.marketingConsent,
          provenance: 'otp_onboarding_explicit_choice',
          consentedAt: input.marketingConsent ? now : null,
          withdrawnAt: input.marketingConsent ? null : now,
        }).onConflictDoNothing();
      }
      await tx.insert(mobileMarketingPreferences).values({
        userId: user.id,
        phone: challenge.canonicalPhone,
        whatsappOptedIn: input.whatsappConsent,
        provenance: 'otp_onboarding_explicit_choice',
        consentedAt: input.whatsappConsent ? now : null,
        withdrawnAt: input.whatsappConsent ? null : now,
      }).onConflictDoNothing();
      return { user, sessionId: session.id };
    });
    if (result.user.email) {
      void emailMasterService.enqueueAndAttempt('welcome', result.user.email, { customerName: result.user.name }, `welcome:${result.user.id}`, { priority: 20 })
        .catch((error) => logger.error('Welcome email remains queued for retry.', { userId: result.user.id, error }));
    }
    void messageService.enqueueWelcome(result.user, input.whatsappConsent)
      .catch((error) => logger.error('Welcome mobile messages remain queued for retry.', { userId: result.user.id, error }));
    return sessionResult(result.user, result.sessionId, material.refreshToken);
  },

  async requestPhoneChange(userId: string, sessionId: string, stage: 'current' | 'new', phone: string | undefined, context: RequestContext) {
    const user = await authRepository.findById(userId);
    if (!user || !user.authPhoneE164 || !user.phoneVerifiedAt) throw new UnauthorizedError('A verified login phone is required.');
    const canonicalPhone = stage === 'current' ? user.authPhoneE164 : normalizeAuthPhone(phone ?? '');
    if (stage === 'new') {
      if (canonicalPhone === user.authPhoneE164) throw new ConflictError('The new phone must be different.');
      if (await authRepository.findByAuthPhone(canonicalPhone)) throw new ConflictError('That mobile number is already linked to an account.');
    }
    const challenge = await createChallenge({
      canonicalPhone,
      purpose: stage === 'current' ? 'phone_change_current' : 'phone_change_new',
      binding: `session:${sessionId}`,
      context,
      boundUserId: userId,
    });
    return challengeResponse(challenge);
  },

  async verifyPhoneChange(userId: string, sessionId: string, input: OtpVerifyInput, stage: 'current' | 'new') {
    const purpose = stage === 'current' ? 'phone_change_current' : 'phone_change_new';
    const challenge = await verifyProvider(input, purpose, `session:${sessionId}`);
    if (challenge.boundUserId !== userId) throw new ForbiddenError('Phone-change proof belongs to another session.');
    const proof = randomToken();
    await db.update(otpChallenges).set({ status: 'verified', verifiedAt: new Date(), continuationHash: hashValue(proof), processingLeaseUntil: null, updatedAt: new Date() })
      .where(and(eq(otpChallenges.id, challenge.id), eq(otpChallenges.status, 'verifying')));
    return { proof, stage, expiresAt: challenge.expiresAt.toISOString() };
  },

  async completePhoneChange(userId: string, sessionId: string, input: PhoneChangeCompleteInput) {
    const material = newSessionMaterial();
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`phone-change:${userId}`}))`);
      const proofs = await tx.select().from(otpChallenges).where(and(
        eq(otpChallenges.boundUserId, userId),
        eq(otpChallenges.status, 'verified'),
        gt(otpChallenges.expiresAt, new Date()),
        or(eq(otpChallenges.continuationHash, hashValue(input.currentProof)), eq(otpChallenges.continuationHash, hashValue(input.newProof)))
      )).for('update');
      const expectedBinding = hashValue(`session:${sessionId}`);
      const current = proofs.find((proof) => proof.purpose === 'phone_change_current' && proof.continuationHash === hashValue(input.currentProof) && proof.bindingHash === expectedBinding);
      const next = proofs.find((proof) => proof.purpose === 'phone_change_new' && proof.continuationHash === hashValue(input.newProof) && proof.bindingHash === expectedBinding);
      if (!current || !next) throw new UnauthorizedError('Both current and new phone proofs are required.');
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).for('update').limit(1);
      if (!user || user.authPhoneE164 !== current.canonicalPhone) throw new ConflictError('The current login phone changed. Start again.');
      const [owner] = await tx.select({ id: users.id }).from(users).where(eq(users.authPhoneE164, next.canonicalPhone)).limit(1);
      if (owner && owner.id !== userId) throw new ConflictError('That mobile number is already linked to an account.');
      const now = new Date();
      const [updated] = await tx.update(users).set({ authPhoneE164: next.canonicalPhone, phoneVerifiedAt: now, updatedAt: now })
        .where(eq(users.id, userId)).returning();
      await tx.update(mobileMarketingPreferences).set({
        phone: next.canonicalPhone,
        whatsappOptedIn: false,
        provenance: 'phone_change_requires_fresh_consent',
        consentedAt: null,
        withdrawnAt: now,
        updatedAt: now,
      }).where(eq(mobileMarketingPreferences.userId, userId));
      await tx.insert(whatsappMarketingSuppressions).values({
        phone: current.canonicalPhone,
        reason: 'login_phone_changed',
        source: 'authenticated_phone_change',
      }).onConflictDoNothing({ target: whatsappMarketingSuppressions.phone });
      await tx.update(otpChallenges).set({ status: 'consumed', continuationHash: null, consumedAt: now, updatedAt: now }).where(inArray(otpChallenges.id, [current.id, next.id]));
      await tx.update(authSessions).set({ revokedAt: now }).where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
      const [session] = await tx.insert(authSessions).values({ userId, tokenHash: hashValue(material.refreshToken), expiresAt: material.expiresAt }).returning();
      await tx.insert(authIdentityAuditEvents).values({ userId, action: 'auth_phone_changed', previousPhoneHash: hashValue(current.canonicalPhone), nextPhoneHash: hashValue(next.canonicalPhone), actor: `session:${sessionId}` });
      return { user: updated, sessionId: session.id };
    });
    return sessionResult(result.user, result.sessionId, material.refreshToken);
  },

  async getMe(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found.');
    if (user.isBlocked) throw new ForbiddenError('This account has been blocked.');
    return sanitizeUser(user);
  },

  async refresh(refreshToken: string) {
    const nextRefreshToken = randomToken();
    const refreshExpiresAt = nowPlus(env.REFRESH_TOKEN_DAYS * 24 * 60 * 60);
    const rotated = await authRepository.rotateSession(hashValue(refreshToken), hashValue(nextRefreshToken), refreshExpiresAt);
    if (!rotated) throw new UnauthorizedError('Refresh session is invalid or expired.');
    return sessionResult(rotated.user, rotated.sessionId, nextRefreshToken);
  },

  async logout(refreshToken?: string, accessToken?: string) {
    let sessionId: string | undefined;
    if (accessToken) {
      try { sessionId = (jwt.verify(accessToken, env.JWT_SECRET) as { sid?: string }).sid; } catch { /* expired access token */ }
    }
    await authRepository.revokeSessionFamily({ tokenHash: refreshToken ? hashValue(refreshToken) : undefined, sessionId });
  },
};
