import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
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
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many booking attempts, please try again after 15 minutes',
        code: 'RATE_LIMITED',
      },
    });
  },
});
