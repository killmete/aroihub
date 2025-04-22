import { Request, Response } from 'express';
import Banner from '../models/bannerModel';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';
import cloudinary from 'cloudinary';
import logger from '../utils/logger';
// Get active banners (public access)
export const getActiveBanners = async (req: Request, res: Response): Promise<void> => {
    try {
        const activeBanners = await Banner.find({ is_active: true }).sort({ display_order: 1 });
        res.status(200).json(activeBanners);
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to fetch active banners', error: error instanceof Error ? error.message : String(error) });
        } else {
            logger.error("Failed to fetch active banners after headers sent:", error);
        }
    }
};

// Get all banners (admin access)
export const getAllBanners = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const banners = await Banner.find().sort({ display_order: 1 });
        res.status(200).json(banners);
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to fetch banners', error: error instanceof Error ? error.message : String(error) });
        } else {
            logger.error("Failed to fetch banners after headers sent:", error);
        }
    }
};


// Create a new banner
export const createBanner = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // Calculate display order
        const highestOrderBanner = await Banner.findOne().sort({ display_order: -1 });
        const newDisplayOrder = highestOrderBanner ? highestOrderBanner.display_order + 1 : 0;
        
        // Create the banner
        const newBanner = new Banner({
            image_url: req.body.image_url,
            is_active: req.body.is_active !== undefined ? req.body.is_active : true,
            display_order: newDisplayOrder
        });
        
        const savedBanner = await newBanner.save();
        res.status(201).json(savedBanner);
    } catch (error) {
        if (!res.headersSent) {
            res.status(400).json({ message: 'Error creating banner', error: error instanceof Error ? error.message : String(error) });
        } else {
            logger.error("Error creating banner after headers sent:", error);
        }
    }
};

// Update an existing banner
export const updateBanner = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updateData = {
            ...req.body,
            updated_at: new Date()
        };
        
        const updatedBanner = await Banner.findByIdAndUpdate(id, updateData, { new: true });
        
        if (!updatedBanner) {
            res.status(404).json({ message: 'Banner not found' });
            return; // Exit function after sending response
        }
        
        res.status(200).json(updatedBanner);
    } catch (error) {
        if (!res.headersSent) {
             res.status(400).json({ message: 'Error updating banner', error: error instanceof Error ? error.message : String(error) });
        } else {
             logger.error("Error updating banner after headers sent:", error);
        }
    }
};

// Delete a banner
export const deleteBanner = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const banner = await Banner.findById(id);
        
        if (!banner) {
            res.status(404).json({ message: 'Banner not found' });
            return; // Exit function
        }
        
        // Extract the public ID from the Cloudinary URL if applicable
        if (banner.image_url.includes('cloudinary')) {
            try {
                const publicIdWithFolder = banner.image_url.substring(banner.image_url.indexOf('banners/'));
                const publicId = publicIdWithFolder.substring(0, publicIdWithFolder.lastIndexOf('.'));
                if (publicId) {
                    await cloudinary.v2.uploader.destroy(publicId);
                }
            } catch (cloudinaryError) {
                logger.error('Cloudinary image deletion failed:', cloudinaryError);
                // Decide if you want to stop the process or just log the error
            }
        }
        
        await Banner.findByIdAndDelete(id);
        res.status(200).json({ message: 'Banner deleted successfully' });
    } catch (error) {
        if (!res.headersSent) {
            res.status(400).json({ message: 'Error deleting banner', error: error instanceof Error ? error.message : String(error) });
        } else {
            logger.error("Error deleting banner after headers sent:", error);
        }
    }
};

// Update banner display orders
export const updateBannerOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { banners } = req.body;
        
        if (!Array.isArray(banners) || banners.length === 0) {
            res.status(400).json({ message: 'Invalid banner order data' });
            return; // Exit function
        }
        
        logger.log('Received banner order data:', banners);
        
        // Update each banner's display_order
        const updatePromises = banners.map(({ _id, display_order }) => {
            // Use the 'id' field from the frontend as '_id' for MongoDB
            return Banner.findByIdAndUpdate(
                _id,  // This is the MongoDB _id
                { display_order },
                { new: true }
            );
        });
        
        const updatedBanners = await Promise.all(updatePromises);
        res.status(200).json(updatedBanners.filter(Boolean)); // Filter out any null results (banners not found)
    } catch (error) {
        logger.error("Error updating banner order:", error);
        if (!res.headersSent) {
            res.status(400).json({ 
                message: 'Error updating banner order', 
                error: error instanceof Error ? error.message : String(error)
            });
        } else {
            logger.error("Error updating banner order after headers sent:", error);
        }
    }
};

// Toggle banner active status
export const toggleBannerStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        
        if (typeof is_active !== 'boolean') {
             res.status(400).json({ message: 'is_active must be a boolean value' });
             return; // Exit function
        }
        
        const updatedBanner = await Banner.findByIdAndUpdate(
            id,
            { is_active, updated_at: new Date() },
            { new: true }
        );
        
        if (!updatedBanner) {
             res.status(404).json({ message: 'Banner not found' });
             return; // Exit function
        }
        
        res.status(200).json(updatedBanner);
    } catch (error) {
       if (!res.headersSent) {
            res.status(400).json({ message: 'Error toggling banner status', error: error instanceof Error ? error.message : String(error) });
       } else {
            logger.error("Error toggling banner status after headers sent:", error);
       }
    }
};

// Upload banner image
export const uploadBannerImage = async (req: Request & { file?: { buffer: Buffer; mimetype: string } }, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No image file provided' });
            return; // Exit function
        }
        
        // Convert buffer to base64 for Cloudinary upload
        const b64 = req.file.buffer.toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        
        // Upload to Cloudinary
        const result = await cloudinary.v2.uploader.upload(dataURI, {
            folder: 'banners',
            // Consider removing fixed transformation if using frontend cropping
            // transformation: [
            //     { width: 1200, height: 400, crop: 'fill' }
            // ]
        });
        
        res.status(200).json({ url: result.secure_url });
    } catch (error) {
        if (!res.headersSent) {
            res.status(400).json({ message: 'Error uploading image', error: error instanceof Error ? error.message : String(error) });
        } else {
            logger.error("Error uploading image after headers sent:", error);
        }
    }
    // No cleanup needed with buffer approach
};