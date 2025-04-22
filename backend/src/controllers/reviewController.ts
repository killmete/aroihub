import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Review from '../models/review';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import pool from "../db/index"; // PostgreSQL pool instance
import logger from '../utils/logger';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dfiywj2ld',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const parseArraySafe = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return [value];
  }
};

// Helper function to update restaurant stats in PostgreSQL
const updateRestaurantStats = async (restaurantId: number): Promise<void> => {
  try {
    // Calculate current rating statistics from MongoDB
    const stats = await Review.aggregate([
      { $match: { 
          restaurant: restaurantId,
          isDeleted: { $ne: true }
      }},
      { $group: {
          _id: '$restaurant',
          average_rating: { $avg: '$rating' },
          review_count: { $sum: 1 }
      }}
    ]);
    
    // Get values with defaults if no reviews exist
    const average_rating = stats[0]?.average_rating || 0;
    const review_count = stats[0]?.review_count || 0;
    
    logger.info(`Updating restaurant ${restaurantId} stats: avg=${average_rating.toFixed(2)}, count=${review_count}`);
    
    // Update the restaurant record in PostgreSQL with calculated values
    await pool.query(
      `UPDATE restaurants 
       SET average_rating = $1, review_count = $2, updated_at = NOW() 
       WHERE id = $3`,
      [average_rating, review_count, restaurantId]
    );
  } catch (error) {
    logger.error(`Failed to update restaurant stats for restaurant ID ${restaurantId}:`, error);
  }
};

export const getReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    // Fetch reviews from MongoDB
    const reviews = await Review.find({ isDeleted: { $ne: true } });
    logger.info(`Found ${reviews.length} reviews in admin panel fetch`);
    
    // Enhance each review with user and restaurant info from PostgreSQL
    const enhancedReviews = await Promise.all(reviews.map(async (review) => {
      const reviewObj = review.toObject();
      
      try {
        // Get user information
        const userResult = await pool.query(
          `SELECT id, username, profile_picture_url FROM users WHERE id = $1`,
          [review.user]
        );
        const user = userResult.rows[0];
        
        // Get restaurant information
        const restaurantResult = await pool.query(
          `SELECT id, name FROM restaurants WHERE id = $1`,
          [review.restaurant]
        );
        const restaurant = restaurantResult.rows[0];
        
        return {
          ...reviewObj,
          username: user?.username || "Anonymous",
          restaurant_name: restaurant?.name || "Unknown Restaurant",
          userDetails: {
            id: user?.id || 0,
            username: user?.username || "Anonymous",
            profile_image: user?.profile_picture_url || null
          }
        };
      } catch (error) {
        logger.error(`Failed to fetch details for review ID ${review._id}:`, error);
        return {
          ...reviewObj,
          username: "Anonymous",
          restaurant_name: "Unknown Restaurant",
          userDetails: { username: "Anonymous", profile_image: null }
        };
      }
    }));
    
    res.json(enhancedReviews);
  } catch (err) {
    logger.error('getReviews error:', err);
    res.status(500).json({ message: 'Server error while fetching reviews' });
  }
};

export const getReviewDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review || review.isDeleted) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    res.json(review);
  } catch (err) {
    logger.error('getReviewDetails error:', err);
    res.status(500).json({ message: 'Server error while fetching review details' });
  }
};

export const getRestaurantReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurantId = parseInt(req.params.restaurantId);

    if (isNaN(restaurantId)) {
      logger.warn("Invalid restaurant ID format:", req.params.restaurantId);
      res.json([]);
      return;
    }
    
    logger.info(`Fetching reviews for restaurant ID: ${restaurantId}`);
    
    // Fetch reviews from MongoDB
    const reviews = await Review.find({
      restaurant: restaurantId,
      isDeleted: { $ne: true }
    });
    
    logger.info(`Found ${reviews.length} reviews in MongoDB`);

    // Enhance each review with PostgreSQL user info
    const reviewsWithUserInfo = await Promise.all(reviews.map(async (review) => {
      const reviewObj = review.toObject();
      try {
        logger.info(`Fetching user data for user ID: ${review.user}`);
        
        const { rows } = await pool.query(
          `SELECT id, username, profile_picture_url FROM users WHERE id = $1`,
          [review.user]
        );
        
        logger.info(`PostgreSQL query result for user ID ${review.user}:`, rows);

        const user = rows[0];

        return {
          ...reviewObj,
          username: user?.username || "Anonymous",
          userDetails: {
            id: user?.id || 0,
            username: user?.username || "Anonymous",
            profile_image: user?.profile_picture_url || null
          }
        };
      } catch (error) {
        logger.error(`Failed to fetch user details for user ID ${review.user}:`, error);
        return {
          ...reviewObj,
          username: "Anonymous",
          userDetails: { username: "Anonymous", profile_image: null }
        };
      }
    }));

    res.json(reviewsWithUserInfo);
  } catch (err) {
    logger.error('getRestaurantReviews error:', err);
    res.status(500).json({ message: 'Server error while fetching restaurant reviews' });
  }
};


export const getUserReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      logger.warn("Invalid user ID format:", req.params.userId);
      res.json([]);
      return;
    }
    
    const reviews = await Review.find({
      user: userId,
      isDeleted: { $ne: true }
    });
    
    res.json(reviews);
  } catch (err) {
    logger.error('getUserReviews error:', err);
    res.status(500).json({ message: 'Server error while fetching user reviews' });
  }
};

export const createNewReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { user_id, restaurant_id, rating, comment, images } = req.body;
    
    const userId = parseInt(user_id);
    const restaurantId = parseInt(restaurant_id);
    
    if (isNaN(userId)) {
      res.status(400).json({ message: 'Invalid user ID format' });
      return;
    }
    
    if (isNaN(restaurantId)) {
      res.status(400).json({ message: 'Invalid restaurant ID format' });
      return;
    }

    const newReview = await Review.create({
      user: userId,
      restaurant: restaurantId,
      rating: Number(rating),
      comment,
      images: parseArraySafe(images)
    });

    // Update restaurant stats after creating a new review
    await updateRestaurantStats(restaurantId);

    res.status(201).json({
      message: 'Review created successfully',
      review: newReview
    });
  } catch (err) {
    logger.error('createNewReview error:', err);
    res.status(500).json({
      message: 'Server error while creating review',
      error: err instanceof Error ? err.message : String(err)
    });
  }
};

export const updateExistingReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const reviewId = req.params.id;
    const updateData: any = {};
    const { rating, comment, images, likes, helpful_count } = req.body;

    if (rating !== undefined) updateData.rating = Number(rating);
    if (comment !== undefined) updateData.comment = comment;
    if (images !== undefined) updateData.images = parseArraySafe(images);
    if (likes !== undefined) updateData.likes = Number(likes);
    if (helpful_count !== undefined) updateData.helpful_count = Number(helpful_count);
    updateData.updatedAt = new Date();

    const updatedReview = await Review.findByIdAndUpdate(reviewId, updateData, { new: true });

    if (!updatedReview) {
      res.status(404).json({ message: 'Review not found or no changes made' });
      return;
    }

    // Update restaurant stats after updating a review
    await updateRestaurantStats(updatedReview.restaurant);

    res.json({
      message: 'Review updated successfully',
      review: updatedReview
    });
  } catch (err) {
    logger.error('updateExistingReview error:', err);
    res.status(500).json({
      message: 'Server error while updating review',
      error: err instanceof Error ? err.message : String(err)
    });
  }
};

export const deleteExistingReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    // Update restaurant stats after deleting a review
    await updateRestaurantStats(review.restaurant);

    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    logger.error('deleteExistingReview error:', err);
    res.status(500).json({ message: 'Server error while deleting review' });
  }
};

export const uploadReviewImage = async (
  req: Request & { file?: { 
    buffer: Buffer;
    mimetype: string;
    originalname?: string;
  } },
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const base64 = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'aroihub/reviews',
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || 'aroihub_image'
    });

    res.status(200).json({ imageUrl: result.secure_url });
  } catch (err) {
    logger.error('uploadReviewImage error:', err);
    res.status(500).json({ error: 'Image upload failed' });
  }
};

export const getRestaurantRatingStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurantId = parseInt(req.params.restaurantId);
    
    if (isNaN(restaurantId)) {
      logger.warn("Invalid restaurant ID format:", req.params.restaurantId);
      res.json({
        restaurant_id: req.params.restaurantId,
        average_rating: 0,
        review_count: 0
      });
      return;
    }
    
    const stats = await Review.aggregate([
      { $match: { 
          restaurant: restaurantId,
          isDeleted: { $ne: true }
      }},
      { $group: {
          _id: '$restaurant',
          average_rating: { $avg: '$rating' },
          review_count: { $sum: 1 }
      }}
    ]);
    
    res.json({
      restaurant_id: restaurantId,
      average_rating: stats[0]?.average_rating || 0,
      review_count: stats[0]?.review_count || 0
    });
  } catch (err) {
    logger.error('getRestaurantRatingStats error:', err);
    res.status(500).json({ message: 'Server error while fetching rating stats' });
  }
};

// Update all restaurant statistics based on current MongoDB reviews
export const updateAllRestaurantStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all reviews grouped by restaurant with stats
    const restaurantStats = await Review.aggregate([
      { $match: { isDeleted: { $ne: true } }},
      { $group: {
          _id: '$restaurant',
          average_rating: { $avg: '$rating' },
          review_count: { $sum: 1 }
      }}
    ]);
    
    logger.info(`Found stats for ${restaurantStats.length} restaurants`);
    
    // Get all restaurant IDs from PostgreSQL
    const allRestaurantsResult = await pool.query('SELECT id FROM restaurants');
    const allRestaurantIds = allRestaurantsResult.rows.map(row => row.id);
    logger.info(`Found ${allRestaurantIds.length} total restaurants in PostgreSQL`);
    
    // Update each restaurant in PostgreSQL with its stats
    let updatedCount = 0;
    for (const stat of restaurantStats) {
      const restaurantId = stat._id;
      const average_rating = stat.average_rating || 0;
      const review_count = stat.review_count || 0;
      
      logger.info(`Updating restaurant ${restaurantId} stats: avg=${average_rating.toFixed(2)}, count=${review_count}`);
      
      try {
        await pool.query(
          `UPDATE restaurants 
           SET average_rating = $1, review_count = $2, updated_at = NOW() 
           WHERE id = $3`,
          [average_rating, review_count, restaurantId]
        );
        updatedCount++;
        
        // Remove this restaurant ID from the list of all restaurant IDs
        const index = allRestaurantIds.indexOf(restaurantId);
        if (index > -1) {
          allRestaurantIds.splice(index, 1);
        }
      } catch (error) {
        logger.error(`Failed to update stats for restaurant ${restaurantId}:`, error);
      }
    }

    // Reset stats for any restaurant that has no reviews (all restaurants left in allRestaurantIds)
    if (allRestaurantIds.length > 0) {
      try {
        logger.info(`Resetting stats for ${allRestaurantIds.length} restaurants with no reviews`);
        for (const restaurantId of allRestaurantIds) {
          await pool.query(
            `UPDATE restaurants
             SET average_rating = 0, review_count = 0, updated_at = NOW()
             WHERE id = $1`,
            [restaurantId]
          );
        }
      } catch (error) {
        logger.error(`Failed to reset stats for restaurants with no reviews:`, error);
      }
    }
    
    res.json({
      message: 'Restaurant statistics updated successfully',
      updated_restaurants: updatedCount,
      restaurants_with_reviews: restaurantStats.length,
      restaurants_reset: allRestaurantIds.length
    });
  } catch (err) {
    logger.error('updateAllRestaurantStats error:', err);
    res.status(500).json({ message: 'Server error while updating restaurant statistics' });
  }
};

export const toggleReviewLike = async (req: Request, res: Response): Promise<void> => {
  try {
    const reviewId = req.params.id;
    const userId = parseInt((req as any).userId);

    if (isNaN(userId)) {
      res.status(400).json({ message: 'Invalid user ID' });
      return;
    }

    // Find the review first
    const review = await Review.findById(reviewId);
    
    if (!review || review.isDeleted) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    // Initialize likes array if it doesn't exist
    if (!review.likedBy) {
      review.likedBy = [];
    }

    // Check if user already liked this review
    const userIndex = review.likedBy.indexOf(userId);
    
    if (userIndex === -1) {
      // User hasn't liked the review yet, add the like
      review.likedBy.push(userId);
      review.likes = (review.likes || 0) + 1;
      await review.save();
      res.json({ liked: true, likes: review.likes });
    } else {
      // User already liked, remove the like
      review.likedBy.splice(userIndex, 1);
      review.likes = Math.max(0, (review.likes || 1) - 1);
      await review.save();
      res.json({ liked: false, likes: review.likes });
    }
  } catch (err) {
    logger.error('toggleReviewLike error:', err);
    res.status(500).json({ message: 'Server error while updating like status' });
  }
};