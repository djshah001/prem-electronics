import nodemailer from 'nodemailer';
import { env } from '../../config/env';

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS.replace(/\s+/g, ''),
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
});

const baseEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Prem Electronics</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0f0f1a; font-family: 'Segoe UI', Arial, sans-serif; color: #e2e8f0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%); padding: 32px 40px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: 1px; }
    .header p { margin: 4px 0 0; color: #bfdbfe; font-size: 13px; }
    .body { padding: 40px; }
    .body h2 { color: #60a5fa; font-size: 20px; margin-top: 0; }
    .otp-box { background: #0f172a; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-box span { font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #60a5fa; }
    .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .info-table td { padding: 10px 0; border-bottom: 1px solid #2d2d4a; font-size: 14px; }
    .info-table td:first-child { color: #94a3b8; }
    .info-table td:last-child { text-align: right; font-weight: 600; }
    .total-row td { color: #60a5fa !important; font-size: 16px !important; border-bottom: none !important; }
    .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6, #7c3aed); color: #ffffff !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; margin: 16px 0; }
    .footer { padding: 20px 40px; text-align: center; font-size: 12px; color: #475569; border-top: 1px solid #2d2d4a; }
    .badge { display: inline-block; background: #064e3b; color: #34d399; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div style="padding: 24px;">
    <div class="container">
      <div class="header">
        <h1>⚡ Prem Electronics</h1>
        <p>Your trusted electronics partner</p>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Prem Electronics. All rights reserved.</p>
        <p>This email was sent to you because you have an account with us.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// ─── OTP Verification Email ─────────────────────────────────────────────────

export const sendOTPEmail = async (to: string, name: string, otp: string): Promise<void> => {
  const content = `
    <h2>Verify your email address</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Use the OTP below to verify your account. This code expires in <strong>10 minutes</strong>.</p>
    <div class="otp-box">
      <span>${otp}</span>
    </div>
    <p style="color: #94a3b8; font-size: 13px;">If you didn't create an account, you can safely ignore this email.</p>
  `;
  await transporter.sendMail({
    from: `"Prem Electronics" <${env.SMTP_FROM}>`,
    to,
    subject: `${otp} is your Prem Electronics verification code`,
    html: baseEmailTemplate(content),
  });
};

// ─── Password Reset Email ────────────────────────────────────────────────────

export const sendPasswordResetEmail = async (
  to: string,
  name: string,
  resetLink: string
): Promise<void> => {
  const content = `
    <h2>Reset your password</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>We received a request to reset the password for your account. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetLink}" class="btn">Reset Password</a>
    </div>
    <p style="color: #94a3b8; font-size: 13px;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
  `;
  await transporter.sendMail({
    from: `"Prem Electronics" <${env.SMTP_FROM}>`,
    to,
    subject: 'Reset your Prem Electronics password',
    html: baseEmailTemplate(content),
  });
};

// ─── Order Confirmation Email ────────────────────────────────────────────────

interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  items: Array<{ title: string; quantity: number; price: number }>;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export const sendOrderConfirmationEmail = async (
  to: string,
  data: OrderEmailData
): Promise<void> => {
  const formatPrice = (p: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p);

  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td>${item.title}</td>
        <td style="text-align:center;">${item.quantity}</td>
        <td style="text-align:right;">${formatPrice(item.price)}</td>
      </tr>`
    )
    .join('');

  const content = `
    <h2>Order Confirmed! 🎉</h2>
    <p>Hi <strong>${data.customerName}</strong>,</p>
    <p>Thank you for shopping with Prem Electronics! Your order has been received and is being processed.</p>
    <div style="margin: 16px 0;">
      <span class="badge">Order #${data.orderNumber}</span>
    </div>
    <table class="info-table">
      <thead>
        <tr style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">
          <td>Product</td>
          <td style="text-align:center;">Qty</td>
          <td style="text-align:right;">Price</td>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <table class="info-table">
      <tr><td>Subtotal</td><td>${formatPrice(data.subtotal)}</td></tr>
      ${data.discount > 0 ? `<tr><td>Discount</td><td>- ${formatPrice(data.discount)}</td></tr>` : ''}
      <tr><td>Shipping</td><td>${data.shipping === 0 ? 'Free' : formatPrice(data.shipping)}</td></tr>
      <tr><td>Tax (GST)</td><td>${formatPrice(data.tax)}</td></tr>
      <tr class="total-row"><td><strong>Total Paid</strong></td><td><strong>${formatPrice(data.total)}</strong></td></tr>
    </table>
    <p style="color: #94a3b8; font-size: 13px;">
      📦 Shipping to: ${data.shippingAddress.street}, ${data.shippingAddress.city}, ${data.shippingAddress.state} - ${data.shippingAddress.pincode}
    </p>
  `;

  await transporter.sendMail({
    from: `"Prem Electronics" <${env.SMTP_FROM}>`,
    to,
    subject: `Order Confirmed — #${data.orderNumber} | Prem Electronics`,
    html: baseEmailTemplate(content),
  });
};
