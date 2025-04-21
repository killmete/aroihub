import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import {
    getAllRestaurants,
    getAllRestaurantsWithReviews,
    getRestaurantById,
    createRestaurant,
    updateRestaurantById,
    deleteRestaurantById,
    getPopularRestaurants,
    getLatestRestaurants
} from '../models/restaurantModel';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dfiywj2ld',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// --- Utility Functions ---
const parseJSONSafe = <T>(input: string | undefined): T | undefined => {
    if (!input) return undefined;
    try {
        return JSON.parse(input);
    } catch {
        return undefined;
    }
};

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

const handleValidation = (req: Request, res: Response, loggerMessage: string): boolean => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn(`${loggerMessage}:`, errors.array());
        res.status(400).json({ errors: errors.array() });
        return false;
    }
    return true;
};

// --- Controller Functions ---

export const searchRestaurants = async (req: Request, res: Response): Promise<void> => {
    try {
        logger.info('Searching restaurants with filters');
        logger.debug('Search query parameters:', req.query);

        const {
            name,
            cuisine,
            cuisines,
            minPrice,
            maxPrice,
            minRating,
            cuisineLogic
        } = req.query;

        // Get all restaurants first - we'll filter in memory
        const allRestaurants = await getAllRestaurants();

        // Apply filters
        let filteredRestaurants = [...allRestaurants];

        // Filter by name
        if (name && typeof name === 'string') {
            const nameLower = name.toLowerCase();
            filteredRestaurants = filteredRestaurants.filter(
                restaurant => restaurant.name.toLowerCase().includes(nameLower)
            );
        }

        // Filter by single cuisine (case-insensitive)
        if (cuisine && typeof cuisine === 'string') {
            const cuisineLower = cuisine.toLowerCase();
            filteredRestaurants = filteredRestaurants.filter(
                restaurant => restaurant.cuisine_type?.some(c => c.toLowerCase() === cuisineLower)
            );
        }

        // Filter by multiple cuisines (case-insensitive)
        if (cuisines && typeof cuisines === 'string') {
            const cuisineArray = cuisines.split(',');
            const logic = cuisineLogic === 'AND' ? 'AND' : 'OR';

            filteredRestaurants = filteredRestaurants.filter(restaurant => {
                if (!restaurant.cuisine_type || restaurant.cuisine_type.length === 0) {
                    return false;
                }

                if (logic === 'AND') {
                    // AND logic - restaurant must have ALL selected cuisines
                    return cuisineArray.every(c => 
                        restaurant.cuisine_type?.some(rc => rc.toLowerCase() === c.toLowerCase())
                    );
                } else {
                    // OR logic - restaurant must have ANY of the selected cuisines
                    return cuisineArray.some(c => 
                        restaurant.cuisine_type?.some(rc => rc.toLowerCase() === c.toLowerCase())
                    );
                }
            });
        }

        // Filter by price range
        if (minPrice && typeof minPrice === 'string') {
            const min = Number(minPrice);
            if (!isNaN(min)) {
                filteredRestaurants = filteredRestaurants.filter(
                    restaurant => restaurant.min_price !== undefined && restaurant.min_price >= min
                );
            }
        }

        if (maxPrice && typeof maxPrice === 'string') {
            const max = Number(maxPrice);
            if (!isNaN(max)) {
                filteredRestaurants = filteredRestaurants.filter(
                    restaurant => restaurant.max_price !== undefined && restaurant.max_price <= max
                );
            }
        }

        // Filter by minimum rating
        if (minRating && typeof minRating === 'string') {
            const rating = Number(minRating);
            if (!isNaN(rating)) {
                filteredRestaurants = filteredRestaurants.filter(
                    restaurant => restaurant.average_rating !== undefined && restaurant.average_rating >= rating
                );
            }
        }

        logger.info(`Found ${filteredRestaurants.length} restaurants matching search criteria`);
        res.json(filteredRestaurants);
    } catch (err) {
        logger.error('searchRestaurants error:', err);
        res.status(500).json({ message: 'Server error while searching restaurants' });
    }
};

export const getRestaurants = async (req: Request, res: Response): Promise<void> => {
    try {
        // If there are query parameters, use the search function instead
        if (Object.keys(req.query).length > 0) {
            return searchRestaurants(req, res);
        }

        logger.info('Fetching all restaurants');
        const restaurants = await getAllRestaurants();
        res.json(restaurants);
    } catch (err) {
        logger.error('Error fetching all restaurants:', err);
        res.status(500).json({ message: 'Server error while fetching restaurants' });
    }
};

export const getRestaurantsWithReviews = async (req: Request, res: Response): Promise<void> => {
    try {
        logger.info('Fetching restaurants with review data');
        const restaurants = await getAllRestaurantsWithReviews();
        res.json(restaurants);
    } catch (err) {
        logger.error('Error fetching restaurants with reviews:', err);
        res.status(500).json({ message: 'Server error while fetching restaurants with reviews' });
    }
};

export const getPopularRestaurantsHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 8;
        logger.debug(`Fetching popular restaurants with limit: ${limit}`);
        
        const restaurants = await getPopularRestaurants(limit);
        res.json(restaurants);
    } catch (err) {
        logger.error('getPopularRestaurantsHandler error:', err);
        res.status(500).json({ message: 'Server error while fetching popular restaurants' });
    }
};

export const getLatestRestaurantsHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 8;
        logger.debug(`Fetching latest restaurants with limit: ${limit}`);
        
        const restaurants = await getLatestRestaurants(limit);
        res.json(restaurants);
    } catch (err) {
        logger.error('getLatestRestaurantsHandler error:', err);
        res.status(500).json({ message: 'Server error while fetching latest restaurants' });
    }
};

export const getHomePageRestaurants = async (req: Request, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 8;
        logger.debug(`Fetching homepage restaurants with limit: ${limit}`);
        
        const [popular, latest] = await Promise.all([
            getPopularRestaurants(limit),
            getLatestRestaurants(limit)
        ]);
        
        logger.info(`Fetched ${popular.length} popular and ${latest.length} latest restaurants for homepage`);
        res.json({ popular, latest });
    } catch (err) {
        logger.error('getHomePageRestaurants error:', err);
        res.status(500).json({ message: 'Server error while fetching home page restaurants' });
    }
};

export const getRestaurantDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        logger.debug(`Fetching details for restaurant ID: ${id}`);
        
        const restaurant = await getRestaurantById(id);
        
        if (!restaurant) {
            logger.warn(`Restaurant not found with ID: ${id}`);
            res.status(404).json({ message: 'Restaurant not found' });
            return;
        }
        
        logger.info(`Returning details for restaurant: ${restaurant.name}`);
        res.json(restaurant);
    } catch (err) {
        logger.error('getRestaurantDetails error:', err);
        res.status(500).json({ message: 'Server error while fetching restaurant details' });
    }
};

export const createNewRestaurant = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate request
        if (!handleValidation(req, res, 'Validation failed in createNewRestaurant')) return;

        const {
            name,
            address,
            phone_number,
            latitude,
            longitude,
            cuisine_type,
            website_url,
            menu,
            images,
            opening_hour,
            closing_hour,
            min_price,
            max_price,
            min_capacity,
            max_capacity
        } = req.body;

        logger.info(`Creating new restaurant: ${name}`);
        
        const restaurant = await createRestaurant({
            name,
            address,
            phone_number,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined,
            cuisine_type: parseArraySafe(cuisine_type),
            website_url,
            menu: parseJSONSafe(menu),
            images: parseArraySafe(images),
            opening_hour,
            closing_hour,
            min_price: min_price !== undefined ? Number(min_price) : undefined,
            max_price: max_price !== undefined ? Number(max_price) : undefined,
            min_capacity: min_capacity !== undefined ? Number(min_capacity) : undefined,
            max_capacity: max_capacity !== undefined ? Number(max_capacity) : undefined
        });

        logger.info(`Restaurant created successfully: ${restaurant.id} - ${restaurant.name}`);
        res.status(201).json({
            message: 'Restaurant created successfully',
            restaurant
        });
    } catch (err) {
        logger.error('createNewRestaurant error:', err);
        res.status(500).json({
            message: 'Server error while creating restaurant',
            error: err instanceof Error ? err.message : String(err)
        });
    }
};

export const updateRestaurant = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        logger.info(`Updating restaurant with ID: ${id}`);
        
        // Validate request
        if (!handleValidation(req, res, 'Validation failed in updateRestaurant')) return;

        // Ensure the restaurant exists
        const existingRestaurant = await getRestaurantById(id);
        if (!existingRestaurant) {
            logger.warn(`Restaurant not found for update: ${id}`);
            res.status(404).json({ message: 'Restaurant not found' });
            return;
        }

        const {
            name,
            address,
            phone_number,
            latitude,
            longitude,
            cuisine_type,
            website_url,
            menu,
            images,
            opening_hour,
            closing_hour,
            min_price,
            max_price,
            min_capacity,
            max_capacity
        } = req.body;

        const updated = await updateRestaurantById(id, {
            name,
            address,
            phone_number,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined,
            cuisine_type: cuisine_type ? parseArraySafe(cuisine_type) : undefined,
            website_url,
            menu: menu ? parseJSONSafe(menu) : undefined,
            images: images ? parseArraySafe(images) : undefined,
            opening_hour,
            closing_hour,
            min_price: min_price !== undefined ? Number(min_price) : undefined,
            max_price: max_price !== undefined ? Number(max_price) : undefined,
            min_capacity: min_capacity !== undefined ? Number(min_capacity) : undefined,
            max_capacity: max_capacity !== undefined ? Number(max_capacity) : undefined
        });

        if (!updated) {
            logger.warn(`Restaurant not found or not updated: ${id}`);
            res.status(404).json({ message: 'Restaurant not found or not updated' });
            return;
        }

        logger.info(`Restaurant updated successfully: ${id} - ${updated.name}`);
        res.json({
            message: 'Restaurant updated successfully',
            restaurant: updated
        });
    } catch (err) {
        logger.error('updateRestaurant error:', err);
        res.status(500).json({
            message: 'Server error while updating restaurant',
            error: err instanceof Error ? err.message : String(err)
        });
    }
};

export const deleteRestaurant = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        logger.info(`Attempting to delete restaurant with ID: ${id}`);
        
        const restaurant = await getRestaurantById(id);
        if (!restaurant) {
            logger.warn(`Restaurant not found for deletion: ${id}`);
            res.status(404).json({ message: 'Restaurant not found' });
            return;
        }
        
        const deleted = await deleteRestaurantById(id);
        
        if (deleted) {
            logger.info(`Restaurant deleted successfully: ${id} - ${restaurant.name}`);
            res.json({ message: 'Restaurant deleted successfully' });
        } else {
            logger.error(`Failed to delete restaurant: ${id}`);
            res.status(500).json({ message: 'Failed to delete restaurant' });
        }
    } catch (err) {
        logger.error('deleteRestaurant error:', err);
        res.status(500).json({
            message: 'Server error while deleting restaurant',
            error: err instanceof Error ? err.message : String(err)
        });
    }
};

export const uploadRestaurantImage = async (req: Request, res: Response): Promise<void> => {
    try {
        // Handle file uploads from multer middleware
        if (req.file) {
            logger.debug('Processing image file upload for restaurant');

            // Convert buffer to base64
            const base64 = Buffer.from(req.file.buffer).toString('base64');
            const dataURI = `data:${req.file.mimetype};base64,${base64}`;

            const result = await cloudinary.uploader.upload(dataURI, {
                resource_type: 'image',
                folder: 'aroihub/restaurants'
            });

            logger.info('Restaurant image uploaded successfully to Cloudinary');
            res.status(200).json({ url: result.secure_url, imageUrl: result.secure_url });
            return;
        }
        
        // Handle direct base64 uploads (fallback for backward compatibility)
        if (req.body && req.body.image) {
            const base64Data = req.body.image;
            const isBase64 = /^data:image\/(png|jpeg|jpg|webp);base64,/.test(base64Data);
            if (!isBase64) {
                logger.warn('Invalid image format provided');
                res.status(400).json({ error: 'Invalid image format. Must be PNG, JPEG, JPG, or WEBP.' });
                return;
            }

            logger.debug('Uploading restaurant image to Cloudinary');
            
            const result = await cloudinary.uploader.upload(base64Data, {
                resource_type: 'image',
                folder: 'aroihub/restaurants'
            });

            logger.info('Restaurant image uploaded successfully to Cloudinary');
            res.status(200).json({ url: result.secure_url, imageUrl: result.secure_url });
            return;
        }
        
        logger.warn('No image data provided for restaurant image upload');
        res.status(400).json({ error: 'No image data provided' });
    } catch (err) {
        logger.error('uploadRestaurantImage error:', err);
        res.status(500).json({ error: 'Image upload failed' });
    }
};
