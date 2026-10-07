import crypto from 'crypto';

export const verifyHmacSha256 = (secret: string, payload: string | Buffer, signature: string): boolean => {
  const expected = Buffer.from(
    crypto.createHmac('sha256', secret).update(payload).digest('hex'),
    'hex'
  );
  const actual = Buffer.from(signature, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(expected, actual);
};

