import { Router } from 'express';
import { register, login } from '../controllers/authController';
import { validateRegistration, validateLogin } from '../middleware/authMiddleware';

const router = Router();

// Registration route
router.post('/register', validateRegistration, register);

// Login route
router.post('/login', validateLogin, login);

export default router;