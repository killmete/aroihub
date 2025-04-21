import express from 'express';
import { handleFrontendLog } from '../controllers/logController';
import { createCustomLimiter } from '../middleware/rateLimit';

const router = express.Router();

// Custom rate limiter for logs - avoid flooding
const logRateLimiter = createCustomLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Max 60 log events per IP per minute
  message: 'Too many logs submitted. Please slow down.'
});

router.post('/', logRateLimiter, handleFrontendLog);

export default router;
