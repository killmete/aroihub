import rateLimit, { Options } from 'express-rate-limit';
import logger from '../utils/logger';
/**
 * Configuration for different rate limiters
 */
const rateLimitConfig = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many login attempts. Please try again after 15 minutes.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Don't send the `X-RateLimit-*` headers
  },
  general: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per minute
    message: 'Too many requests. Please try again in a minute.',
    standardHeaders: true,
    legacyHeaders: false,
  }
};

/**
 * Auth rate limiter - Stricter limits for authentication endpoints
 * Use for login, registration, password reset, etc.
 */
export const authRateLimiter = rateLimit({
  ...rateLimitConfig.auth,
  skipSuccessfulRequests: true, // Don't count successful authentication requests
  keyGenerator: (req) => {
    // Use both IP and username/email for more precise limiting
    return req.ip + (req.body.username || req.body.email || '');
  },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded: ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: rateLimitConfig.auth.message,
      retryAfter: Math.ceil(rateLimitConfig.auth.windowMs / 1000 / 60) // minutes
    });
  }
});

/**
 * General rate limiter - Less strict limits for general API endpoints
 */
export const generalRateLimiter = rateLimit({
  ...rateLimitConfig.general,
  skip: (req) => {
    // Optionally skip rate limiting for certain requests
    // Example: Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/status';
  },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded: ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: rateLimitConfig.general.message,
      retryAfter: Math.ceil(rateLimitConfig.general.windowMs / 1000) // seconds
    });
  }
});

/**
 * API rate limiter - For specific API endpoints that need different limits
 */
export const apiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 requests per 5 minutes
  message: 'API rate limit exceeded. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req): string => {
    const identifier = req.body?.username || req.body?.email || '';
    return `${req.ip}-${identifier}`;
  }
});
/**
 * Create a custom rate limiter with specific configuration
 * @param {Object} config - Custom configuration options
 * @returns {Function} Express middleware
 */
export const createCustomLimiter = (config: Partial<Options>) => {
  return rateLimit({
    ...config,
    standardHeaders: true,
    legacyHeaders: false
  });
};

export const reviewSubmissionLimiter = createCustomLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Max 5 review submissions per window
    message: 'Too many reviews submitted. Please try again after 15 minutes.',
  });
  
  export const reviewLikeLimiter = createCustomLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Max 20 likes per window
    message: 'Too many like attempts. Please slow down.',
  });
  