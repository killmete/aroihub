import { Request, Response } from 'express';
import logger from '../utils/logger';

/**
 * Get Google Maps API configuration
 * @route GET /api/map/config
 * @access Public
 */
export const getMapConfig = (_req: Request, res: Response): void => {
    try {
      // Get Google Maps API key from environment variables
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        res.status(500).json({
          success: false,
          message: 'Google Maps API key is not configured'
        });
        return;
      }
      
      res.json({
        success: true,
        apiKey
      });
    } catch (error) {
      logger.error('Error retrieving map configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve map configuration'
      });
    }
  };