import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from './routes/adminRoutes';
import restaurantRoutes from './routes/restaurantRoutes';
import reviewRoutes from './routes/reviewRoutes';
import bannerRoutes from './routes/bannerRoutes';
import logRoutes from './routes/logRoutes';
import { connectToMongo } from './db/mongo';
import logger from './utils/logger';
import { corsOptions } from './config/cors';
import helmet from 'helmet';
// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Request logger
app.use((req, res, next) => {
    logger.http(`${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', restaurantRoutes);
app.use('/api', reviewRoutes);
app.use('/api', bannerRoutes);
app.use('/api/logs', logRoutes);

// MongoDB Connection
connectToMongo();

// Health check
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    logger.info(`✅ Server running on port ${PORT} in ${NODE_ENV} mode`);
});
