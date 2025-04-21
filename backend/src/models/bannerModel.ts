import mongoose, { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
    image_url: string;
    is_active: boolean;
    display_order: number;
    created_at: Date;
    updated_at: Date;
}

const bannerSchema = new Schema({
    image_url: {
        type: String,
        required: [true, 'Banner image URL is required']
    },
    is_active: {
        type: Boolean,
        default: true
    },
    display_order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

export default mongoose.model<IBanner>('Banner', bannerSchema);