import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS.replace(/\s+/g, '') },
  connectionTimeout: 5_000,
  greetingTimeout: 5_000,
});

/** Submit already validated, server-rendered content. This result means SMTP acceptance, not inbox delivery. */
export const sendRenderedEmail = async (input: {
  to: string; subject: string; html: string; text: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
  unsubscribeUrl?: string;
}) => transporter.sendMail({
  from: `"Prem Electronics" <${env.SMTP_FROM}>`,
  to: input.to,
  subject: input.subject,
  html: input.html,
  text: input.text,
  attachments: input.attachments,
  list: input.unsubscribeUrl ? { unsubscribe: { url: input.unsubscribeUrl, comment: 'Unsubscribe from Prem Electronics marketing email' } } : undefined,
  disableFileAccess: true,
  disableUrlAccess: true,
});
