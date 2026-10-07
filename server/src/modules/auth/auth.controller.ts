import { Request, Response } from 'express';
import { authService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  verifyOTPSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema';
import { sendSuccess, sendCreated } from '../../core/utils/responseHandler';
import { env } from '../../config/env';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

export const authController = {
  async register(req: Request, res: Response) {
    const input = registerSchema.parse(req.body);
    const user = await authService.register(input);
    sendCreated(res, user, 'Account created! Please check your email for the OTP verification code.');
  },

  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const { token, user } = await authService.login(input);
    res.cookie('accessToken', token, COOKIE_OPTIONS);
    sendSuccess(res, { user, token }, 'Logged in successfully.');
  },

  async verifyOTP(req: Request, res: Response) {
    const input = verifyOTPSchema.parse(req.body);
    const { token, user } = await authService.verifyOTP(input);
    res.cookie('accessToken', token, COOKIE_OPTIONS);
    sendSuccess(res, { user, token }, 'Email verified successfully! Welcome to Prem Electronics.');
  },

  async resendOTP(req: Request, res: Response) {
    const { email } = req.body as { email: string };
    await authService.resendOTP(email);
    sendSuccess(res, null, 'A new OTP has been sent to your email.');
  },

  async forgotPassword(req: Request, res: Response) {
    const input = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(input);
    sendSuccess(res, null, 'If an account with that email exists, a password reset link has been sent.');
  },

  async resetPassword(req: Request, res: Response) {
    const input = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(input);
    sendSuccess(res, null, 'Password reset successfully. Please log in with your new password.');
  },

  async getMe(req: Request, res: Response) {
    const user = await authService.getMe(req.user!.id);
    sendSuccess(res, user);
  },

  async logout(_req: Request, res: Response) {
    res.clearCookie('accessToken', CLEAR_COOKIE_OPTIONS);
    sendSuccess(res, null, 'Logged out successfully.');
  },
};
