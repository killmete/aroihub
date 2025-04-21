import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { User } from '../../types/auth';
import ImageCropper from '../../components/ImageCropper';
import { PencilLine, Camera, Check, X, User as UserIcon } from 'lucide-react';
import logger from "@/utils/logger.ts";

const ProfilePage: React.FC = () => {
    const { authState, checkForUserUpdates } = useAuth();
    const {
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
    } = useProfile();

    const [formData, setFormData] = useState<Partial<User>>({
        username: authState.user?.username || '',
        email: authState.user?.email || '',
        first_name: authState.user?.first_name || '',
        last_name: authState.user?.last_name || '',
        phone_number: authState.user?.phone_number || '',
        profile_picture_url: authState.user?.profile_picture_url || '',
    });

    // Update form data when user data changes
    useEffect(() => {
        if (authState.user) {
            setFormData({
                username: authState.user.username,
                email: authState.user.email,
                first_name: authState.user.first_name,
                last_name: authState.user.last_name,
                phone_number: authState.user.phone_number || '',
                profile_picture_url: authState.user.profile_picture_url || '',
            });
        }
    }, [authState.user]);

    // Set up polling for user updates
    useEffect(() => {
        // Check for updates immediately when component mounts
        checkForUserUpdates();

        // Set up interval to check for updates
        const interval = setInterval(checkForUserUpdates, 5000);

        // Listen for direct user data changes
        const handleUserDataChanged = (event: CustomEvent<{ user: User }>) => {
            const { user } = event.detail;
            setFormData({
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                phone_number: user.phone_number || '',
                profile_picture_url: user.profile_picture_url || '',
            });
        };

        window.addEventListener('userDataChanged', handleUserDataChanged as EventListener);

        // Cleanup
        return () => {
            clearInterval(interval);
            window.removeEventListener('userDataChanged', handleUserDataChanged as EventListener);
        };
    }, [checkForUserUpdates]);

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [validationError, setValidationError] = useState<string | null>(null);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for image cropper
    const [showCropper, setShowCropper] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData({
            ...passwordData,
            [name]: value
        });
    };

    const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Check file size (limit to 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('ไฟล์ขนาดใหญ่เกินไป (สูงสุด 5MB)');
                return;
            }

            // Check file type
            if (!file.type.startsWith('image/')) {
                alert('กรุณาอัพโหลดไฟล์รูปภาพเท่านั้น');
                return;
            }

            try {
                // Create a data URL from the file for cropping
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imageDataUrl = e.target?.result as string;
                    setImageToCrop(imageDataUrl);
                    setShowCropper(true);
                };
                reader.readAsDataURL(file);
            } catch (error) {
                logger.error('Error handling image:', error);
            }
        }
    };

    const handleCropComplete = async (croppedImageUrl: string) => {
        setShowCropper(false);
        setTempImageUrl(croppedImageUrl);

        try {
            // Convert the base64 image to a file
            const blob = await fetch(croppedImageUrl).then(r => r.blob());
            const file = new File([blob], "cropped-profile.jpg", { type: "image/jpeg" });

            // Store the file in formData to be uploaded on form submit
            setFormData({
                ...formData,
                profile_picture_file: file
            } as any);
        } catch (err) {
            logger.error('Error processing cropped image:', err);
        }
    };

    const cancelCrop = () => {
        setShowCropper(false);
        setImageToCrop(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleImageUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Handle profile picture upload if file is selected
        const updatedData = { ...formData };

        if ((formData as any).profile_picture_file) {
            try {
                setIsUploadingImage(true);
                const uploadedImageUrl = await uploadImage((formData as any).profile_picture_file);
                updatedData.profile_picture_url = uploadedImageUrl;
            } catch (error) {
                logger.error('Error uploading image:', error);
                setIsUploadingImage(false);
                return;
            } finally {
                setIsUploadingImage(false);
            }
        }

        // Remove the file from the data to send to API
        delete (updatedData as any).profile_picture_file;

        // Update profile
        await updateUserProfile(updatedData);
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);
        resetPasswordStatus(); // Clear any previous password errors from server

        // First check if passwords match
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setValidationError('รหัสผ่านใหม่ไม่ตรงกัน');
            return;
        }

        // Then check if new password is same as current password
        if (passwordData.newPassword === passwordData.currentPassword) {
            setValidationError('รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านปัจจุบัน');
            return;
        }

        try {
            await changePassword(passwordData.currentPassword, passwordData.newPassword);
            // Reset password form on success
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
            setIsChangingPassword(false);
        } catch (error) {
            // Error is already handled in context
            // We don't need to do anything here as the error will be shown via passwordError state
        }
    };
    const cancelEdit = () => {
        setIsEditing(false);
        resetStatus();
        setTempImageUrl(null);

        // Reset form data to current user data
        if (authState.user) {
            setFormData({
                username: authState.user.username,
                email: authState.user.email,
                first_name: authState.user.first_name,
                last_name: authState.user.last_name,
                phone_number: authState.user.phone_number || '',
                profile_picture_url: authState.user.profile_picture_url || '',
            });
        }
    };

    const togglePasswordChange = () => {
        setIsChangingPassword(!isChangingPassword);
        if (isChangingPassword) {
            // Reset form and errors when canceling
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
            setValidationError(null);
            resetPasswordStatus();
        } else {
            // Clear any previous errors when opening form
            resetPasswordStatus();
        }
    };

    // Return loading state if user data is not available
    if (!authState.user) {
        return (
            <div className="flex justify-center items-center h-full">
                <span className="loading loading-spinner loading-lg text-blue-accent"></span>
            </div>
        );
    }

    return (
        <div className="max-w-2xl">
            <div className="lg:hidden">
                <h1 className="text-3xl font-bold mb-8 text-blue-accent">โปรไฟล์ของฉัน</h1>
            </div>
            
            {/* Profile Success & Error Alerts */}
            {updateSuccess && (
                <div className="alert alert-success alert-dash mb-4">
                    <Check className="stroke-current shrink-0 h-6 w-6" />
                    <span>อัพเดทข้อมูลสำเร็จ!</span>
                </div>
            )}
            
            {updateError && (
                <div className="alert alert-error alert-dash mb-4">
                    <X className="stroke-current shrink-0 h-6 w-6" />
                    <span>{updateError}</span>
                </div>
            )}
            
            {/* Image Cropper */}
            {showCropper && imageToCrop && (
                <ImageCropper
                    image={imageToCrop}
                    onCropComplete={handleCropComplete}
                    onCancel={cancelCrop}
                    aspectRatio={1}
                />
            )}
            
            <div className="space-y-6">
                {/* Profile Information Form */}
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        {/* Profile Image */}
                        <div className="flex flex-col items-center space-y-3">
                            <div className="relative">
                                {tempImageUrl || formData.profile_picture_url ? (
                                    <img 
                                        src={tempImageUrl || formData.profile_picture_url} 
                                        alt="Profile" 
                                        className="w-32 h-32 rounded-full object-cover border-2 border-blue-accent"
                                    />
                                ) : (
                                    <div className="w-32 h-32 rounded-full border-2 border-blue-accent flex items-center justify-center bg-gray-100">
                                        <UserIcon size={64} className="text-gray-400" />
                                    </div>
                                )}
                                
                                {isUploadingImage && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                                        <span className="loading loading-spinner loading-md text-white"></span>
                                    </div>
                                )}
                                
                                <button
                                    type="button"
                                    onClick={handleImageUploadClick}
                                    className="absolute bottom-0 right-0 btn btn-circle btn-sm btn-primary"
                                    disabled={!isEditing}
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                                
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    className="hidden" 
                                />
                            </div>
                            <span className="text-sm text-gray-500">
                                {isEditing ? 'คลิกที่ไอคอนกล้องเพื่อเปลี่ยนรูป' : ''}
                            </span>
                        </div>
                        
                        {/* Profile Details */}
                        <div className="flex-1 space-y-6 w-full">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-semibold">ข้อมูลส่วนตัว</h2>
                                {!isEditing ? (
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setIsEditing(true);
                                            resetStatus();
                                        }}
                                        className="btn btn-ghost btn-sm"
                                    >
                                        <PencilLine className="w-5 h-5" />
                                        <span className="ml-1">แก้ไข</span>
                                    </button>
                                ) : (
                                    <div className="flex space-x-2">
                                        <button 
                                            type="button" 
                                            onClick={cancelEdit}
                                            className="btn btn-outline btn-sm"
                                        >
                                            <X className="w-4 h-4 mr-1" />
                                            ยกเลิก
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="btn btn-primary bg-blue-accent border-blue-accent btn-sm"
                                        >
                                            <Check className="w-4 h-4 mr-1" />
                                            ยืนยัน
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {/* Username */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium">ชื่อผู้ใช้งาน</span>
                                </label>
                                <input 
                                    type="text" 
                                    name="username"
                                    value={isEditing ? formData.username : authState.user.username}
                                    onChange={handleChange}
                                    className="input input-bordered w-full bg-white border-1 border-black"
                                    disabled={!isEditing}
                                />
                            </div>

                            {/* Email */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium">อีเมล</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={isEditing ? formData.email : authState.user.email}
                                    onChange={handleChange}
                                    className="input input-bordered w-full bg-white border-1 border-black"
                                    disabled={!isEditing}
                                />
                            </div>

                            {/* First Name */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium">ชื่อจริง</span>
                                </label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={isEditing ? formData.first_name : authState.user.first_name}
                                    onChange={handleChange}
                                    className="input input-bordered w-full bg-white border-1 border-black"
                                    disabled={!isEditing}
                                />
                            </div>

                            {/* Last Name */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium">นามสกุล</span>
                                </label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={isEditing ? formData.last_name : authState.user.last_name}
                                    onChange={handleChange}
                                    className="input input-bordered w-full bg-white border-1 border-black"
                                    disabled={!isEditing}
                                />
                            </div>

                            {/* Phone Number */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium">เบอร์โทรศัพท์</span>
                                </label>
                                <input
                                    type="tel"
                                    name="phone_number"
                                    value={isEditing ? formData.phone_number : authState.user.phone_number || '-'}
                                    onChange={handleChange}
                                    className="input input-bordered w-full bg-white border-1 border-black"
                                    disabled={!isEditing}
                                    placeholder="เช่น 08X-XXX-XXXX"
                                />
                            </div>
                        </div>
                    </div>
                </form>

                {/* Password Change Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold">รหัสผ่าน</h2>
                        <button
                            type="button"
                            onClick={togglePasswordChange}
                            className="btn bg-blue-accent border-blue-accent btn-sm"
                        >
                            {isChangingPassword ? 'ยกเลิก' : 'เปลี่ยนรหัสผ่าน'}
                        </button>
                    </div>

                    {/* Password Alerts */}
                    {passwordSuccess && (
                        <div className="alert alert-success alert-dash mb-4">
                            <Check className="stroke-current shrink-0 h-6 w-6" />
                            <span>เปลี่ยนรหัสผ่านสำเร็จ!</span>
                        </div>
                    )}

                    {validationError ? (
                        <div className="alert alert-error alert-dash mb-4">
                            <X className="stroke-current shrink-0 h-6 w-6" />
                            <span>{validationError}</span>
                        </div>
                    ) : passwordError && (
                        <div className="alert alert-error alert-dash mb-4">
                            <X className="stroke-current shrink-0 h-6 w-6" />
                            <span>{passwordError}</span>
                        </div>
                    )}

                    {isChangingPassword && (
                        <form onSubmit={handlePasswordSubmit} className="space-y-4 mt-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium">รหัสผ่านปัจจุบัน</span>
                                </label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    value={passwordData.currentPassword}
                                    onChange={handlePasswordChange}
                                    className="input input-bordered w-full bg-white border-1 border-black"
                                    required
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium">รหัสผ่านใหม่</span>
                                </label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={passwordData.newPassword}
                                    onChange={handlePasswordChange}
                                    className="input input-bordered w-full bg-white border-1 border-black"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium">ยืนยันรหัสผ่านใหม่</span>
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={passwordData.confirmPassword}
                                    onChange={handlePasswordChange}
                                    className="input input-bordered w-full bg-white border-1 border-black"
                                    required
                                />
                            </div>
                            
                            <div className="flex justify-end">
                                <button 
                                    type="submit" 
                                    className="btn bg-blue-accent border-blue-accent"
                                >
                                    บันทึกรหัสผ่านใหม่
                                </button>
                            </div>
                        </form>
                    )}
                    
                    {!isChangingPassword && !passwordSuccess && (
                        <p className="text-gray-600">
                            คุณสามารถเปลี่ยนรหัสผ่านเพื่อเพิ่มความปลอดภัยให้บัญชีของคุณ
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;