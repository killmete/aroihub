export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
    phone_number?: string;
    role_id?: number;
    created_at?: string | Date;
    updated_at?: string | Date;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    profile_picture_url?: string;
}

export interface AuthResponse {
    message: string;
    token: string;
    user: User;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
}