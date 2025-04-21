import { Router } from 'express';
import { updateProfile, uploadProfileImage, changePassword, checkUserUpdates, clearUpdates } from '../controllers/userController';
import { authenticate } from '../middleware/authMiddleware';
import { validateProfileUpdate, validatePasswordChange } from '../middleware/userMiddleware';
import multer from 'multer';
import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import {
    profileImageUploadLimiter,
    passwordChangeLimiter,
} from '../middleware/rateLimit';

const router = Router();

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Middleware to check validation errors and return responses appropriately
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    next();
};

// Update user profile route
router.put('/profile', authenticate, validateProfileUpdate, handleValidationErrors, updateProfile);

// Upload profile image route
router.post(
    '/profile/image',
    authenticate,
    profileImageUploadLimiter,
    upload.single('image'),
    uploadProfileImage
);

// Change password route
router.put(
    '/password',
    authenticate,
    passwordChangeLimiter,
    validatePasswordChange,
    handleValidationErrors,
    changePassword
);

// Check for updates route
router.get('/updates', authenticate, checkUserUpdates);

// Clear updates route
router.post('/updates/clear', authenticate, clearUpdates);

export default router;