import express from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { isAdmin } from '../middleware/adminMiddleware';
import { body } from 'express-validator';
import {
    getUsers,
    getUserDetails,
    updateUser,
    deleteUser,
    getDashboardStats,
    getRecentActivities
} from '../controllers/adminController';

const router = express.Router();

// ✅ Secure all routes under this with middleware
router.use('/', authenticate, isAdmin);

// ✅ GET dashboard statistics
router.get('/stats', getDashboardStats);

// ✅ GET recent activities
router.get('/activities', getRecentActivities);

// ✅ GET all users
router.get('/users', getUsers);

// ✅ GET specific user by ID
router.get('/users/:id', getUserDetails);

// ✅ Update user by ID
router.put(
    '/users/:id',
    [
        body('username')
            .optional()
            .isLength({ min: 3, max: 30 })
            .withMessage('Username must be between 3 and 30 characters')
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage('Username can only contain letters, numbers, and underscores'),
        body('email')
            .optional()
            .isEmail()
            .withMessage('Please provide a valid email address'),
        body('first_name')
            .optional()
            .notEmpty()
            .withMessage('First name cannot be empty'),
        body('last_name')
            .optional()
            .notEmpty()
            .withMessage('Last name cannot be empty'),
        body('phone_number')
            .optional({ nullable: true, checkFalsy: true })
            .isMobilePhone('any')
            .withMessage('Please provide a valid phone number'),
        body('role_id')
            .optional()
            .isInt({ min: 1, max: 2 })
            .withMessage('Role ID must be either 1 (User) or 2 (Admin)')
    ],
    updateUser
);

// ✅ DELETE user by ID
router.delete('/users/:id', deleteUser);

export default router;
