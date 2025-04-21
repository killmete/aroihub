import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authMiddleware';
import { isAdmin } from '../middleware/adminMiddleware';
import {
    getAllBanners,
    createBanner,
    updateBanner,
    deleteBanner,
    updateBannerOrder,
    toggleBannerStatus,
    uploadBannerImage
} from '../controllers/bannerController';
import { createCustomLimiter } from '../middleware/rateLimit';

const router = express.Router();

// Rate limiter specifically for admin banner actions
const bannerRateLimiter = createCustomLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // 30 requests per window
  message: 'Too many banner requests. Please try again later.'
});

// Configure multer for file uploads - using memory storage instead of disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Only JPEG, PNG and WebP image files are allowed'));
        }
        cb(null, true);
    }
});

// =====================================================
// PROTECTED ROUTES - Authentication required beyond this point
// =====================================================
router.use('/admin/banners', authenticate, isAdmin, bannerRateLimiter);

// GET all banners (admin access)
router.get('/admin/banners', getAllBanners);

// POST create a new banner
router.post('/admin/banners', createBanner);

// PUT update an existing banner
router.put('/admin/banners/:id', updateBanner);

// DELETE a banner
router.delete('/admin/banners/:id', deleteBanner);

// PUT toggle banner active status
router.put('/admin/banners/:id/toggle', toggleBannerStatus);

// POST upload banner image
router.post('/admin/banners/upload', upload.single('image'), uploadBannerImage);

export default router;
