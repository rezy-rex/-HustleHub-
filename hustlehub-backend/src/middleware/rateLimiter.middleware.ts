import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { logEvent } from '../utils/logger';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logEvent('rate.limited', { limiter: 'auth', ip: req.ip, path: req.path }, 'warn');
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many authentication attempts, please try again after 15 minutes',
        code: 'RATE_LIMITED',
      },
    });
  },
});

export const bookingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.BOOKING_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logEvent('rate.limited', { limiter: 'booking', ip: req.ip, path: req.path }, 'warn');
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many booking attempts, please try again after 15 minutes',
        code: 'RATE_LIMITED',
      },
    });
  },
});
