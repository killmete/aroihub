export interface Restaurant {
    id?: number;
    name: string;
    address?: string;
    phone_number?: string;
    latitude?: number;
    longitude?: number;
    cuisine_type?: string[];
    website_url?: string;
    menu?: unknown;
    images?: string[];
    opening_hour?: string;
    closing_hour?: string;
    min_price?: number;
    max_price?: number;
    min_capacity?: number;
    max_capacity?: number;
    created_at?: Date;
    updated_at?: Date;
    
    // Added properties from backend
    average_rating?: number;
    review_count?: number;
}