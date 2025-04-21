import { Request, Response, RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import pool from '../db';
import Review from '../models/review';
import Banner from '../models/bannerModel';
import {
    getAllUsers,
    getUserById,
    updateUserById,
    deleteUserById,
    getUserByUsername,
    getUserByEmail,
    storeUserUpdate
} from '../models/userModel';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';
import logger from '../utils/logger';

// Get all users
export const getUsers: RequestHandler = async (req, res) => {
    try {
        const users = await getAllUsers();
        logger.info(`Retrieved ${users.length} users`);
        res.json(users);
    } catch (error) {
        logger.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error while fetching users' });
    }
};

// Get user by ID
export const getUserDetails: RequestHandler = async (req, res) => {
    try {
        const userId = Number(req.params.id);
        logger.debug(`Retrieving user details for ID: ${userId}`);
        const user = await getUserById(userId);

        if (!user) {
            logger.warn(`User not found with ID: ${userId}`);
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const { password_hash, ...userDetails } = user;
        logger.info(`Retrieved user: ${user.username} (ID: ${userId})`);
        res.json(userDetails);
    } catch (error) {
        logger.error('Error fetching user:', error);
        res.status(500).json({ message: 'Server error while fetching user details' });
    }
};

// Update user by ID
export const updateUser: RequestHandler = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation errors:', errors.array());
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const userId = Number(req.params.id);
        logger.debug(`Updating user with ID: ${userId}`);
        const {
            username,
            email,
            first_name,
            last_name,
            phone_number,
            profile_picture_url,
            role_id
        } = req.body;

        if (username) {
            const existingUsername = await getUserByUsername(username);
            if (existingUsername && existingUsername.id !== userId) {
                logger.warn(`Username is already taken: ${username}`);
                res.status(400).json({ message: 'Username is already taken' });
                return;
            }
        }

        if (email) {
            const existingEmail = await getUserByEmail(email);
            if (existingEmail && existingEmail.id !== userId) {
                logger.warn(`Email is already taken: ${email}`);
                res.status(400).json({ message: 'Email is already taken' });
                return;
            }
        }

        const updatedUser = await updateUserById(userId, {
            username,
            email,
            first_name,
            last_name,
            phone_number,
            profile_picture_url,
            role_id
        });

        if (!updatedUser) {
            logger.warn(`User not found or no changes made for ID: ${userId}`);
            res.status(404).json({ message: 'User not found or no changes made' });
            return;
        }

        await storeUserUpdate(userId, {
            username,
            email,
            first_name,
            last_name,
            phone_number,
            profile_picture_url,
            role_id,
            updated_at: new Date()
        });

        logger.info(`User updated successfully: ${userId}`);
        res.json({
            message: 'User updated successfully',
            user: updatedUser
        });
    } catch (error) {
        logger.error('Error updating user:', error);
        res.status(500).json({ message: 'Server error while updating user' });
    }
};

// Delete user by ID
export const deleteUser: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = Number(req.params.id);
        logger.debug(`Attempting to delete user with ID: ${userId}`);
        const user = await getUserById(userId);

        if (!user) {
            logger.warn(`User not found with ID: ${userId}`);
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const adminId = req.userId;
        if (userId === adminId) {
            logger.warn(`Admin ${adminId} attempted to delete their own account`);
            res.status(400).json({ message: 'Cannot delete your own account' });
            return;
        }

        const deleted = await deleteUserById(userId);
        if (!deleted) {
            logger.error(`Failed to delete user with ID: ${userId}`);
            res.status(500).json({ message: 'Failed to delete user' });
            return;
        }

        logger.info(`User deleted successfully: ${user.username} (ID: ${userId})`);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        logger.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error while deleting user' });
    }
};

// Get dashboard statistics (users, restaurants, reviews, banners count)
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
        logger.debug('Retrieving dashboard statistics');
        // Get users count from PostgreSQL
        const usersResult = await pool.query('SELECT COUNT(*) FROM users');
        const usersCount = parseInt(usersResult.rows[0].count);
        
        // Get restaurants count from PostgreSQL
        const restaurantsResult = await pool.query('SELECT COUNT(*) FROM restaurants');
        const restaurantsCount = parseInt(restaurantsResult.rows[0].count);
        
        // Get reviews count from MongoDB
        const reviewsCount = await Review.countDocuments({ isDeleted: { $ne: true } });
        
        // Get banners count from MongoDB
        const bannersCount = await Banner.countDocuments({ isDeleted: { $ne: true } });
        
        logger.info(`Dashboard stats - Users: ${usersCount}, Restaurants: ${restaurantsCount}, Reviews: ${reviewsCount}, Banners: ${bannersCount}`);
        
        // Send statistics as JSON response
        res.json({
            users: usersCount,
            restaurants: restaurantsCount,
            reviews: reviewsCount,
            banners: bannersCount
        });
    } catch (err) {
        logger.error('getDashboardStats error:', err);
        res.status(500).json({ message: 'Server error while fetching dashboard statistics' });
    }
};

// Get recent activities (restaurants, reviews, banners)
export const getRecentActivities = async (req: Request, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 5;
        logger.debug(`Retrieving recent activities with limit: ${limit}`);
        
        // Get recent restaurants from PostgreSQL
        const restaurantsResult = await pool.query(
            `SELECT id, name, created_at FROM restaurants ORDER BY created_at DESC LIMIT $1`,
            [limit]
        );
        const recentRestaurants = restaurantsResult.rows.map(restaurant => ({
            type: 'restaurant',
            id: restaurant.id,
            name: restaurant.name,
            created_at: restaurant.created_at
        }));
        
        // Get recent reviews from MongoDB
        const recentReviewsData = await Review.find({ isDeleted: { $ne: true } })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        
        // Enhance reviews with restaurant names
        const recentReviews = await Promise.all(
            recentReviewsData.map(async (review) => {
                try {
                    // Get restaurant name
                    const restaurantResult = await pool.query(
                        'SELECT name FROM restaurants WHERE id = $1',
                        [review.restaurant]
                    );
                    const restaurantName = restaurantResult.rows[0]?.name || 'Unknown Restaurant';
                    
                    return {
                        type: 'review',
                        id: review._id,
                        restaurant_id: review.restaurant,
                        restaurant_name: restaurantName,
                        rating: review.rating,
                        created_at: review.createdAt
                    };
                } catch (error) {
                    logger.error('Error getting restaurant name for review:', error);
                    return {
                        type: 'review',
                        id: review._id,
                        restaurant_id: review.restaurant,
                        restaurant_name: 'Unknown Restaurant',
                        rating: review.rating,
                        created_at: review.createdAt
                    };
                }
            })
        );
        
        // Get recent banners from MongoDB
        const recentBannersData = await Banner.find({ isDeleted: { $ne: true } })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        
        const recentBanners = recentBannersData.map(banner => ({
            type: 'banner',
            id: banner._id,
            created_at: banner.created_at
        }));
        
        // Combine all activities, sort by date, and limit to requested amount
        const allActivities = [...recentRestaurants, ...recentReviews, ...recentBanners]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, limit);
        
        logger.info(`Retrieved ${allActivities.length} recent activities`);
        res.json(allActivities);
    } catch (err) {
        logger.error('getRecentActivities error:', err);
        res.status(500).json({ message: 'Server error while fetching recent activities' });
    }
};
