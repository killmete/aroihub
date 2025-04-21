import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LoginCredentials, RegisterData, AuthState, User } from '../types/auth';
import { authService } from '../services/authService';
import logger from '../utils/logger';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface AuthContextType {
    authState: AuthState;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (userData: RegisterData) => Promise<void>;
    logout: () => void;
    updateUserData: (userData: User) => void;
    checkForUserUpdates: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: true,
        error: null,
    });

    // Function to check for updates to the current user
    const checkForUserUpdates = async () => {
        try {
            // Skip if no user is logged in
            if (!authState.user || !authState.isAuthenticated || !authState.token) {
                return;
            }

            // Get the token
            const token = authState.token;

            // Call the API to check for updates
            const response = await fetch(`${API_URL}/users/updates`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to check for updates');
            }

            const data = await response.json();

            // If there are updates, apply them
            if (data.hasUpdates && data.updates) {
                // Apply the update to the current user
                const updatedUser = { ...authState.user, ...data.updates };

                // Update localStorage
                localStorage.setItem('user', JSON.stringify(updatedUser));

                // Update the auth state
                setAuthState(prevState => ({
                    ...prevState,
                    user: updatedUser
                }));

                logger.info('User data updated from admin changes');

                // Clear the updates on the server
                await fetch(`${API_URL}/users/updates/clear`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            logger.error('Error checking for user updates:', error);
        }
    };

    useEffect(() => {
        // Check if user is already logged in
        const { token, user, isAuthenticated } = authService.getAuthState();

        setAuthState({
            user,
            token,
            isAuthenticated,
            loading: false,
            error: null,
        });

        // Check for any pending updates for this user when component mounts
        if (user) {
            checkForUserUpdates();
        }

        // Set up interval to periodically check for user updates (every 5 seconds)
        const updateCheckInterval = setInterval(checkForUserUpdates, 5000);

        // Listen for user update events
        const handleUserUpdate = (event: CustomEvent<{userId: number, userData: Partial<User>}>) => {
            const { userId, userData } = event.detail;

            // Only update if this is the currently logged-in user
            if (user && user.id === userId) {
                const updatedUser = { ...user, ...userData };

                // Update localStorage
                localStorage.setItem('user', JSON.stringify(updatedUser));

                // Update auth state
                setAuthState(prevState => ({
                    ...prevState,
                    user: updatedUser
                }));
            }
        };

        // Add event listener
        window.addEventListener('user-updated', handleUserUpdate as EventListener);

        // Also listen for storage events from other tabs/windows
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'user_update' && e.newValue) {
                checkForUserUpdates();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        // Cleanup
        return () => {
            clearInterval(updateCheckInterval);
            window.removeEventListener('user-updated', handleUserUpdate as EventListener);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const login = async (credentials: LoginCredentials) => {
        try {
            setAuthState({ ...authState, loading: true, error: null });

            const response = await authService.login(credentials);

            authService.saveAuthState(response.token, response.user);

            setAuthState({
                user: response.user,
                token: response.token,
                isAuthenticated: true,
                loading: false,
                error: null,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            logger.error('Login failed:', errorMessage);
            setAuthState({
                ...authState,
                loading: false,
                error: errorMessage,
            });
            throw error;
        }
    };

    const register = async (userData: RegisterData) => {
        try {
            setAuthState({ ...authState, loading: true, error: null });

            const response = await authService.register(userData);

            authService.saveAuthState(response.token, response.user);

            setAuthState({
                user: response.user,
                token: response.token,
                isAuthenticated: true,
                loading: false,
                error: null,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'สมัครสมาชิกล้มเหลว!';
            logger.error('Registration failed:', errorMessage);
            setAuthState({
                ...authState,
                loading: false,
                error: errorMessage,
            });
            throw error;
        }
    };

    const logout = () => {
        authService.clearAuthState();
        setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            error: null,
        });
    };

    const updateUserData = (userData: User) => {
        // Update local state
        setAuthState(prevState => ({
            ...prevState,
            user: userData
        }));

        // Update localStorage
        localStorage.setItem('user', JSON.stringify(userData));

        // Dispatch custom event for immediate UI updates
        window.dispatchEvent(new CustomEvent('userDataChanged', {
            detail: { user: userData }
        }));
    };

    return (
        <AuthContext.Provider value={{
            authState,
            login,
            register,
            logout,
            updateUserData,
            checkForUserUpdates
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};