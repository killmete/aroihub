import { Router } from 'express';
import { register, login } from '../controllers/authController';
import { validateRegistration, validateLogin } from '../middleware/authMiddleware';
import { authRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Registration route
router.post('/register', authRateLimiter, validateRegistration, register);

// Login route
router.post('/login', authRateLimiter, validateLogin, login);

export default router;
