import db from '../db';
import Review from './review'; // Import MongoDB Review model
import mongoose from 'mongoose';
import logger from '../utils/logger'; // Import our new logger

// Restaurant Interface
export interface Restaurant {
    id?: number;
    name: string;
    address?: string;
    phone_number?: string;
    latitude?: number;
    longitude?: number;
    cuisine_type?: string[];
    website_url?: string;
    menu?: any;
    images?: string[];
    opening_hour?: string;
    closing_hour?: string;
    min_price?: number;
    max_price?: number;
    min_capacity?: number;
    max_capacity?: number;
    created_at?: Date;
    updated_at?: Date;
    
    // Additional properties from joins
    average_rating?: number;
    review_count?: number;
}

// Create new restaurant
export async function createRestaurant(restaurantData: Omit<Restaurant, 'id' | 'created_at' | 'updated_at'>): Promise<Restaurant> {
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
    } = restaurantData;
    
    const query = `
        INSERT INTO restaurants 
        (name, address, phone_number, latitude, longitude, cuisine_type, website_url, menu, images, 
        opening_hour, closing_hour, min_price, max_price, min_capacity, max_capacity, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()) 
        RETURNING *
    `;
    
    const values = [
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
        min_price || 0,
        max_price || 0,
        min_capacity || 0,
        max_capacity || 0
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
}

// Get all restaurants
export async function getAllRestaurants(): Promise<Restaurant[]> {
    const query = 'SELECT * FROM restaurants ORDER BY name';
    const result = await db.query(query);
    return result.rows;
}

// Get all restaurants with review stats
export async function getAllRestaurantsWithReviews(): Promise<Restaurant[]> {
    try {
        // Since the ratings and review counts are already stored in the restaurants table,
        // we'll directly query them from PostgreSQL instead of recalculating from MongoDB
        const query = 'SELECT * FROM restaurants ORDER BY name';
        const restaurantsResult = await db.query(query);
        
        // Ensure that the data is properly formatted with average_rating and review_count fields
        return restaurantsResult.rows.map(restaurant => ({
            ...restaurant,
            // Ensure these fields exist even if they're null in the database
            average_rating: restaurant.average_rating || 0,
            review_count: restaurant.review_count || 0
        }));
    } catch (error) {
        logger.error('Error in getAllRestaurantsWithReviews:', error);
        throw error;
    }
}

// Get popular restaurants (by rating)
export async function getPopularRestaurants(limit: number = 8): Promise<Restaurant[]> {
    try {
        // Get all restaurants with their pre-calculated ratings
        const query = 'SELECT *, average_rating, review_count FROM restaurants';
        const restaurantsResult = await db.query(query);
        const restaurants = restaurantsResult.rows;
        
        // First, include restaurants with reviews
        const restaurantsWithReviews = restaurants
            .filter(restaurant => restaurant.review_count > 0)
            .sort((a, b) => {
                // Sort by average rating (descending)
                if (b.average_rating !== a.average_rating) {
                    return b.average_rating - a.average_rating;
                }
                // If same rating, sort by review count (descending)
                return b.review_count - a.review_count;
            });
        
        // Then, include restaurants without reviews sorted by creation date
        const restaurantsWithoutReviews = restaurants
            .filter(restaurant => !restaurant.review_count || restaurant.review_count === 0)
            .sort((a, b) => 
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            );
        
        // Combine both arrays (prioritizing restaurants with reviews)
        // and slice to get the requested limit
        const popularRestaurants = [...restaurantsWithReviews, ...restaurantsWithoutReviews].slice(0, limit);
        
        return popularRestaurants;
    } catch (error) {
        logger.error('Error in getPopularRestaurants:', error);
        throw error;
    }
}

// Get latest restaurants
export async function getLatestRestaurants(limit: number = 8): Promise<Restaurant[]> {
    try {
        // Get latest restaurants with their pre-calculated ratings from PostgreSQL
        const query = 'SELECT *, average_rating, review_count FROM restaurants ORDER BY created_at DESC LIMIT $1';
        const restaurantsResult = await db.query(query, [limit]);
        const restaurants = restaurantsResult.rows;
        
        // Return restaurants directly, since they already have the rating data
        return restaurants;
    } catch (error) {
        logger.error('Error in getLatestRestaurants:', error);
        throw error;
    }
}

// Get restaurant by ID
export async function getRestaurantById(id: number): Promise<Restaurant | null> {
    try {
        logger.debug(`Getting restaurant details for ID: ${id}`);
        
        // First get the restaurant data from PostgreSQL
        const query = 'SELECT * FROM restaurants WHERE id = $1';
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            logger.debug(`No restaurant found with ID: ${id}`);
            return null;
        }
        
        const restaurant = result.rows[0];
        logger.debug(`Retrieved restaurant: ${restaurant.name} (ID: ${restaurant.id})`);
        
        return restaurant;
    } catch (error) {
        logger.error(`Error in getRestaurantById: ${error}`);
        throw error;
    }
}

// Update restaurant by ID
export async function updateRestaurantById(id: number, restaurantData: Partial<Restaurant>): Promise<Restaurant | null> {
    // Create dynamic query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (restaurantData.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(restaurantData.name);
        paramIndex++;
    }
    
    if (restaurantData.address !== undefined) {
        updates.push(`address = $${paramIndex}`);
        values.push(restaurantData.address);
        paramIndex++;
    }
    
    if (restaurantData.phone_number !== undefined) {
        updates.push(`phone_number = $${paramIndex}`);
        values.push(restaurantData.phone_number);
        paramIndex++;
    }
    
    if (restaurantData.latitude !== undefined) {
        updates.push(`latitude = $${paramIndex}`);
        values.push(restaurantData.latitude);
        paramIndex++;
    }
    
    if (restaurantData.longitude !== undefined) {
        updates.push(`longitude = $${paramIndex}`);
        values.push(restaurantData.longitude);
        paramIndex++;
    }
    
    if (restaurantData.cuisine_type !== undefined) {
        updates.push(`cuisine_type = $${paramIndex}`);
        values.push(restaurantData.cuisine_type);
        paramIndex++;
    }
    
    if (restaurantData.website_url !== undefined) {
        updates.push(`website_url = $${paramIndex}`);
        values.push(restaurantData.website_url);
        paramIndex++;
    }
    
    if (restaurantData.menu !== undefined) {
        updates.push(`menu = $${paramIndex}`);
        values.push(restaurantData.menu);
        paramIndex++;
    }
    
    if (restaurantData.images !== undefined) {
        updates.push(`images = $${paramIndex}`);
        values.push(restaurantData.images);
        paramIndex++;
    }
    
    if (restaurantData.opening_hour !== undefined) {
        updates.push(`opening_hour = $${paramIndex}`);
        values.push(restaurantData.opening_hour);
        paramIndex++;
    }
    
    if (restaurantData.closing_hour !== undefined) {
        updates.push(`closing_hour = $${paramIndex}`);
        values.push(restaurantData.closing_hour);
        paramIndex++;
    }
    
    if (restaurantData.min_price !== undefined) {
        updates.push(`min_price = $${paramIndex}`);
        values.push(restaurantData.min_price);
        paramIndex++;
    }
    
    if (restaurantData.max_price !== undefined) {
        updates.push(`max_price = $${paramIndex}`);
        values.push(restaurantData.max_price);
        paramIndex++;
    }
    
    if (restaurantData.min_capacity !== undefined) {
        updates.push(`min_capacity = $${paramIndex}`);
        values.push(restaurantData.min_capacity);
        paramIndex++;
    }
    
    if (restaurantData.max_capacity !== undefined) {
        updates.push(`max_capacity = $${paramIndex}`);
        values.push(restaurantData.max_capacity);
        paramIndex++;
    }
    
    // Always update the updated_at timestamp
    updates.push(`updated_at = NOW()`);
    
    // If no updates other than timestamp, return current restaurant
    if (updates.length === 1 && updates[0].includes('updated_at')) {
        const currentRestaurant = await getRestaurantById(id);
        return currentRestaurant;
    }
    
    // Add restaurant ID to values array
    values.push(id);
    
    const query = `
        UPDATE restaurants 
        SET ${updates.join(', ')} 
        WHERE id = $${paramIndex} 
        RETURNING *
    `;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
        return null;
    }
    
    return result.rows[0];
}

// Delete restaurant by ID
export async function deleteRestaurantById(id: number): Promise<boolean> {
    const query = 'DELETE FROM restaurants WHERE id = $1';
    const result = await db.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
}