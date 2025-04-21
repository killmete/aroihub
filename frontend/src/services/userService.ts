import { User } from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const userService = {
    // In userService.ts updateProfile method
    async updateProfile(userData: Partial<User>): Promise<User> {
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('Authentication required');
        }
        
        // Create a special flag if we're updating username
        const isUpdatingUsername = userData.username !== undefined;
        
        const response = await fetch(`${API_URL}/users/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update profile');
        }

        const updatedUser = await response.json();

        // Update the stored user data
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Make sure to merge all properties, with special attention to username
        const newUserData = { 
            ...currentUser, 
            ...updatedUser.user,
            // Ensure username is explicitly updated if it was changed
            ...(isUpdatingUsername ? { username: updatedUser.user.username } : {})
        };
        
        localStorage.setItem('user', JSON.stringify(newUserData));

        // Force UI refresh for username changes
        if (isUpdatingUsername) {
            // Dispatch an event to trigger UI updates
            window.dispatchEvent(new CustomEvent('userDataChanged', {
                detail: { user: newUserData }
            }));
        }

        return updatedUser.user;
    },

    async uploadProfileImage(file: File): Promise<{ url: string }> {
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('Authentication required');
        }

        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(`${API_URL}/users/profile/image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to upload image');
        }

        return response.json();
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${API_URL}/users/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to change password');
        }

        return response.json();
    },

    // ADMIN USER MANAGEMENT FUNCTIONS
    async getAllUsers(): Promise<User[]> {
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${API_URL}/admin/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch users');
        }

        return response.json();
    },

    async getUserById(userId: number): Promise<User> {
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch user');
        }

        return response.json();
    },

    async updateUser(userId: number, userData: Partial<User>): Promise<User> {
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update user');
        }

        const result = await response.json();

        // Check if the updated user is the currently logged-in user
        // If so, update their data in localStorage
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (currentUser && currentUser.id === userId) {
            // Update the user in localStorage with new details
            localStorage.setItem('user', JSON.stringify(result.user));

            // Dispatch a custom event that listeners can use to update UI
            window.dispatchEvent(new CustomEvent('userDataChanged', {
                detail: { user: result.user }
            }));
        }
        
        return result;
    },

    async deleteUser(userId: number): Promise<void> {
        const token = localStorage.getItem('token');
        
        if (!token) {
            throw new Error('Authentication required');
        }
        
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete user');
        }

        return response.json();
    }
};