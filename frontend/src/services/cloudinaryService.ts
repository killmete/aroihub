import axios from 'axios';
import logger from '../utils/logger';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Service for handling image uploads to Cloudinary
 */
export const cloudinaryService = {
    /**
     * Upload a file to Cloudinary
     */
    async uploadFile(file: File): Promise<string> {
        try {
            // Create FormData
            const formData = new FormData();
            formData.append('image', file); // Changed from 'file' to 'image' to match backend expectation
            
            logger.debug('Uploading file:', {
                name: file.name,
                size: file.size,
                type: file.type
            });
            
            // Use the backend proxy for Cloudinary upload
            const uploadUrl = `${API_URL}/users/upload-profile-image`;
            logger.debug('Uploading to:', uploadUrl);
            
            // Make the request
            const response = await axios.post(uploadUrl, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            logger.debug('Cloudinary response:', response.data);
            return response.data.url;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                logger.error('Axios error uploading to Cloudinary:');
                logger.error('Status:', error.response.status);
                logger.error('Error data:', error.response.data);
                logger.error('Error message:', error.message);
            } else {
                logger.error('Error uploading image to Cloudinary:', error);
            }
            throw error;
        }
    },
    
    /**
     * Upload a base64 image directly to the server
     */
    async uploadBase64Image(base64Image: string, endpoint: string): Promise<string> {
        try {
            logger.debug('Uploading base64 image to endpoint:', endpoint);
            
            const uploadUrl = `${API_URL}${endpoint}`;
            const response = await axios.post(uploadUrl, 
                { image: base64Image },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
            
            logger.debug('Image upload successful');
            return response.data.imageUrl;
        } catch (error) {
            logger.error('Error uploading base64 image:', error);
            throw error;
        }
    }
};