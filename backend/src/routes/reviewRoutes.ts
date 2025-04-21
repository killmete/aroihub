import express, {
    Request,
    RequestHandler,
    Response,
    NextFunction,
  } from 'express';
  import { body } from 'express-validator';
  import multer from 'multer';
  import mongoose from 'mongoose';

  import { authenticate } from '../middleware/authMiddleware';
  import { isAdmin } from '../middleware/adminMiddleware';
  import {
    getReviews,
    getReviewDetails,
    getRestaurantReviews,
    getUserReviews,
    createNewReview,
    updateExistingReview,
    deleteExistingReview,
    uploadReviewImage,
    getRestaurantRatingStats,
    updateAllRestaurantStats,
    toggleReviewLike,
  } from '../controllers/reviewController';

  import {
    reviewSubmissionLimiter,
    reviewLikeLimiter
  } from '../middleware/rateLimit';
  
  interface AuthenticatedRequest extends Request {
    userId?: number;
    file?: Express.Multer.File;
  }

  // Initialize router
  const router = express.Router();

  // Helper middleware to validate MongoDB ObjectId
  const validateObjectId = (idParam: string) => (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (!mongoose.Types.ObjectId.isValid(req.params[idParam])) {
        res.status(400).json({ message: `Invalid ${idParam} format` });
        return;
    }
    next();
  };

  // Set up multer for image upload
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  });

  // Upload review image
  router.post(
    '/reviews/image',
    authenticate,
    upload.single('image'),
    uploadReviewImage as RequestHandler
  );

  // =================== Public Routes ===================

  // Get reviews for a specific restaurant
  router.get('/restaurants/:restaurantId/reviews', getRestaurantReviews);
  router.get('/restaurants/:restaurantId/rating', getRestaurantRatingStats);


  // Get rating stats for a restaurant
  router.get(
    '/restaurants/:restaurantId/rating',
    getRestaurantRatingStats
  );

  // =================== Authenticated User Routes ===================

  router.use(authenticate);

  // Get reviews by the authenticated user
  router.get('/user/reviews', (req: AuthenticatedRequest, res: Response) => {
    req.params.userId = String(req.userId);
    getUserReviews(req as Request, res);
  });

  // Create a new review
  router.post(
    '/reviews',
    reviewSubmissionLimiter,
    [
      body('restaurant_id')
        .notEmpty()
        .isInt()
        .withMessage('Restaurant ID is required and must be a number'),
      body('rating')
        .notEmpty()
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating is required and must be between 1 and 5'),
      body('comment')
        .optional({ nullable: true })
        .isString()
        .withMessage('Comment must be a string'),
      body('images')
        .optional({ nullable: true })
        .isArray()
        .withMessage('Images must be an array'),
    ],
    (req: AuthenticatedRequest, res: Response) => {
      req.body.user_id = req.userId;
      createNewReview(req as Request, res);
    }
  );
  

  // Toggle like on a review - moved to authenticated users section
  router.post(
    '/reviews/:id/like',
    reviewLikeLimiter,
    validateObjectId('id'),
    toggleReviewLike
  );

  // =================== Admin Routes ===================

  router.use(isAdmin);

  // Get all reviews
  router.get('/reviews', getReviews);

  // Update all restaurant statistics
  router.post('/restaurants/update-all-stats', updateAllRestaurantStats);

  // Get review by ID
  router.get('/reviews/:id', validateObjectId('id'), getReviewDetails);

  // (Already defined above, remove this if duplicate route isn't intentional)
  // router.get('/restaurants/:restaurantId/reviews', validateObjectId('restaurantId'), getRestaurantReviews);

  // Update a review
  router.put(
    '/reviews/:id',
    [
      validateObjectId('id'),
      body('rating')
        .optional({ nullable: true })
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
      body('comment')
        .optional({ nullable: true })
        .isString()
        .withMessage('Comment must be a string'),
      body('images')
        .optional({ nullable: true })
        .isArray()
        .withMessage('Images must be an array'),
      body('likes')
        .optional({ nullable: true })
        .isInt({ min: 0 })
        .withMessage('Likes must be a non-negative number'),
      body('helpful_count')
        .optional({ nullable: true })
        .isInt({ min: 0 })
        .withMessage('Helpful count must be a non-negative number'),
    ],
    updateExistingReview
  );

  // Delete a review
  router.delete('/reviews/:id', validateObjectId('id'), deleteExistingReview);

  export default router;
