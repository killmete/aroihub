export interface Review {
    id: string;
    user: number;
    restaurant: number;
    rating: number;
    comment?: string;
    images?: string[];
    createdAt?: Date;
    updatedAt?: Date;
    likes?: number;
    likedBy?: number[]; // Array of user IDs who liked this review
    helpful_count?: number;
    isDeleted?: boolean;
    username?: string; // Add username at top level for easier access

    userDetails?: {
      id: number;
      username?: string;
      profile_image?: string;
    };

    restaurant_name?: string;

    // ✅ Add this if your reviews can have comments
    comments?: {
      id: number;
      user_id: number;
      content: string;
      created_at: string;
    }[];
}
