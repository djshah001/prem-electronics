import rateLimit from 'express-rate-limit';

/** General public API limiter — 1000 requests per 15 minutes per IP */
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip CORS preflight, static asset requests, and health probes
    if (req.method === 'OPTIONS') return true;
    if (req.path.startsWith('/uploads') || req.path === '/health' || req.path === '/api/v1/health') return true;
    return false;
  },
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

/** Strict limiter for sensitive authentication endpoints (OTP request/verify) — 30 requests per 15 minutes */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  },
});

/** Session token refresh limiter — 150 requests per 15 minutes to allow smooth multi-tab browsing */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: {
    success: false,
    message: 'Too many session refresh requests, please try again later.',
  },
});

/** Payment endpoint limiter — 100 requests per hour */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: {
    success: false,
    message: 'Too many payment requests, please try again later.',
  },
});

