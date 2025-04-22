import mongoose from 'mongoose';
import logger from '../utils/logger';

export const connectToMongo = async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aroihub_db';

    try {
        logger.info('Connecting to MongoDB...');
        await mongoose.connect(uri);
        logger.info('✅ Connected to MongoDB successfully');
    } catch (error) {
        logger.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }

    // Add event listeners for connection status
    const connection = mongoose.connection;
    
    connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
    });
    
    connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
    });
    
    connection.on('error', (err: Error) => {
        logger.error('MongoDB connection error:', err);
    });
};