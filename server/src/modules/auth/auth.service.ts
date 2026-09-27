import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';
import { authRepository } from './auth.repository';
import { sendOTPEmail, sendPasswordResetEmail } from '../../infrastructure/mail/mailer';
import {
  AppError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} from '../../core/errors/appError';
import type {
  RegisterInput,
  LoginInput,
  VerifyOTPInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schema';
import type { User } from '../../infrastructure/database/schema/index';

const SALT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 10;
const RESET_TOKEN_EXPIRY_HOURS = 1;

const generateOTP = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

const generateJWT = (user: User): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );
};

const sanitizeUser = (user: User) => {
  const { passwordHash, otpToken, otpExpiry, resetToken, resetTokenExpiry, ...safe } = user;
  return safe;
};

export const authService = {
  async register(input: RegisterInput) {
    const existing = await authRepository.findByEmail(input.email);
    if (existing) throw new ConflictError('An account with this email already exists.');

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const user = await authRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      otpToken: otp,
      otpExpiry,
    });

    await sendOTPEmail(user.email, user.name, otp);

    return sanitizeUser(user);
  },

  async login(input: LoginInput) {
    const user = await authRepository.findByEmail(input.email);
    if (!user) throw new UnauthorizedError('Invalid email or password.');

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedError('Invalid email or password.');

    if (!user.isVerified) {
      // Resend OTP
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
      await authRepository.updateOTP(user.id, otp, otpExpiry);
      await sendOTPEmail(user.email, user.name, otp);
      throw new AppError(
        'Email not verified. A new OTP has been sent to your email.',
        403
      );
    }

    const token = generateJWT(user);
    return { token, user: sanitizeUser(user) };
  },

  async verifyOTP(input: VerifyOTPInput) {
    const user = await authRepository.findByEmail(input.email);
    if (!user) throw new NotFoundError('User not found.');
    if (user.isVerified) throw new AppError('Account is already verified.', 400);

    if (!user.otpToken || user.otpToken !== input.otp) {
      throw new AppError('Invalid OTP.', 400);
    }

    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      throw new AppError('OTP has expired. Please request a new one.', 400);
    }

    await authRepository.verifyUser(user.id);
    const token = generateJWT({ ...user, isVerified: true });
    return { token, user: sanitizeUser({ ...user, isVerified: true }) };
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
    await sendPasswordResetEmail(user.email, user.name, resetLink);
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
  },

  async getMe(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found.');
    return sanitizeUser(user);
  },

  async resendOTP(email: string) {
    const user = await authRepository.findByEmail(email);
    if (!user) throw new NotFoundError('User not found.');
    if (user.isVerified) throw new AppError('Account is already verified.', 400);

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await authRepository.updateOTP(user.id, otp, otpExpiry);
    await sendOTPEmail(user.email, user.name, otp);
  },
};
