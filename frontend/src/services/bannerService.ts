import logger from '../utils/logger';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Banner interface definition
export interface Banner {
    _id: string;  // Changed from 'id' to '_id' to match MongoDB's structure
    image_url: string;
    cloudinary_id?: string;
    is_active: boolean;
    display_order: number;
    created_at?: string;
    updated_at?: string;
}

// API functions for banner operations
export const bannerService = {
    // Get all banners (for admin)
    async getAllBanners(): Promise<Banner[]> {
        const token = localStorage.getItem('token');
        if (!token) {
            logger.warn('Authentication required to fetch all banners');
            throw new Error('Authentication required');
        }

        try {
            const response = await fetch(`${API_URL}/admin/banners`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                let errorMessage = 'Failed to fetch banners';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (parseError) {
                    logger.error('Error parsing error response:', parseError);
                }
                throw new Error(errorMessage);
            }

            const banners = await response.json();
            logger.debug('Fetched all banners (admin):', banners.length);
            return banners;
        } catch (error) {
            logger.error('Error fetching all banners:', error);
            throw error;
        }
    },

    // Get active banners (for public display)
    async getActiveBanners(): Promise<Banner[]> {
        try {
            const response = await fetch(`${API_URL}/banners/active`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                let message = 'Failed to fetch active banners';
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.message) {
                        message = errorData.message;
                    }
                } catch (parseError) {
                    logger.error('Error parsing error response:', parseError);
                }
                throw new Error(message);
            }

            const banners = await response.json();
            logger.debug('Fetched active banners:', banners.length);
            return banners;
        } catch (error) {
            logger.error('Error fetching active banners:', error);
            // Return empty array instead of throwing to avoid breaking the UI
            return [];
        }
    },

    // Create a new banner
    async createBanner(bannerData: Partial<Banner>, imageFile: File): Promise<Banner> {
        const token = localStorage.getItem('token');
        if (!token) {
            logger.warn('Authentication required to create banner');
            throw new Error('Authentication required');
        }

        try {
            // First upload the image
            const imageUrl = await this.uploadBannerImage(imageFile);

            // Then create the banner with the image URL
            logger.debug('Creating new banner');
            const response = await fetch(`${API_URL}/admin/banners`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...bannerData,
                    image_url: imageUrl
                })
            });

            if (!response.ok) {
                let errorMessage = 'Failed to create banner';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (parseError) {
                    logger.error('Error parsing error response:', parseError);
                }
                throw new Error(errorMessage);
            }

            const newBanner = await response.json();
            logger.info('Banner created successfully');
            return newBanner;
        } catch (error) {
            logger.error('Error creating banner:', error);
            throw error;
        }
    },

    // Update an existing banner
    async updateBanner(id: string, bannerData: Partial<Banner>): Promise<Banner> {
        const token = localStorage.getItem('token');
        if (!token) {
            logger.warn('Authentication required to update banner');
            throw new Error('Authentication required');
        }

        try {
            logger.debug(`Updating banner with ID: ${id}`);
            const response = await fetch(`${API_URL}/admin/banners/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bannerData)
            });

            if (!response.ok) {
                let errorMessage = 'Failed to update banner';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (parseError) {
                    logger.error('Error parsing error response:', parseError);
                }
                throw new Error(errorMessage);
            }

            const updatedBanner = await response.json();
            logger.info('Banner updated successfully');
            return updatedBanner;
        } catch (error) {
            logger.error('Error updating banner:', error);
            throw error;
        }
    },

    // Delete a banner
    async deleteBanner(id: string): Promise<void> {
        const token = localStorage.getItem('token');
        if (!token) {
            logger.warn('Authentication required to delete banner');
            throw new Error('Authentication required');
        }

        try {
            logger.debug(`Deleting banner with ID: ${id}`);
            const response = await fetch(`${API_URL}/admin/banners/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                let errorMessage = 'Failed to delete banner';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (parseError) {
                    logger.error('Error parsing error response:', parseError);
                }
                throw new Error(errorMessage);
            }

            logger.info('Banner deleted successfully');
        } catch (error) {
            logger.error('Error deleting banner:', error);
            throw error;
        }
    },

    // Update banner display order
    async updateBannerOrder(bannersWithNewOrder: {_id: string, display_order: number }[]): Promise<Banner[]> {
        const token = localStorage.getItem('token');
        if (!token) {
            logger.warn('Authentication required to update banner order');
            throw new Error('Authentication required');
        }

        try {
            logger.debug(`Updating banner order for ${bannersWithNewOrder.length} banners`);
            const response = await fetch(`${API_URL}/admin/banners/reorder`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ banners: bannersWithNewOrder })
            });

            if (!response.ok) {
                let errorMessage = 'Failed to update banner order';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (parseError) {
                    logger.error('Error parsing error response:', parseError);
                }
                throw new Error(errorMessage);
            }

            const updatedBanners = await response.json();
            logger.info(`Banner order updated for ${updatedBanners.length} banners`);
            return updatedBanners;
        } catch (error) {
            logger.error('Error updating banner order:', error);
            throw error;
        }
    },

    // Toggle banner active status
    async toggleBannerStatus(id: string, isActive: boolean): Promise<Banner> {
        const token = localStorage.getItem('token');
        if (!token) {
            logger.warn('Authentication required to toggle banner status');
            throw new Error('Authentication required');
        }

        try {
            logger.debug(`Toggling banner status to ${isActive ? 'active' : 'inactive'} for ID: ${id}`);
            const response = await fetch(`${API_URL}/admin/banners/${id}/toggle`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: isActive })
            });

            if (!response.ok) {
                let errorMessage = 'Failed to toggle banner status';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (parseError) {
                    logger.error('Error parsing error response:', parseError);
                }
                throw new Error(errorMessage);
            }

            const updatedBanner = await response.json();
            logger.info(`Banner status toggled to ${isActive ? 'active' : 'inactive'}`);
            return updatedBanner;
        } catch (error) {
            logger.error('Error toggling banner status:', error);
            throw error;
        }
    },

    // Upload a banner image
    async uploadBannerImage(file: File): Promise<string> {
        const token = localStorage.getItem('token');
        if (!token) {
            logger.warn('Authentication required to upload banner image');
            throw new Error('Authentication required');
        }

        try {
            logger.debug('Uploading banner image');
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`${API_URL}/admin/banners/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                let errorMessage = 'Failed to upload banner image';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (parseError) {
                    logger.error('Error parsing error response:', parseError);
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            logger.info('Banner image uploaded successfully');
            return result.url || result.imageUrl;
        } catch (error) {
            logger.error('Error uploading banner image:', error);
            throw error;
        }
    }
};