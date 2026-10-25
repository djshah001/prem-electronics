import crypto from 'crypto';
import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { sendCreated, sendSuccess } from '../../core/utils/responseHandler.js';
import { authService } from './auth.service.js';
import {
  onboardingSchema,
  otpChallengeSchema,
  otpRequestSchema,
  otpVerifySchema,
  phoneChangeCompleteSchema,
  phoneChangeRequestSchema,
} from './auth.schema.js';

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

const FLOW_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: Math.max(env.OTP_LIFETIME_SECONDS, 600) * 1000,
  path: '/api/v1/auth',
};

const CLEAR_COOKIE_OPTIONS = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };

const setSessionCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  res.setHeader('Cache-Control', 'no-store');
};

const context = (req: Request) => ({ ip: req.ip || req.socket.remoteAddress || 'unknown', userAgent: req.get('user-agent') ?? 'unknown' });
const newFlowBinding = () => crypto.randomBytes(32).toString('base64url');
const requireFlowBinding = (req: Request): string => {
  const value = req.cookies?.otpFlow as string | undefined;
  if (!value) throw Object.assign(new Error('OTP browser session expired. Request a new code.'), { statusCode: 401, isOperational: true, details: { code: 'session_expired' } });
  return value;
};

const requestOtp = (audience: 'customer' | 'admin') => async (req: Request, res: Response) => {
  const { phone } = otpRequestSchema.parse(req.body);
  const binding = newFlowBinding();
  const result = await authService.requestOtp(phone, audience, binding, context(req));
  res.cookie('otpFlow', binding, FLOW_COOKIE_OPTIONS);
  sendCreated(res, result, 'If the number is eligible, an OTP has been sent.');
};

const resendOtp = (audience: 'customer' | 'admin') => async (req: Request, res: Response) => {
  const { challengeId } = otpChallengeSchema.parse(req.body);
  const result = await authService.resendOtp(challengeId, audience, requireFlowBinding(req), context(req));
  sendSuccess(res, result, 'OTP resend requested.');
};

const verifyOtp = (audience: 'customer' | 'admin') => async (req: Request, res: Response) => {
  const input = otpVerifySchema.parse(req.body);
  const result = await authService.verifyOtp(input, audience, requireFlowBinding(req));
  if (!result.onboardingRequired) setSessionCookies(res, result.accessToken, result.refreshToken);
  res.clearCookie('otpFlow', { ...CLEAR_COOKIE_OPTIONS, sameSite: 'strict', path: '/api/v1/auth' });
  const safe = result.onboardingRequired
    ? result
    : { user: result.user, onboardingRequired: false as const };
  sendSuccess(res, safe, result.onboardingRequired ? 'Mobile verified. Complete your profile.' : 'Signed in successfully.');
};

const cancelOtp = (audience: 'customer' | 'admin') => async (req: Request, res: Response) => {
  const { challengeId } = otpChallengeSchema.parse(req.body);
  await authService.cancelOtp(challengeId, audience, requireFlowBinding(req));
  sendSuccess(res, null, 'OTP session cancelled.');
};

export const authController = {
  requestCustomerOtp: requestOtp('customer'),
  resendCustomerOtp: resendOtp('customer'),
  verifyCustomerOtp: verifyOtp('customer'),
  cancelCustomerOtp: cancelOtp('customer'),
  requestAdminOtp: requestOtp('admin'),
  resendAdminOtp: resendOtp('admin'),
  verifyAdminOtp: verifyOtp('admin'),
  cancelAdminOtp: cancelOtp('admin'),

  async onboarding(req: Request, res: Response) {
    const result = await authService.completeOnboarding(onboardingSchema.parse(req.body));
    setSessionCookies(res, result.accessToken, result.refreshToken);
    sendCreated(res, { user: result.user, onboardingRequired: false }, 'Account created successfully.');
  },

  async phoneChangeRequest(req: Request, res: Response) {
    const input = phoneChangeRequestSchema.parse(req.body);
    const result = await authService.requestPhoneChange(req.user!.id, req.user!.sid, input.stage, input.stage === 'new' ? input.phone : undefined, context(req));
    sendCreated(res, result, 'OTP sent for phone verification.');
  },

  async phoneChangeVerify(req: Request, res: Response) {
    const stage = req.body?.stage === 'current' ? 'current' : 'new';
    const input = otpVerifySchema.parse(req.body);
    const result = await authService.verifyPhoneChange(req.user!.id, req.user!.sid, input, stage);
    sendSuccess(res, result, 'Phone ownership verified.');
  },

  async phoneChangeComplete(req: Request, res: Response) {
    const result = await authService.completePhoneChange(req.user!.id, req.user!.sid, phoneChangeCompleteSchema.parse(req.body));
    setSessionCookies(res, result.accessToken, result.refreshToken);
    sendSuccess(res, { user: result.user }, 'Login phone changed. Other sessions were signed out.');
  },

  async getMe(req: Request, res: Response) {
    sendSuccess(res, await authService.getMe(req.user!.id));
  },

  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'No refresh session provided.' });
    const session = await authService.refresh(refreshToken);
    setSessionCookies(res, session.accessToken, session.refreshToken);
    sendSuccess(res, { user: session.user }, 'Session refreshed.');
  },

  async logout(req: Request, res: Response) {
    await authService.logout(req.cookies?.refreshToken as string | undefined, req.cookies?.accessToken as string | undefined);
    res.clearCookie('accessToken', CLEAR_COOKIE_OPTIONS);
    res.clearCookie('refreshToken', { ...CLEAR_COOKIE_OPTIONS, path: '/api/v1/auth' });
    res.clearCookie('otpFlow', { ...CLEAR_COOKIE_OPTIONS, sameSite: 'strict', path: '/api/v1/auth' });
    sendSuccess(res, null, 'Logged out successfully.');
  },
};
