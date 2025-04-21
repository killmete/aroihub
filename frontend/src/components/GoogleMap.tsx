import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { getMapConfig } from '../services/mapService';
import logger from '@/utils/logger';

interface GoogleMapProps {
  latitude: number;
  longitude: number;
  restaurantName: string;
  height?: string;
  width?: string;
  zoom?: number;
}

declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
    googleMapsInitialized: boolean;
  }
}

const GoogleMap: React.FC<GoogleMapProps> = ({
  latitude,
  longitude,
  restaurantName,
  height = '400px',
  width = '100%',
  zoom = 16
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      setError('Invalid coordinates provided');
      setLoading(false);
      return;
    }

    // This function will be called when the Google Maps script loads
    const initializeMap = () => {
      if (!mapRef.current || !window.google || !window.google.maps) return;
      
      try {
        const position = { lat: Number(latitude), lng: Number(longitude) };
        
        // Create map instance with simplified options
        const map = new window.google.maps.Map(mapRef.current, {
          center: position,
          zoom: zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            },
            {
              featureType: "transit",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        });
        
        mapInstanceRef.current = map;
        
        // Add marker
        new window.google.maps.Marker({
          position,
          map,
          title: restaurantName,
          animation: window.google.maps.Animation.DROP,
        });
        
        setLoading(false);
      } catch (err) {
        logger.error('Error initializing map:', err);
        setError('Failed to initialize map: ' + (err instanceof Error ? err.message : String(err)));
        setLoading(false);
      }
    };

    const loadGoogleMapsScript = async () => {
      try {
        // Define the callback function first
        window.initMap = () => {
          // Set a small delay to ensure Google Maps is fully loaded
          setTimeout(() => {
            initializeMap();
          }, 100);
        };
        
        // Check if Google Maps is already loaded and ready
        if (window.google && window.google.maps) {
          window.initMap();
          return;
        }

        // If the script is already being loaded, don't load it again
        if (window.googleMapsInitialized) {
          const checkInterval = setInterval(() => {
            if (window.google && window.google.maps) {
              clearInterval(checkInterval);
              window.initMap();
            }
          }, 200);
          return;
        }

        // Mark as initializing
        window.googleMapsInitialized = true;
        
        // Get API key
        const { apiKey } = await getMapConfig();
        
        if (!apiKey) {
          setError('Map API key not available');
          setLoading(false);
          window.googleMapsInitialized = false;
          return;
        }
        
        // Create and add the script element
        const script = document.createElement('script');
        scriptRef.current = script;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
          setError('Failed to load Google Maps API');
          setLoading(false);
          window.googleMapsInitialized = false;
        };
        
        document.head.appendChild(script);
      } catch (err) {
        logger.error('Error loading Google Maps:', err);
        setError('Failed to load map');
        setLoading(false);
        window.googleMapsInitialized = false;
      }
    };

    loadGoogleMapsScript();

    return () => {
      if (scriptRef.current && document.head.contains(scriptRef.current)) {
        document.head.removeChild(scriptRef.current);
      }
      if (mapInstanceRef.current) {
        // Clean up map instance if needed
      }
    };
  }, [latitude, longitude, restaurantName, zoom]);

  if (error) {
    return (
      <Box 
        sx={{ 
          height, 
          width, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: '#f5f5f5',
          border: '1px solid #e0e0e0',
          borderRadius: 1
        }}
      >
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box position="relative" sx={{ height, width }}>
      <Box 
        ref={mapRef} 
        sx={{ 
          height: '100%', 
          width: '100%', 
          borderRadius: 1,
          border: '1px solid #e0e0e0',
        }} 
      />
      
      {loading && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.7)'
          }}
        >
          <CircularProgress size={40} />
        </Box>
      )}
    </Box>
  );
};

export default GoogleMap;