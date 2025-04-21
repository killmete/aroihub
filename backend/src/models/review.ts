import mongoose, { Schema, Document } from 'mongoose';

export interface ReviewDocument extends Document {
    user: number; // PostgreSQL user ID (serial int)
    restaurant: number; // PostgreSQL restaurant ID (serial int)
    rating: number;
    comment?: string;
    images: string[];
    likes: number;
    likedBy: number[]; // Array of user IDs who liked the review
    helpful_count: number;
    createdAt: Date;
    updatedAt: Date;
    isDeleted?: boolean;
}

const reviewSchema = new Schema<ReviewDocument>(
    {
        user: {
            type: Number,
            required: true
        },
        restaurant: {
            type: Number,
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            trim: true
        },
        images: {
            type: [String],
            default: []
        },
        likes: {
            type: Number,
            default: 0
        },
        likedBy: {
            type: [Number],
            default: []
        },
        helpful_count: {
            type: Number,
            default: 0
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model<ReviewDocument>('Review', reviewSchema);
