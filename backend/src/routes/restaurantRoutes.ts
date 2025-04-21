import express, { Request } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { isAdmin } from '../middleware/adminMiddleware';
import { body } from 'express-validator';
import multer from 'multer';
import { 
    getRestaurants,
    getRestaurantDetails,
    createNewRestaurant,
    updateRestaurant,
    deleteRestaurant,
    uploadRestaurantImage,
    getPopularRestaurantsHandler,
    getLatestRestaurantsHandler,
    getHomePageRestaurants
} from '../controllers/restaurantController';
import {
    getActiveBanners, updateBannerOrder
} from "../controllers/bannerController";
import {
    updateAllRestaurantStats
} from "../controllers/reviewController";

// Define custom request interface with userId property
interface AuthenticatedRequest extends Request {
    userId?: number;
    file?: Express.Multer.File;
}

const router = express.Router();

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// PUBLIC ENDPOINTS (no Authentication required)



// TO-DO: fix this later, band-aid solution but, it works right?
router.get('/banners/active', getActiveBanners);



// GET popular restaurants (renamed to top-rated for frontend compatibility)
router.get('/restaurants/top-rated', getPopularRestaurantsHandler);

// GET latest restaurants (renamed to newest for frontend compatibility)
router.get('/restaurants/newest', getLatestRestaurantsHandler);

// GET all restaurants for public access
router.get('/restaurants', getRestaurants);

// GET specific restaurant by ID for public access
router.get('/restaurants/:id', getRestaurantDetails);

// POST update all restaurant statistics
router.post('/restaurants/update-all-stats', authenticate, isAdmin, updateAllRestaurantStats);

// ADMIN ENDPOINTS (Authentication required)
// Admin route protection - all routes below will require auth + admin
router.use('/admin', authenticate, isAdmin);



// PUT update banner order (Somehow this works in restaurant routes but doesn't work in banner routes
// I don't really know what's going on but since it works, I'll just leave it here.
router.put('/admin/banners/reorder', updateBannerOrder);



// Upload restaurant image - place this BEFORE other routes to avoid path conflicts
router.post('/admin/restaurants/image', upload.single('image'), uploadRestaurantImage);

// GET all restaurants (admin access)
router.get('/admin/restaurants', getRestaurants);

// GET popular restaurants (admin access)
router.get('/admin/restaurants/popular', getPopularRestaurantsHandler);

// GET latest restaurants (admin access)
router.get('/admin/restaurants/latest', getLatestRestaurantsHandler);

// GET home page restaurants (both popular and latest)
router.get('/admin/restaurants/home', getHomePageRestaurants);

// GET specific restaurant by ID (admin access)
router.get('/admin/restaurants/:id', getRestaurantDetails);

// CREATE new restaurant
router.post('/admin/restaurants', [
    body('name')
        .notEmpty()
        .withMessage('Restaurant name is required'),
    body('address')
        .optional({ nullable: true })
        .isString()
        .withMessage('Address must be a string'),
    body('phone_number')
        .optional({ nullable: true })
        .isString()
        .withMessage('Please provide a valid phone number'),
    body('latitude')
        .optional({ nullable: true })
        .isNumeric()
        .withMessage('Latitude must be a number'),
    body('longitude')
        .optional({ nullable: true })
        .isNumeric()
        .withMessage('Longitude must be a number'),
    body('cuisine_type')
        .optional({ nullable: true })
        .isArray().optional()
        .withMessage('Cuisine type must be an array'),
    body('website_url')
        .optional({ nullable: true })
        .isURL()
        .withMessage('Website URL must be a valid URL'),
    body('images')
        .optional({ nullable: true })
        .isArray().optional()
        .withMessage('Images must be an array'),
],
    createNewRestaurant);

// UPDATE restaurant by ID
router.put('/admin/restaurants/:id', [
    body('name')
        .optional()
        .notEmpty()
        .withMessage('Restaurant name cannot be empty'),
    body('address')
        .optional({ nullable: true })
        .isString()
        .withMessage('Address must be a string'),
    body('phone_number')
        .optional({ nullable: true })
        .isString()
        .withMessage('Please provide a valid phone number'),
    body('latitude')
        .optional({ nullable: true })
        .isNumeric()
        .withMessage('Latitude must be a number'),
    body('longitude')
        .optional({ nullable: true })
        .isNumeric()
        .withMessage('Longitude must be a number'),
    body('cuisine_type')
        .optional({ nullable: true })
        .isArray().optional()
        .withMessage('Cuisine type must be an array'),
    body('website_url')
        .optional({ nullable: true })
        .isURL()
        .withMessage('Website URL must be a valid URL'),
    body('images')
        .optional({ nullable: true })
        .isArray().optional()
        .withMessage('Images must be an array'),
],
    updateRestaurant);

// DELETE restaurant by ID
router.delete('/admin/restaurants/:id', deleteRestaurant);

export default router;