import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, X } from 'lucide-react';
import { cloudinaryService } from '../services/cloudinaryService';
import ImageCropper from '../components/ImageCropper';
import { TextField } from '@mui/material';
import logger from "@/utils/logger.ts";

// Generate a placeholder avatar with initials
const generatePlaceholderAvatar = (initials = '?') => {
    const canvas = document.createElement('canvas');
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    
    if (context) {
        // Background
        context.fillStyle = '#E2E8F0'; // Light gray background
        context.fillRect(0, 0, size, size);
        
        // Text
        context.font = 'bold 80px Arial';
        context.fillStyle = '#64748B'; // Text color
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(initials, size / 2, size / 2);
    }
    
    return canvas.toDataURL('image/png');
};

const Register: React.FC = () => {
    const { register, authState } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [placeholderSrc, setPlaceholderSrc] = useState<string>('');

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone_number: '',
        profile_picture_url: ''
    });
    
    // State for image cropper
    const [showCropper, setShowCropper] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [croppedImage, setCroppedImage] = useState<File | null>(null);
    
    // Initialize placeholder image
    useEffect(() => {
        setPlaceholderSrc(generatePlaceholderAvatar());
    }, []);
    
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [passwordStatus, setPasswordStatus] = useState({
        length: false
    });
    const [isFormValid, setIsFormValid] = useState(false);

    // Validate form fields
    useEffect(() => {
        const { username, email, password, first_name, last_name } = formData;
        const isValid = 
            username.trim() !== '' && 
            email.trim() !== '' && 
            password.trim() !== '' && 
            first_name.trim() !== '' && 
            last_name.trim() !== '' && 
            passwordStatus.length; // Password must be at least 6 characters
        
        setIsFormValid(isValid);
    }, [formData, passwordStatus.length]);

    // Use initials if name is provided
    useEffect(() => {
        if (formData.first_name && !avatarPreview) {
            const initials = formData.first_name.charAt(0).toUpperCase();
            setPlaceholderSrc(generatePlaceholderAvatar(initials));
        }
    }, [formData.first_name, avatarPreview]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      ) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
      
        setFormData({
          ...formData,
          [name]: type === 'checkbox' ? checked : value,
        });
      
        if (name === 'password') {
          validatePassword(value);
        }
    };

    const validatePassword = (password: string) => {
        setPasswordStatus({
            length: password.length >= 6
        });
    };

    const handleAvatarClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('ไฟล์ขนาดใหญ่เกินไป (สูงสุด 5MB)');
            return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            setError('กรุณาอัพโหลดไฟล์รูปภาพเท่านั้น');
            return;
        }

        // Create a data URL from the file for cropping
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageDataUrl = e.target?.result as string;
            setImageToCrop(imageDataUrl);
            setShowCropper(true);
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = async (croppedImageUrl: string) => {
        setShowCropper(false);
        setAvatarPreview(croppedImageUrl);
        
        // Convert the base64 image to a file but don't upload yet
        try {
            const blob = await fetch(croppedImageUrl).then(r => r.blob());
            const file = new File([blob], "cropped-avatar.jpg", { type: "image/jpeg" });
            setCroppedImage(file);
        } catch (e) {
            setError('การประมวลผลรูปภาพล้มเหลว กรุณาลองอีกครั้ง');
            logger.error('Error while proccessing image:', e);
        }
    };

    const cancelCrop = () => {
        setShowCropper(false);
        setImageToCrop(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeAvatar = () => {
        setAvatarPreview(null);
        setCroppedImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            // If we have a cropped image, upload it to Cloudinary before submitting the form
            if (croppedImage) {
                setUploadingAvatar(true);
                const imageUrl = await cloudinaryService.uploadFile(croppedImage);
                if (imageUrl) {
                    formData.profile_picture_url = imageUrl;
                }
                setUploadingAvatar(false);
            }

            // Now register the user with the complete data
            await register(formData);
            navigate('/'); // Redirect to home page after successful registration
        } catch (err) {
            setError(err instanceof Error ? err.message : 'การลงทะเบียนล้มเหลว โปรดลองอีกครั้ง');
        }
    };

    return (
        <div className="flex justify-center py-8 font-kanit">
            <div className="w-full max-w-md px-4">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold">สมัครสมาชิกอร่อยฮับ</h1>
                </div>

                {error && (
                    <div className="alert alert-error alert-dash mb-4">
                        <span>{error}</span>
                    </div>
                )}

                {showCropper && imageToCrop && (
                    <ImageCropper
                        image={imageToCrop}
                        onCropComplete={handleCropComplete}
                        onCancel={cancelCrop}
                        aspectRatio={1}
                    />
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative">
                            <div 
                                className="avatar cursor-pointer" 
                                onClick={handleAvatarClick}
                            >
                                <div className="w-24 h-24 rounded-full bg-gray-200 relative overflow-hidden">
                                    {uploadingAvatar ? (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="loading loading-spinner loading-md text-blue-accent"></span>
                                        </div>
                                    ) : (
                                        <img 
                                            src={avatarPreview || (placeholderSrc || undefined)} 
                                            alt="Profile Avatar" 
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </div>
                            </div>
                            
                            {/* Upload or Remove Button */}
                            {avatarPreview ? (
                                <button 
                                    type="button"
                                    onClick={removeAvatar}
                                    className="absolute -right-1 -bottom-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                                >
                                    <X size={16} />
                                </button>
                            ) : (
                                <button 
                                    type="button"
                                    onClick={handleAvatarClick}
                                    className="absolute -right-1 -bottom-1 bg-blue-accent text-white rounded-full p-1 shadow-md hover:bg-blue-accent-200"
                                >
                                    <Camera size={16} />
                                </button>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                        />
                        <p className="text-xs text-gray-500 mt-2">คลิกเพื่ออัพโหลดรูปโปรไฟล์</p>
                        <p className="text-xs text-gray-500">
                            (รองรับไฟล์รูปภาพขนาดไม่เกิน 5MB เท่านั้น)
                        </p>
                    </div>

                    {/* Username */}
                    <div className="form-control">
                        <TextField
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            label="ชื่อผู้ใช้"
                            variant="outlined"
                            fullWidth
                            required
                            size="small"
                        />
                    </div>

                    {/* First Name */}
                    <div className="form-control">
                        <TextField
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            label="ชื่อจริง"
                            variant="outlined"
                            fullWidth
                            required
                            size="small"
                        />
                    </div>

                    {/* Last Name */}
                    <div className="form-control">
                        <TextField
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            label="นามสกุล"
                            variant="outlined"
                            fullWidth
                            required
                            size="small"
                        />
                    </div>

                    {/* Email */}
                    <div className="form-control">
                        <TextField
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            label="อีเมล"
                            variant="outlined"
                            fullWidth
                            required
                            size="small"
                        />
                    </div>

                    {/* Phone Number (Optional) */}
                    <div className="form-control">
                        <TextField
                            type="tel"
                            name="phone_number"
                            value={formData.phone_number}
                            onChange={handleChange}
                            label="เบอร์โทรศัพท์ (ไม่บังคับ)"
                            variant="outlined"
                            fullWidth
                            size="small"
                        />
                    </div>

                    {/* Password */}
                    <div className="form-control">
                        <TextField
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            label="รหัสผ่าน"
                            variant="outlined"
                            fullWidth
                            required
                            size="small"
                        />
                    </div>

                    {/* Password Requirements */}
                    <div className="space-y-1 text-sm pl-2">
                        <div className="flex items-center">
                            <span className={`w-4 h-4 inline-block mr-2 rounded-full ${passwordStatus.length ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className={passwordStatus.length ? 'text-green-500' : 'text-red-500'}>รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร</span>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="form-control mt-6">
                        <button
                            type="submit"
                            disabled={authState.loading || uploadingAvatar || !isFormValid}
                             className="w-full btn text-white bg-blue-accent border-blue-accent border-1 hover:bg-blue-accent-200 font-semibold rounded-2xl disabled:opacity-70 disabled:cursor-not-allowed auth-button"
                        >
                            {authState.loading ? 'กำลังดำเนินการ...' : 'สมัครสมาชิก'}
                        </button>
                    </div>

                    {/* Login Link */}
                    <div className="text-center mt-4">
                        <p className="text-sm">
                            มีบัญชีอยู่แล้ว?{' '}
                            <Link to="/login" className="text-blue-accent hover:underline">
                                เข้าสู่ระบบ
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;