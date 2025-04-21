import { Request, Response, NextFunction, RequestHandler } from 'express';
import { getUserById } from '../models/userModel';
import logger from "../utils/logger"; // adjust to your path

export const isAdmin: RequestHandler = async (req, res, next) => {
    try {
        const userId = Number((req as any).userId); // or define custom types if you prefer
        if (!userId) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const user = await getUserById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (user.role_id !== 2) {
            res.status(403).json({ message: 'Admin access required' });
            return;
        }

        next();
    } catch (error) {
        logger.error('Error checking admin status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
