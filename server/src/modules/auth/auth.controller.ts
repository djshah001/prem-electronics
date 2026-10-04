import { Request, Response } from 'express';
import { authService } from './auth.service.js';
import {
  registerSchema,
  loginSchema,
  verifyOTPSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema.js';
import { sendSuccess, sendCreated } from '../../core/utils/responseHandler.js';
import { env } from '../../config/env.js';

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 15 * 60 * 1000,
  path: '/',
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const setSessionCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  res.setHeader('Cache-Control', 'no-store');
};

export const authController = {
  async register(req: Request, res: Response) {
    const input = registerSchema.parse(req.body);
    const user = await authService.register(input);
    sendCreated(res, user, 'Account created! Please check your email for the OTP verification code.');
  },

  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await authService.login(input);
    setSessionCookies(res, accessToken, refreshToken);
    sendSuccess(res, { user }, 'Logged in successfully.');
  },

  async verifyOTP(req: Request, res: Response) {
    const input = verifyOTPSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await authService.verifyOTP(input);
    setSessionCookies(res, accessToken, refreshToken);
    sendSuccess(res, { user }, 'Email verified successfully! Welcome to Prem Electronics.');
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

  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'No refresh session provided.' });
    const session = await authService.refresh(refreshToken);
    setSessionCookies(res, session.accessToken, session.refreshToken);
    sendSuccess(res, { user: session.user }, 'Session refreshed.');
  },

  async logout(req: Request, res: Response) {
    await authService.logout(
      req.cookies?.refreshToken as string | undefined,
      req.cookies?.accessToken as string | undefined
    );
    res.clearCookie('accessToken', CLEAR_COOKIE_OPTIONS);
    res.clearCookie('refreshToken', { ...CLEAR_COOKIE_OPTIONS, path: '/api/v1/auth' });
    sendSuccess(res, null, 'Logged out successfully.');
  },
};
