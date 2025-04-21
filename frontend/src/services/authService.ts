import { LoginCredentials, RegisterData, AuthResponse, User, AuthState } from '../types/auth';
import logger from '../utils/logger';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const authService = {
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            const errorData = await response.json();
            logger.error('Login failed:', errorData.message || 'Unknown error');
            throw new Error(errorData.message || 'Login failed');
        }

        return response.json();
    },

    async register(userData: RegisterData): Promise<AuthResponse> {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            // Check if we have validation errors
            if (errorData.errors && errorData.errors.length > 0) {
                logger.error('Registration validation error:', errorData.errors[0].msg);
                // Get the first validation error message
                throw new Error(errorData.errors[0].msg || 'สมัครสมาชิกล้มเหลว!');
            }
            logger.error('Registration failed:', errorData.message || 'Unknown error');
            throw new Error(errorData.message || 'สมัครสมาชิกล้มเหลว!');
        }

        return response.json();
    },

    saveAuthState(token: string, user: User) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    },

    clearAuthState() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getAuthState(): Omit<AuthState, 'loading' | 'error'> {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        return {
            token,
            user: userStr && userStr !== 'undefined' ? JSON.parse(userStr) as User : null,
            isAuthenticated: !!token,
        };
    }
};