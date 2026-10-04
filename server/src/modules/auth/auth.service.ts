import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import logger from '../../core/logger/logger.js';
import { authRepository } from './auth.repository.js';
import { sendOTPEmail, sendPasswordResetEmail } from '../../infrastructure/mail/mailer.js';
import {
  AppError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} from '../../core/errors/appError.js';
import type {
  RegisterInput,
  LoginInput,
  VerifyOTPInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schema.js';
import type { User } from '../../infrastructure/database/schema/index.js';

const SALT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 10;
const RESET_TOKEN_EXPIRY_HOURS = 1;

const generateOTP = (): string =>
  crypto.randomInt(100000, 1000000).toString();

const hashToken = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

const generateAccessToken = (user: User, sessionId: string): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, sid: sessionId },
    env.JWT_SECRET,
    { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN } as jwt.SignOptions
  );
};

const createSession = async (user: User) => {
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  const session = await authRepository.createSession(user.id, hashToken(refreshToken), refreshExpiresAt);
  return { accessToken: generateAccessToken(user, session.id), refreshToken, refreshExpiresAt };
};

const logDevelopmentSecret = (message: string) => {
  if (env.NODE_ENV === 'development') logger.info(message);
};

const sanitizeUser = (user: User) => {
  const { passwordHash, otpToken, otpExpiry, resetToken, resetTokenExpiry, ...safe } = user;
  return safe;
};

export const authService = {
  async register(input: RegisterInput) {
    const existing = await authRepository.findByEmail(input.email);
    if (existing) {
      if (existing.isVerified) {
        throw new ConflictError('An account with this email already exists.');
      }
      // If user exists but is unverified (previous registration had email error), update and resend
      const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      const updated = await authRepository.updateUser(existing.id, {
        name: input.name,
        passwordHash,
        otpToken: hashToken(otp),
        otpExpiry,
      });

      try {
        await sendOTPEmail(updated.email, updated.name, otp);
      } catch (err: any) {
        logger.error(`Failed to send OTP email to ${updated.email}: ${err?.message || err}`);
        logDevelopmentSecret(`[DEV OTP]: Verification code for ${updated.email} is ${otp}`);
      }

      return sanitizeUser(updated);
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const user = await authRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      otpToken: hashToken(otp),
      otpExpiry,
    });

    try {
      await sendOTPEmail(user.email, user.name, otp);
    } catch (err: any) {
      logger.error(`Failed to send OTP email to ${user.email}: ${err?.message || err}`);
      logDevelopmentSecret(`[DEV OTP]: Verification code for ${user.email} is ${otp}`);
    }

    return sanitizeUser(user);
  },

  async login(input: LoginInput) {
    const user = await authRepository.findByEmail(input.email);
    if (!user) throw new UnauthorizedError('Invalid email or password.');
    if (user.isBlocked) throw new AppError('This account has been blocked.', 403);

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedError('Invalid email or password.');

    if (!user.isVerified) {
      // Resend OTP
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
      await authRepository.updateOTP(user.id, hashToken(otp), otpExpiry);
      try {
        await sendOTPEmail(user.email, user.name, otp);
      } catch (err: any) {
        logger.error(`Failed to send OTP email to ${user.email}: ${err?.message || err}`);
        logDevelopmentSecret(`[DEV OTP]: Verification code for ${user.email} is ${otp}`);
      }
      throw new AppError(
        'Email not verified. A new OTP has been sent to your email.',
        403
      );
    }

    const session = await createSession(user);
    return { ...session, user: sanitizeUser(user) };
  },

  async verifyOTP(input: VerifyOTPInput) {
    const user = await authRepository.findByEmail(input.email);
    if (!user) throw new NotFoundError('User not found.');
    if (user.isVerified) throw new AppError('Account is already verified.', 400);

    if (!user.otpToken || user.otpToken !== hashToken(input.otp)) {
      throw new AppError('Invalid OTP.', 400);
    }

    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      throw new AppError('OTP has expired. Please request a new one.', 400);
    }

    await authRepository.verifyUser(user.id);
    const verifiedUser = { ...user, isVerified: true };
    const session = await createSession(verifiedUser);
    return { ...session, user: sanitizeUser(verifiedUser) };
  },

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await authRepository.findByEmail(input.email);
    // Always return success even if user doesn't exist (security)
    if (!user) return;

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await authRepository.setResetToken(user.id, hashedToken, expiry);

    const resetLink = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
    try {
      await sendPasswordResetEmail(user.email, user.name, resetLink);
    } catch (err: any) {
      logger.error(`Failed to send password reset email to ${user.email}: ${err?.message || err}`);
      logDevelopmentSecret(`[DEV RESET LINK]: Reset link for ${user.email} is ${resetLink}`);
    }
  },

  async resetPassword(input: ResetPasswordInput) {
    const hashedToken = crypto.createHash('sha256').update(input.token).digest('hex');
    const user = await authRepository.findByResetToken(hashedToken);

    if (!user) throw new AppError('Invalid or expired password reset token.', 400);
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new AppError('Password reset token has expired.', 400);
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    await authRepository.updatePassword(user.id, passwordHash);
    await authRepository.revokeAllSessions(user.id);
  },

  async getMe(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found.');
    if (user.isBlocked) throw new AppError('This account has been blocked.', 403);
    return sanitizeUser(user);
  },

  async resendOTP(email: string) {
    const user = await authRepository.findByEmail(email);
    if (!user) throw new NotFoundError('User not found.');
    if (user.isVerified) throw new AppError('Account is already verified.', 400);

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await authRepository.updateOTP(user.id, hashToken(otp), otpExpiry);
    try {
      await sendOTPEmail(user.email, user.name, otp);
    } catch (err: any) {
      logger.error(`Failed to send OTP email to ${user.email}: ${err?.message || err}`);
      logDevelopmentSecret(`[DEV OTP]: Verification code for ${user.email} is ${otp}`);
    }
  },

  async refresh(refreshToken: string) {
    const nextRefreshToken = crypto.randomBytes(48).toString('hex');
    const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    const rotated = await authRepository.rotateSession(
      hashToken(refreshToken),
      hashToken(nextRefreshToken),
      refreshExpiresAt
    );
    if (!rotated) throw new UnauthorizedError('Refresh session is invalid or expired.');
    return {
      accessToken: generateAccessToken(rotated.user, rotated.sessionId),
      refreshToken: nextRefreshToken,
      refreshExpiresAt,
      user: sanitizeUser(rotated.user),
    };
  },

  async logout(refreshToken?: string, accessToken?: string) {
    let sessionId: string | undefined;
    if (accessToken) {
      try {
        sessionId = (jwt.verify(accessToken, env.JWT_SECRET) as { sid?: string }).sid;
      } catch {
        // An expired access token may accompany a valid refresh cookie.
      }
    }
    await authRepository.revokeSessionFamily({
      tokenHash: refreshToken ? hashToken(refreshToken) : undefined,
      sessionId,
    });
  },
};
