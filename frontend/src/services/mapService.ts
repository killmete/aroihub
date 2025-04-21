import logger from '@/utils/logger';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface MapConfigResponse {
  success: boolean;
  apiKey: string;
  message?: string;
}

export const getMapConfig = async (): Promise<{ apiKey: string }> => {
  try {
    // Get authentication token from localStorage if available
    // This is optional since the endpoint is public
    const token = localStorage.getItem('token');
    
    // Make the request with the authentication token if available
    const response = await axios.get<MapConfigResponse>(`${API_URL}/maps/config`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    if (response.data.success && response.data.apiKey) {
      return { apiKey: response.data.apiKey };
    } else {
      logger.error('Failed to get map configuration:', response.data.message);
      return { apiKey: '' };
    }
  } catch (error) {
    logger.error('Error fetching map configuration:', error);
    return { apiKey: '' };
  }
};