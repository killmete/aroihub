import logger from '@/utils/logger';

interface GeocodingResponse {
  results: {
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    formatted_address: string;
  }[];
  status: string;
}

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  success: boolean;
  error?: string;
}

export const geocodingService = {
  async geocodeAddress(address: string): Promise<GeocodeResult> {
    try {
      // Get Google Maps API key from the backend
      // Include authentication token if available
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const mapConfigResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/maps/config`, 
        { headers }
      );
      
      if (!mapConfigResponse.ok) {
        logger.error('Failed to get map configuration:', await mapConfigResponse.text());
        return {
          latitude: 0,
          longitude: 0,
          success: false,
          error: `Failed to get map configuration: ${mapConfigResponse.statusText}`
        };
      }
      
      const mapConfig = await mapConfigResponse.json();
      
      if (!mapConfig.success || !mapConfig.apiKey) {
        logger.error('Failed to get Google Maps API key');
        return {
          latitude: 0,
          longitude: 0,
          success: false,
          error: 'Failed to get Google Maps API key'
        };
      }
      
      // Use Google Maps Geocoding API
      const encodedAddress = encodeURIComponent(address);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${mapConfig.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json() as GeocodingResponse;
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: data.results[0].formatted_address,
          success: true
        };
      } else {
        logger.warn(`Geocoding failed with status: ${data.status}`);
        return {
          latitude: 0,
          longitude: 0,
          success: false,
          error: `Geocoding failed: ${data.status}`
        };
      }
    } catch (error) {
      logger.error('Geocoding error:', error);
      return {
        latitude: 0,
        longitude: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to geocode address'
      };
    }
  }
};