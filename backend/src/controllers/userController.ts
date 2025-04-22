import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import {
    updateUserById,
    getUserByEmail,
    getUserByUsername,
    getUserById,
    verifyPassword,
    updatePassword,
    getUserUpdates,
    clearUserUpdates
} from '../models/userModel';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import logger from "../utils/logger";

// Extend Request to include file for multer
interface MulterRequest extends Request {
    file?: Express.Multer.File;
    userId?: number;
}

// Extend Request to include authenticated userId
interface AuthenticatedRequest extends Request {
    userId?: number;
}

dotenv.config();

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dfiywj2ld',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// Update user profile
export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const userId = Number(req.userId);
        if (!userId) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const { username, email, first_name, last_name, phone_number, profile_picture_url } = req.body;

        if (username) {
            const existingUsername = await getUserByUsername(username);
            if (existingUsername && existingUsername.id !== userId) {
                res.status(400).json({ message: 'ยูสเซอร์เนมถูกใช้งานแล้ว!' });
                return;
            }
        }

        if (email) {
            const existingEmail = await getUserByEmail(email);
            if (existingEmail && existingEmail.id !== userId) {
                res.status(400).json({ message: 'อีเมลถูกใช้งานแล้ว!' });
                return;
            }
        }

        const updatedUser = await updateUserById(userId, {
            username,
            email,
            first_name,
            last_name,
            phone_number,
            profile_picture_url
        });

        if (!updatedUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                first_name: updatedUser.first_name,
                last_name: updatedUser.last_name,
                phone_number: updatedUser.phone_number,
                profile_picture_url: updatedUser.profile_picture_url,
                role_id: updatedUser.role_id
            }
        });
    } catch (error) {
        logger.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error while updating profile' });
    }
}

// Upload profile image
export async function uploadProfileImage(req: MulterRequest, res: Response): Promise<void> {
    try {
        const userId = Number(req.userId);
        if (!userId) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        if (!req.file) {
            res.status(400).json({ message: 'No image file provided' });
            return;
        }

        if (!req.file.mimetype.startsWith('image/')) {
            res.status(400).json({ message: 'File must be an image' });
            return;
        }

        const user = await getUserById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (user.profile_picture_url && user.profile_picture_url.includes('cloudinary.com')) {
            try {
                const urlParts = user.profile_picture_url.split('/');
                const publicIdWithFolder = urlParts.slice(-2).join('/');
                const publicId = publicIdWithFolder.split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (deleteError) {
                logger.error('Error deleting old profile picture:', deleteError);
            }
        }

        try {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            const dataURI = `data:${req.file.mimetype};base64,${b64}`;

            const uploadResult = await cloudinary.uploader.upload(dataURI, {
                folder: 'aroihub/avatars',
                resource_type: 'image',
                upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || 'aroihub_avatar'
            });

            res.json({
                message: 'Image uploaded successfully',
                url: uploadResult.secure_url
            });
        } catch (cloudinaryError) {
            logger.error('Cloudinary upload error:', cloudinaryError);
            res.status(500).json({ message: 'Error uploading image to cloud storage' });
        }
    } catch (error) {
        logger.error('Error uploading profile image:', error);
        res.status(500).json({ message: 'Server error while uploading image' });
    }
}

// Upload profile image (public - for registration)
export async function uploadProfileImagePublic(req: MulterRequest, res: Response): Promise<void> {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No image file provided' });
            return;
        }

        if (!req.file.mimetype.startsWith('image/')) {
            res.status(400).json({ message: 'File must be an image' });
            return;
        }

        try {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            const dataURI = `data:${req.file.mimetype};base64,${b64}`;

            const uploadResult = await cloudinary.uploader.upload(dataURI, {
                folder: 'aroihub/avatars',
                resource_type: 'image',
                upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || 'aroihub_avatar'
            });

            res.json({
                message: 'Image uploaded successfully',
                url: uploadResult.secure_url
            });
        } catch (cloudinaryError) {
            logger.error('Cloudinary upload error:', cloudinaryError);
            res.status(500).json({ message: 'Error uploading image to cloud storage' });
        }
    } catch (error) {
        logger.error('Error uploading profile image:', error);
        res.status(500).json({ message: 'Server error while uploading image' });
    }
}

// Change password
export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const userId = Number(req.userId);
        if (!userId) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const { currentPassword, newPassword } = req.body;

        const user = await getUserById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const isPasswordValid = await verifyPassword(currentPassword, user.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({ message: 'รหัสผ่านปัจจุบันผิด!' });
            return;
        }

        const passwordUpdated = await updatePassword(userId, newPassword);
        if (!passwordUpdated) {
            res.status(500).json({ message: 'Failed to update password' });
            return;
        }

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        logger.error('Error changing password:', error);
        res.status(500).json({ message: 'Server error while changing password' });
    }
}

// Check for user updates
export async function checkUserUpdates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const userId = Number(req.userId);
        if (!userId) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const updates = await getUserUpdates(userId);
        if (!updates) {
            res.json({ hasUpdates: false });
            return;
        }

        res.json({
            hasUpdates: true,
            updates
        });
    } catch (error) {
        logger.error('Error checking for user updates:', error);
        res.status(500).json({ message: 'Server error while checking for updates' });
    }
}

// Clear updates
export async function clearUpdates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const userId = Number(req.userId);
        if (!userId) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        await clearUserUpdates(userId);
        res.json({ message: 'Updates cleared successfully' });
    } catch (error) {
        logger.error('Error clearing user updates:', error);
        res.status(500).json({ message: 'Server error while clearing updates' });
    }
}
