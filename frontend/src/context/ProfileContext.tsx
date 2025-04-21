import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types/auth';
import { userService } from '../services/userService';
import { useAuth } from './AuthContext';
import logger from '../utils/logger';

interface ProfileContextType {
    isEditing: boolean;
    setIsEditing: (isEditing: boolean) => void;
    updateUserProfile: (userData: Partial<User>) => Promise<void>;
    uploadImage: (file: File) => Promise<string>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    tempImageUrl: string | null;
    setTempImageUrl: (url: string | null) => void;
    updateSuccess: boolean;
    updateError: string | null;
    passwordSuccess: boolean;
    passwordError: string | null;
    resetStatus: () => void;
    resetPasswordStatus: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { updateUserData } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);

    const updateUserProfile = async (userData: Partial<User>) => {
        try {
            setUpdateSuccess(false);
            setUpdateError(null);

            const updatedUser = await userService.updateProfile(userData);

            // Update the auth context with the new user data
            updateUserData(updatedUser);
            
            // Reset temp image URL after successful update
            setTempImageUrl(null);

            // Always set success to true when update completes without error
            setUpdateSuccess(true);
            setIsEditing(false);
        } catch (error) {
            logger.error('Failed to update profile:', error);
            setUpdateError(error instanceof Error ? error.message : 'Failed to update profile');
        }
    };

    const uploadImage = async (file: File): Promise<string> => {
        try {
            setUpdateError(null);

            const response = await userService.uploadProfileImage(file);
            return response.url;
        } catch (error) {
            logger.error('Failed to upload image:', error);
            setUpdateError(error instanceof Error ? error.message : 'Failed to upload image');
            throw error;
        }
    };

    const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
        try {
            setPasswordSuccess(false);
            setPasswordError(null);

            await userService.changePassword(currentPassword, newPassword);

            setPasswordSuccess(true);
        } catch (error) {
            // Extract the specific error message from the API response if available
            let errorMessage = 'Failed to change password';
            if (error instanceof Error) {
                errorMessage = error.message;

                // Handle specific error types for password changes
                if (errorMessage.includes('Current password is incorrect')) {
                    errorMessage = 'รหัสผ่านปัจจุบันไม่ถูกต้อง';
                } else if (errorMessage.includes('different from your current password')) {
                    errorMessage = 'รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านปัจจุบัน';
                }
            }

            logger.error('Failed to change password:', error);
            setPasswordError(errorMessage);
            throw error;
        }
    };

    const resetStatus = () => {
        setUpdateSuccess(false);
        setUpdateError(null);
    };

    const resetPasswordStatus = () => {
        setPasswordSuccess(false);
        setPasswordError(null);
    };

    return (
        <ProfileContext.Provider
            value={{
                isEditing,
                setIsEditing,
                updateUserProfile,
                uploadImage,
                changePassword,
                tempImageUrl,
                setTempImageUrl,
                updateSuccess,
                updateError,
                passwordSuccess,
                passwordError,
                resetStatus,
                resetPasswordStatus
            }}
        >
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
};