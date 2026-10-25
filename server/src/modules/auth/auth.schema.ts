import { z } from 'zod';

export const otpRequestSchema = z.object({
  phone: z.string().trim().min(8).max(30),
});

export const otpChallengeSchema = z.object({
  challengeId: z.string().uuid(),
});

export const otpVerifySchema = otpChallengeSchema.extend({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit OTP.'),
});

export const onboardingSchema = z.object({
  onboardingToken: z.string().min(32).max(256),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255).optional().or(z.literal('')),
  marketingConsent: z.boolean().default(false),
  whatsappConsent: z.boolean().default(false),
});

export const phoneChangeRequestSchema = z.discriminatedUnion('stage', [
  z.object({ stage: z.literal('current') }),
  z.object({ stage: z.literal('new'), phone: z.string().trim().min(8).max(30) }),
]);

export const phoneChangeCompleteSchema = z.object({
  currentProof: z.string().min(32).max(256),
  newProof: z.string().min(32).max(256),
});

export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type PhoneChangeRequestInput = z.infer<typeof phoneChangeRequestSchema>;
export type PhoneChangeCompleteInput = z.infer<typeof phoneChangeCompleteSchema>;
