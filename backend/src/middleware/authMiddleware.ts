import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import { RequestHandler } from 'express';

interface JwtPayload {
    id: number;
    email: string;
    username: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
            userId?: number;
        }
    }
}

// Middleware to protect routes
export const authenticate: RequestHandler = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as JwtPayload;
        req.user = decoded;
        req.userId = decoded.id;
        next();
    } catch (error) {
        res.status(403).json({ message: 'Invalid or expired token' });
        return;
    }
};

// Alias for backward compatibility
export const authenticateToken = authenticate;

// Validation middleware for registration
export const validateRegistration = [
    body('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),

    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('password')
        .isLength({ min: 6 })
        .withMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'),

    body('first_name')
        .notEmpty()
        .withMessage('First name is required'),

    body('last_name')
        .notEmpty()
        .withMessage('Last name is required'),

    body('phone_number')
        .optional({ nullable: true, checkFalsy: true })
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number')
        .isLength({ max: 10 })
        .withMessage('เบอร์โทรศัพท์ต้องไม่เกิน 10 ตัวอักษร')
];

// Validation middleware for login
export const validateLogin = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
];