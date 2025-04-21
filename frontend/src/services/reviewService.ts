import { Review } from '../types/review';
import logger from '../utils/logger';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const reviewService = {
    async getAllReviews(): Promise<Review[]> {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');

        try {
            const response = await fetch(`${API_URL}/reviews`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to fetch all reviews:', errorData);
                throw new Error(errorData.message || 'Failed to fetch reviews');
            }

            const reviews = await response.json();
            return this.normalizeReviews(reviews);
        } catch (error) {
            logger.error('Error fetching all reviews:', error);
            throw error;
        }
    },

    async getReviewsByRestaurant(restaurantId: number): Promise<Review[]> {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/restaurants/${restaurantId}/reviews`, {
                method: 'GET',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to fetch reviews by restaurant:', errorData);
                throw new Error(errorData.message || 'Failed to fetch restaurant reviews');
            }

            const reviews = await response.json();
            return this.normalizeReviews(reviews);
        } catch (error) {
            logger.error('Error fetching reviews by restaurant:', error);
            throw error;
        }
    },

    async getReviewsByUser(userId: number): Promise<Review[]> {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');

        try {
            const response = await fetch(`${API_URL}/users/${userId}/reviews`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to fetch reviews by user:', errorData);
                throw new Error(errorData.message || 'Failed to fetch user reviews');
            }

            const reviews = await response.json();
            return this.normalizeReviews(reviews);
        } catch (error) {
            logger.error('Error fetching reviews by user:', error);
            throw error;
        }
    },

    async getMyReviews(): Promise<Review[]> {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');

        try {
            const response = await fetch(`${API_URL}/user/reviews`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to fetch your reviews:', errorData);
                throw new Error(errorData.message || 'Failed to fetch your reviews');
            }

            const reviews = await response.json();
            return this.normalizeReviews(reviews);
        } catch (error) {
            logger.error('Error fetching your reviews:', error);
            throw error;
        }
    },

    async getReviewById(reviewId: string): Promise<Review> {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');

        try {
            const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to fetch review by ID:', errorData);
                throw new Error(errorData.message || 'Failed to fetch review');
            }

            const review = await response.json();
            return this.normalizeReview(review);
        } catch (error) {
            logger.error('Error fetching review by ID:', error);
            throw error;
        }
    },

    async createReview(reviewData: { restaurant: number, user: number, rating: number, comment?: string, images?: string[] }): Promise<Review> {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');

        // Convert parameter names to match backend expectations
        const payload = {
            restaurant_id: reviewData.restaurant,
            user_id: reviewData.user,
            rating: reviewData.rating,
            comment: reviewData.comment || '',
            images: reviewData.images || []
        };

        try {
            const response = await fetch(`${API_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to create review:', errorData);
                throw new Error(errorData.message || 'Failed to create review');
            }

            const result = await response.json();
            return this.normalizeReview(result.review);
        } catch (error) {
            logger.error('Error creating review:', error);
            throw error;
        }
    },

    async updateReview(reviewId: string, reviewData: Partial<Review>): Promise<Review> {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');

        const payload: Record<string, unknown> = {};
        if (reviewData.rating !== undefined) payload.rating = reviewData.rating;
        if (reviewData.comment !== undefined) payload.comment = reviewData.comment;
        if (reviewData.images !== undefined) payload.images = reviewData.images;
        if (reviewData.likes !== undefined) payload.likes = reviewData.likes;
        if (reviewData.helpful_count !== undefined) payload.helpful_count = reviewData.helpful_count;

        try {
            const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to update review:', errorData);
                throw new Error(errorData.message || 'Failed to update review');
            }

            const result = await response.json();
            return this.normalizeReview(result.review);
        } catch (error) {
            logger.error('Error updating review:', error);
            throw error;
        }
    },

    async deleteReview(reviewId: string): Promise<void> {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');

        try {
            const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to delete review:', errorData);
                throw new Error(errorData.message || 'Failed to delete review');
            }
        } catch (error) {
            logger.error('Error deleting review:', error);
            throw error;
        }
    },

    async uploadReviewImage(file: File): Promise<{ url: string }> {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(`${API_URL}/reviews/image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to upload review image:', errorData);
                throw new Error(errorData.message || 'Failed to upload image');
            }

            const result = await response.json();
            return { url: result.imageUrl };
        } catch (error) {
            logger.error('Error uploading review image:', error);
            throw error;
        }
    },

    async getRestaurantRatingStats(restaurantId: number): Promise<{ average_rating: number; review_count: number }> {
        try {
            const response = await fetch(`${API_URL}/restaurants/${restaurantId}/rating`, {
                method: 'GET'
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to fetch restaurant rating stats:', errorData);
                throw new Error(errorData.message || 'Failed to fetch rating statistics');
            }

            return response.json();
        } catch (error) {
            logger.error('Error fetching restaurant rating stats:', error);
            throw error;
        }
    },

    async toggleReviewLike(reviewId: string): Promise<{ liked: boolean; likes: number }> {
        const token = localStorage.getItem('token');
        
        if (!token) {
            logger.error('Authorization token not found when toggling review like');
            throw new Error('Authentication required');
        }
        
        try {
            const response = await fetch(`${API_URL}/reviews/${reviewId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to toggle review like:', errorData);
                throw new Error(errorData.message || 'Failed to toggle like');
            }
            
            return response.json();
        } catch (error) {
            logger.error('Error toggling review like:', error);
            throw error;
        }
    },

    normalizeReview(review: any): Review {
        return {
          id: review._id || review.id,
          user: typeof review.user === 'object' ? review.user.id : Number(review.user),
          restaurant: typeof review.restaurant === 'object' ? review.restaurant.id : Number(review.restaurant),
          rating: review.rating,
          comment: review.comment || '',
          images: review.images || [],
          createdAt: review.createdAt ? new Date(review.createdAt) : new Date(),
          updatedAt: review.updatedAt ? new Date(review.updatedAt) : new Date(),
          likes: review.likes || 0,
          likedBy: review.likedBy || [],
          helpful_count: review.helpful_count || 0,
          isDeleted: review.isDeleted || false,
          username: review.username || '',
          userDetails: review.userDetails || {
            username: review.username || '',
            profile_image: null
          },
          restaurant_name: review.restaurant?.name || review.restaurant_name || ''
        };
    },

    normalizeReviews(reviews: any[]): Review[] {
        return reviews.map(review => this.normalizeReview(review));
    }
};