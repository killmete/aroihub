import { Restaurant } from '../types/restaurant';
import { translateCuisines, translateThaiToEnglish } from '../utils/translations';
import logger from '../utils/logger';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to process restaurant data and translate cuisine types
const processRestaurantData = (restaurant: Restaurant): Restaurant => {
    if (restaurant.cuisine_type && Array.isArray(restaurant.cuisine_type)) {
        return {
            ...restaurant,
            cuisine_type: translateCuisines(restaurant.cuisine_type)
        };
    }
    return restaurant;
};

// Helper function to process an array of restaurants
const processRestaurantsData = (restaurants: Restaurant[]): Restaurant[] => {
    return restaurants.map(restaurant => processRestaurantData(restaurant));
};

// Helper function to ensure cuisine types are in English before sending to API
const ensureEnglishCuisines = (restaurantData: Partial<Restaurant>): Partial<Restaurant> => {
    if (restaurantData.cuisine_type && Array.isArray(restaurantData.cuisine_type)) {
        return {
            ...restaurantData,
            cuisine_type: restaurantData.cuisine_type.map(cuisine => translateThaiToEnglish(cuisine))
        };
    }
    return restaurantData;
};

export const restaurantService = {
    // Public API endpoints (no Authentication required)
    async getPublicRestaurants(): Promise<Restaurant[]> {
        try {
            const response = await fetch(`${API_URL}/restaurants`, {
                method: 'GET'
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to fetch restaurants:', errorData);
            }

            const restaurants = await response.json();
            return processRestaurantsData(restaurants);
        } catch (error) {
            logger.error('Restaurant service error:', error);
            throw error;
        }
    },
    
    async searchRestaurants(params: { 
        name?: string,
        cuisine?: string, 
        cuisines?: string[], 
        minPrice?: number, 
        maxPrice?: number,
        minRating?: number,
        cuisineLogic?: 'OR' | 'AND'
    }): Promise<Restaurant[]> {
        try {
            // Build query string from params
            const queryParams = new URLSearchParams();
            
            if (params.name) {
                // Add name search parameter
                queryParams.append('name', params.name);
            }
            
            if (params.cuisine) {
                // Convert single cuisine to English if it's in Thai
                queryParams.append('cuisine', translateThaiToEnglish(params.cuisine));
            }
            
            if (params.cuisines && params.cuisines.length > 0) {
                // Convert array of cuisines to English and join with commas
                // No need to translate again as they're already in their proper case from SearchPage
                queryParams.append('cuisines', params.cuisines.join(','));
                
                // Add cuisine logic if specified and multiple cuisines are selected
                if (params.cuisineLogic && params.cuisines.length > 1) {
                    queryParams.append('cuisineLogic', params.cuisineLogic);
                }
            }
            
            if (params.minPrice !== undefined) {
                queryParams.append('minPrice', params.minPrice.toString());
            }
            
            if (params.maxPrice !== undefined) {
                queryParams.append('maxPrice', params.maxPrice.toString());
            }
            
            if (params.minRating !== undefined) {
                queryParams.append('minRating', params.minRating.toString());
            }
            
            const queryString = queryParams.toString();
            const url = `${API_URL}/restaurants${queryString ? `?${queryString}` : ''}`;
            
            const response = await fetch(url, {
                method: 'GET'
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to search restaurants:', errorData);
            }

            const restaurants = await response.json();
            return processRestaurantsData(restaurants);
        } catch (error) {
            logger.error('Restaurant search error:', error);
            throw error;
        }
    },
    
    async getTopRatedRestaurants(limit = 8): Promise<Restaurant[]> {
        try {
            const response = await fetch(`${API_URL}/restaurants/top-rated?limit=${limit}`, {
                method: 'GET'
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to fetch top rated restaurants:', errorData);
            }

            const restaurants = await response.json();
            return processRestaurantsData(restaurants);
        } catch (error) {
            logger.error('Top rated restaurants fetch error:', error);
            throw error;
        }
    },
    
    async getNewestRestaurants(limit = 8): Promise<Restaurant[]> {
        try {
            const response = await fetch(`${API_URL}/restaurants/newest?limit=${limit}`, {
                method: 'GET'
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to fetch newest restaurants:', errorData);
            }

            const restaurants = await response.json();
            return processRestaurantsData(restaurants);
        } catch (error) {
            logger.error('Newest restaurants fetch error:', error);
            throw error;
        }
    },
    
    async getPublicRestaurantById(restaurantId: string | number): Promise<Restaurant> {
        try {
            const id = restaurantId.toString();
            const timestamp = new Date().getTime();
            const response = await fetch(`${API_URL}/restaurants/${id}?_t=${timestamp}`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                }
            });
        
            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to fetch restaurant by ID:', errorData);
            }
        
            const restaurant = await response.json();
            return processRestaurantData(restaurant);
        } catch (error) {
            logger.error('Restaurant fetch by ID error:', error);
            throw error;
        }
    },

    // Admin API endpoints (Authentication required)
    async getAllRestaurants(): Promise<Restaurant[]> {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                logger.error('Authentication token not found');
            }

            const response = await fetch(`${API_URL}/admin/restaurants`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to fetch all restaurants:', errorData);
            }

            const restaurants = await response.json();
            return processRestaurantsData(restaurants);
        } catch (error) {
            logger.error('All restaurants fetch error:', error);
            throw error;
        }
    },

    // Get restaurant by ID
    async getRestaurantById(restaurantId: number): Promise<Restaurant> {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                logger.error('Authentication token not found');
            }

            const response = await fetch(`${API_URL}/admin/restaurants/${restaurantId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to fetch restaurant by ID:', errorData);
            }

            const restaurant = await response.json();
            return processRestaurantData(restaurant);
        } catch (error) {
            logger.error('Restaurant fetch by ID error:', error);
            throw error;
        }
    },

    // Create new restaurant
    async createRestaurant(restaurantData: Partial<Restaurant>): Promise<Restaurant> {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                logger.error('Authentication token not found');
            }

            // Ensure cuisines are in English before sending to API
            const processedData = ensureEnglishCuisines(restaurantData);

            const response = await fetch(`${API_URL}/admin/restaurants`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(processedData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to create restaurant:', errorData);
            }

            const result = await response.json();
            return result.restaurant;
        } catch (error) {
            logger.error('Restaurant creation error:', error);
            throw error;
        }
    },

    // Update restaurant
    async updateRestaurant(restaurantId: number, restaurantData: Partial<Restaurant>): Promise<Restaurant> {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                logger.error('Authentication token not found');
            }

            // Ensure cuisines are in English before sending to API
            const processedData = ensureEnglishCuisines(restaurantData);

            const response = await fetch(`${API_URL}/admin/restaurants/${restaurantId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(processedData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to update restaurant:', errorData);
            }

            const result = await response.json();
            return result.restaurant;
        } catch (error) {
            logger.error('Restaurant update error:', error);
            throw error;
        }
    },

    // Delete restaurant
    async deleteRestaurant(restaurantId: number): Promise<void> {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                logger.error('Authentication token not found');
            }

            const response = await fetch(`${API_URL}/admin/restaurants/${restaurantId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to delete restaurant:', errorData);
            }
        } catch (error) {
            logger.error('Restaurant deletion error:', error);
            throw error;
        }
    },

    // Upload restaurant image
    async uploadRestaurantImage(file: File): Promise<{ url?: string, imageUrl?: string }> {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                logger.error('Authentication token not found');
            }

            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`${API_URL}/admin/restaurants/image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to upload image:', errorData);
            }

            return response.json();
        } catch (error) {
            logger.error('Image upload error:', error);
            throw error;
        }
    }
};