import mongoose from 'mongoose';
import logger from '../utils/logger';

export const connectToMongo = async () => {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/aroihub_db';
    const options = {
        serverSelectionTimeoutMS: 5000
    };

    try {
        logger.info('Connecting to MongoDB...');
        await mongoose.connect(uri, options);
        logger.info('✅ Connected to MongoDB successfully');
    } catch (error) {
        logger.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }

    // Add event listeners for connection status
    mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
    });
    
    mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
    });
};