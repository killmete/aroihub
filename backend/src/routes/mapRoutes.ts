import express from 'express';
import { getMapConfig } from '../controllers/mapController';

const router = express.Router();

// Get Google Maps API configuration
router.get('/config', getMapConfig);

export default router;