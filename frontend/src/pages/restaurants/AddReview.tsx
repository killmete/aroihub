import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { restaurantService } from '@/services/restaurantService';
import { reviewService } from '@/services/reviewService';
import { Restaurant } from '@/types/restaurant';
import { ArrowLeft, Star, X, Camera, Upload, GripVertical, ImagePlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import RectangleCropper from '@/components/RectangleCropper';
import logger from '../../utils/logger';

interface SortableImageProps {
    id: string;
    url: string;
    onRemove: (id: string) => void;
  }
// Individual Sortable Image component for the review
const SortableImage: React.FC<SortableImageProps> = ({ id, url, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative w-full h-40 ${isDragging ? 'shadow-xl' : ''}`}
    >
      <div className="rounded-lg border overflow-hidden w-full h-full">
        <img src={url} alt="Review" className="w-full h-full object-cover" />
      </div>
      
      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
        <div 
          {...attributes} 
          {...listeners} 
          className="absolute top-2 left-2 bg-white/80 rounded-full p-1.5 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={16} className="text-gray-700" />
        </div>
        
        <button 
          type="button" 
          onClick={() => onRemove(id)}
          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center opacity-70 hover:opacity-100"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

// The main component
const AddReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { authState } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Review form state
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: '',
    images: [] as {file: File, previewUrl: string}[], // Changed to store file and preview URL
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  
  // Image cropping state
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  // Handle dragging and reordering images
  const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: { distance: 5 },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
  );

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) return;

      setLoading(true);
      try {
        if (!id || isNaN(Number(id))) {
          throw new Error('Invalid restaurant ID');
        }

        const data = await restaurantService.getPublicRestaurantById(id);
        setRestaurant(data);

        if (data.opening_hour && data.closing_hour) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();

          const currentTimeInMinutes = currentHour * 60 + currentMinute;

          const [openingHour, openingMinute] = data.opening_hour.substring(0, 5).split(':').map(Number);
          const [closingHour, closingMinute] = data.closing_hour.substring(0, 5).split(':').map(Number);

          const openingTimeInMinutes = openingHour * 60 + openingMinute;
          const closingTimeInMinutes = closingHour * 60 + closingMinute;

          if (closingTimeInMinutes < openingTimeInMinutes) {
            setIsOpen(currentTimeInMinutes >= openingTimeInMinutes || currentTimeInMinutes <= closingTimeInMinutes);
          } else {
            setIsOpen(currentTimeInMinutes >= openingTimeInMinutes && currentTimeInMinutes <= closingTimeInMinutes);
          }
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch restaurant details');
        logger.error('Error fetching restaurant details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id]);

  // If user is not authenticated, redirect to login page
  if (!authState.loading && !authState.isAuthenticated) {
    return <Navigate to="/login" />;
  }


  // Handle star rating selection
  const handleRatingChange = (rating: number) => {
    setReviewData(prev => ({
      ...prev,
      rating: rating
    }));
  };

  // Handle comment text change
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReviewData(prev => ({
      ...prev,
      comment: e.target.value
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = reviewData.images.findIndex(img => img.previewUrl === active.id);
      const newIndex = reviewData.images.findIndex(img => img.previewUrl === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(reviewData.images, oldIndex, newIndex);
        setReviewData(prev => ({
          ...prev,
          images: newOrder
        }));
      }
    }
  };

  // Trigger file input click
  const handleAddImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection for cropping
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size is too large (max 5MB)');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed');
        return;
      }

      setOriginalFile(file);
      const imageUrl = URL.createObjectURL(file);
      setCropperImage(imageUrl);
    }
  };

  // Handle the cropped image (but don't upload)
  const handleCropComplete = async (croppedImageUrl: string) => {
    try {
      const fetchResponse = await fetch(croppedImageUrl);
      const blob = await fetchResponse.blob();

      const file = new File([blob], originalFile?.name || 'cropped-image.jpg', {
        type: 'image/jpeg'
      });
      
      setReviewData(prev => ({
        ...prev,
        images: [...prev.images, {
          file: file,
          previewUrl: croppedImageUrl
        }]
      }));
      
      toast.success('Image added successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process image');
      logger.error('Error processing cropped image:', error);
    } finally {
      setCropperImage(null);
      setOriginalFile(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Cancel cropping
  const handleCropCancel = () => {
    setCropperImage(null);
    setOriginalFile(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove image from the review
  const handleRemoveImage = (previewUrl: string) => {
    setReviewData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.previewUrl !== previewUrl)
    }));
  };

  // Submit the review with image upload
  const handleSubmitReview = async () => {
    if (reviewData.comment.trim().length === 0) {
      toast.error('กรุณาใส่ความคิดเห็นของคุณ');
      return;
    }
    
    if (!id) {
      toast.error('Restaurant ID is missing');
      return;
    }
    
    const restaurantId = parseInt(id);
    if (isNaN(restaurantId)) {
      toast.error('Invalid restaurant ID');
      return;
    }
    
    if (!authState.user?.id) {
      toast.error('You must be logged in to submit a review');
      return;
    }
    
    const userId = parseInt(authState.user.id.toString());
    if (isNaN(userId)) {
      toast.error('Invalid user ID');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // First upload all images if any
      const uploadedImageUrls: string[] = [];
      
      if (reviewData.images.length > 0) {
        // Show toast for image upload
        toast.info(`อัปโหลดรูปภาพ 0/${reviewData.images.length}`);
        
        // Upload each image
        for (let i = 0; i < reviewData.images.length; i++) {
          const imgData = reviewData.images[i];
          try {
            const result = await reviewService.uploadReviewImage(imgData.file);
            if (result.url) {
              uploadedImageUrls.push(result.url);
              // Update progress toast
              toast.info(`อัปโหลดรูปภาพ ${i + 1}/${reviewData.images.length}`);
            }
          } catch (error) {
            logger.error('Error uploading image:', error);
            throw new Error('ไม่สามารถอัพโหลดรูปภาพได้');
          }
        }
      }
      
      const reviewToSubmit = {
        restaurant: restaurantId,
        user: userId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        images: uploadedImageUrls // Use the uploaded image URLs
      };
      
      await reviewService.createReview(reviewToSubmit);
      toast.success('รีวิวถูกส่งเรียบร้อยแล้ว');
      
      navigate(`/restaurants/${id}`);
    } catch (error) {
      logger.error('Error submitting review:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-main-background">
        <div className="loading loading-spinner loading-lg text-orange-400"></div>
        <p className="ml-2">กำลังโหลดข้อมูลร้านอาหาร...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-main-background p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-4 max-w-md w-full">
          <p className="font-bold mb-2">เกิดข้อผิดพลาด</p>
          <p>{error}</p>
        </div>
        <Link to="/" className="text-blue-accent hover:underline mt-4">
          กลับไปยังหน้าหลัก
        </Link>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-main-background p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded-lg mb-4 max-w-md w-full">
          <p className="font-bold mb-2">ไม่พบข้อมูล</p>
          <p>ไม่พบข้อมูลร้านอาหารที่คุณกำลังค้นหา</p>
        </div>
        <Link to="/" className="text-blue-accent hover:underline mt-4">
          กลับไปยังหน้าหลัก
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-main-background min-h-screen font-kanit pb-10">
      {/* Back button */}
      <div className="max-w-5xl mx-auto pt-4 px-4">
        <Link to={`/restaurants/${id}`} className="flex items-center text-gray-600 hover:text-blue-accent mb-4">
          <ArrowLeft className="h-5 w-5 mr-1" />
          <span>กลับไปยังหน้าร้านอาหาร</span>
        </Link>
      </div>
      
      {/* Restaurant Header Container - Enhanced for better mobile experience */}
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Restaurant Image - More prominent with hover effect */}
            <div className="w-full sm:w-32 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
              {restaurant.images && restaurant.images.length > 0 ? (
                <img 
                  src={restaurant.images[0]} 
                  alt={restaurant.name} 
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-400">ไม่มีรูปภาพ</p>
                </div>
              )}
            </div>
            
            {/* Restaurant Info - Better spacing and visual hierarchy */}
            <div className="flex-1">
              {/* Restaurant Name - Improved typography */}
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 line-clamp-2">{restaurant.name}</h1>
              
              {/* Rating & Review Count - Prettier presentation */}
              <div className="flex items-center mb-3">
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-2 py-0.5 rounded flex items-center mr-2">
                  <span className="font-bold">{restaurant.average_rating ? Number(restaurant.average_rating).toFixed(1) : '0.0'}</span>
                  <Star className="pl-1" size={16} fill="white" />
                </div>
                <span className="text-gray-700">
                  <span className="font-medium">{restaurant.review_count}</span> 
                  <span className="text-gray-500"> รีวิว</span>
                </span>
              </div>
              
              {/* Cuisine Types - Enhanced with badges */}
              <div className="mb-3 flex flex-wrap gap-1.5">
                {restaurant?.cuisine_type && restaurant.cuisine_type.length > 0 ? (
                  restaurant.cuisine_type.map((cuisine, idx) => (
                    <span key={idx} className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full border border-blue-100">
                      {cuisine}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm">ไม่ระบุประเภทอาหาร</span>
                )}
              </div>
              
              {/* Opening Status - More visual feedback */}
              {restaurant.opening_hour && restaurant.closing_hour && (
                <div className="flex items-center">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${isOpen ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className={`text-sm font-medium ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
                      {isOpen ? 'เปิดอยู่' : 'ปิดอยู่'}
                    </span>
                    <span className="text-gray-600 text-sm ml-1">
                      {isOpen 
                        ? `จนถึง ${restaurant.closing_hour.substring(0, 5)} น.` 
                        : `จะเปิดในเวลา ${restaurant.opening_hour.substring(0, 5)} น.`
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Form Container */}
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 pb-3 border-b flex items-center">
            <span className="w-1.5 h-6 bg-blue-accent rounded-sm mr-3"></span>
            เขียนรีวิว
          </h2>

          {/* Star Rating Selection */}
          <div className="mb-8 bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-100">
            <p className="text-lg text-center mb-3 font-medium">ให้คะแนนร้านนี้</p>
            <div
                className="flex justify-center"
                onMouseLeave={() => setHoveredRating(null)}
            >
              <div className="flex items-center space-x-1 sm:space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => {
                  const effective = hoveredRating ?? reviewData.rating;
                  const isActive = rating <= effective;

                  return (
                      <button
                          key={rating}
                          type="button"
                          className={`transition-all duration-100 touch-manipulation p-1 sm:p-1.5 ${
                              isActive ? 'transform scale-105 sm:scale-110' : 'opacity-70'
                          }`}
                          onClick={() => handleRatingChange(rating)}
                          onMouseEnter={() => setHoveredRating(rating)}
                          // ← no onMouseLeave here
                          onTouchStart={() => setHoveredRating(rating)}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            handleRatingChange(rating);
                            setHoveredRating(null);
                          }}
                      >
                        <div className={`rounded-full p-1 sm:p-1.5 ${isActive ? 'bg-amber-100' : 'bg-transparent'}`}>
                          <Star
                              size={32}
                              strokeWidth={1.5}
                              className="transition-colors"
                              color={isActive ? '#FFB800' : '#E5E7EB'}
                              fill={isActive ? '#FFB800' : 'transparent'}
                          />
                        </div>
                      </button>
                  );
                })}
              </div>
            </div>
            <div className="text-center mt-2">
              <span className="inline-block bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">
                {reviewData.rating}/5 คะแนน
              </span>
            </div>
          </div>

          
          {/* Comment Textarea - Enhanced with character count and better feedback */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium flex items-center">
                <span className="w-1 h-5 bg-blue-accent rounded-sm mr-2"></span>
                แชร์รายละเอียดประสบการณ์ของคุณ
              </h3>
              <span className={`text-sm px-2 py-1 rounded-full ${
                reviewData.comment.length > 1000 
                  ? 'text-red-500 font-medium bg-red-50' 
                  : reviewData.comment.length > 750 
                    ? 'text-orange-500 bg-orange-50' 
                    : reviewData.comment.length > 0
                      ? 'text-green-600 bg-green-50'
                      : 'text-gray-500'
              }`}>
                {reviewData.comment.length}/1000
              </span>
            </div>
            <div className="relative">
              <textarea 
                placeholder="แชร์ประสบการณ์ที่ดี หรือสิ่งที่ควรปรับปรุงเกี่ยวกับร้านนี้..." 
                className={`w-full p-4 border rounded-lg transition-all duration-200
                  focus:ring-2 focus:outline-none resize-none h-48 text-base shadow-sm
                  ${reviewData.comment.length > 1000 
                    ? 'border-red-300 focus:ring-red-300 focus:border-red-300' 
                    : reviewData.comment.length > 0
                      ? 'border-gray-300 focus:ring-blue-accent focus:border-blue-accent shadow-sm'
                      : 'border-gray-300 focus:ring-blue-accent focus:border-blue-accent'
                  }
                `}
                value={reviewData.comment}
                onChange={handleCommentChange}
                maxLength={1000}
              />
            </div>
            <div className="flex justify-between items-center mt-2 text-sm">
              <div>
                <ul className="text-xs text-blue-600 space-y-1 list-disc pl-4">
                  <li>แชร์ประสบการณ์เกี่ยวกับรสชาติ คุณภาพอาหาร และบรรยากาศร้าน</li>
                  <li>ให้รายละเอียดเมนูที่คุณประทับใจหรือควรปรับปรุง</li>
                  <li>หลีกเลี่ยงคำหยาบหรือข้อความอันไม่เหมาะสม</li>
                </ul>
              </div>
              <div className={`px-3 py-1 rounded-full ${reviewData.comment.length === 0 ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>
                <span className={reviewData.comment.length === 0 ? '' : 'font-medium'}>
                  {reviewData.comment.length === 0 ? 'กรุณาเขียนรีวิว' : 'ขอบคุณสำหรับรีวิว!'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Image Upload Section - Enhanced with better UI/UX for mobile */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium flex items-center">
                <span className="w-1 h-5 bg-blue-accent rounded-sm mr-2"></span>
                เพิ่มรูปภาพ <span className="text-gray-500 text-sm font-normal ml-1">(ไม่บังคับ)</span>
              </h3>
              <span className={`text-sm px-3 py-1 rounded-full ${reviewData.images.length >= 5 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                {reviewData.images.length}/5 รูป
              </span>
            </div>
            
            {/* Hidden file input */}
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
              disabled={reviewData.images.length >= 5 || submitting}
            />
            
            {/* Empty state with visual guidance */}
            {reviewData.images.length === 0 ? (
              <div
                onClick={handleAddImage}
                className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-8 hover:border-blue-accent transition-colors cursor-pointer bg-gray-50 hover:bg-blue-50"
              >
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <Camera className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-base font-medium text-gray-700">คลิกเพื่อเพิ่มรูปภาพ</p>
                <p className="text-sm text-gray-500 mt-1">เลือกรูปอาหาร บรรยากาศร้าน หรือรายละเอียดอื่นๆ</p>
                <p className="text-xs text-gray-400 mt-3">รองรับไฟล์ PNG, JPG, JPEG (สูงสุด 5MB)</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Responsive grid for images with drag and drop */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <SortableContext items={reviewData.images.map(img => img.previewUrl)} strategy={rectSortingStrategy}>
                      {reviewData.images.map((img) => (
                        <SortableImage 
                          key={img.previewUrl}
                          id={img.previewUrl} 
                          url={img.previewUrl} 
                          onRemove={handleRemoveImage} 
                        />
                      ))}
                    </SortableContext>
                    
                    {/* Add more button if less than 5 images */}
                    {reviewData.images.length < 5 && (
                      <div
                        onClick={handleAddImage}
                        className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center h-40 hover:border-blue-accent hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <ImagePlus className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">เพิ่มรูปภาพ</p>
                        <p className="text-xs text-gray-400 mt-1">({5 - reviewData.images.length} รูปที่เหลือ)</p>
                      </div>
                    )}
                  </div>
                </DndContext>
                
                {/* Help text and add more button */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4 pt-4 border-t">
                  <div className="flex items-center text-gray-500 text-sm gap-1.5">
                    <GripVertical size={16} className="text-gray-400" />
                    <p>ลากเพื่อจัดเรียงรูปภาพใหม่</p>
                  </div>
                </div>

                {/* Upload status indication */}
                {submitting && reviewData.images.length > 0 && (
                  <div className="mt-3 bg-blue-50 border border-blue-100 rounded-md p-3 text-sm text-blue-700 flex items-center gap-2 animate-pulse">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <span>กำลังอัปโหลดรูปภาพ ({reviewData.images.length} รูป)...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Submit Review Container - Enhanced styling and mobile responsiveness */}
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-6">
          {/* Review guidelines */}
          <div className="mb-6 border-b pb-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="mt-1 bg-blue-100 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" x2="12" y1="8" y2="12"/>
                  <line x1="12" x2="12.01" y1="16" y2="16"/>
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-1">ข้อควรรู้ก่อนส่งรีวิว</h4>
                <ul className="text-xs text-blue-600 space-y-1 list-disc pl-4">
                  <li>แชร์ประสบการณ์เกี่ยวกับรสชาติ คุณภาพอาหาร และบรรยากาศร้าน</li>
                  <li>ให้รายละเอียดเมนูที่คุณประทับใจหรือควรปรับปรุง</li>
                  <li>หลีกเลี่ยงคำหยาบหรือข้อความอันไม่เหมาะสม</li>
                </ul>
              </div>
            </div>
          </div>
          {/* Review Preview */}
          <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-medium mb-3 text-gray-700">พรีวิวรีวิวของคุณ</h3>
            <div className="flex flex-col">
              <div className="flex items-center mb-1">
                {[1, 2, 3, 4, 5].map(rating => (
                  <Star
                    key={rating}
                    className="mr-1"
                    size={20}
                    fill={rating <= reviewData.rating ? "#FFB800" : "#E5E7EB"}
                    color={rating <= reviewData.rating ? "#FFB800" : "#E5E7EB"}
                  />
                ))}
                <span className="text-sm font-medium text-gray-800 ml-2">{reviewData.rating}/5</span>
              </div>
            
              <div className="text-sm text-gray-700 mb-3 whitespace-pre-line">
                {reviewData.comment || <span className="text-gray-400 italic">ยังไม่ได้เขียนรีวิว</span>}
              </div>
              
              {reviewData.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {reviewData.images.map((img, idx) => (
                    <div key={idx} className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-200">
                      <img src={img.previewUrl} alt={`Review preview ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
            <div className="text-sm text-gray-500 mb-4 sm:mb-0 order-2 sm:order-1 text-center sm:text-left">
              {reviewData.comment.length === 0 ? (
                <div className="flex items-center text-red-500 gap-1 bg-red-50 px-4 py-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" x2="12" y1="8" y2="12" />
                    <line x1="12" x2="12.01" y1="16" y2="16" />
                  </svg>
                  <span>* กรุณาเขียนรีวิวก่อนบันทึก</span>
                </div>
              ) : reviewData.comment.length < 10 ? (
                <div className="flex items-center text-yellow-600 gap-1 bg-yellow-50 px-4 py-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                  <span>รายละเอียดรีวิวน้อยเกินไป</span>
                </div>
              ) : (
                <div className="flex items-center text-green-600 gap-1 bg-green-50 px-4 py-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>รีวิวของคุณพร้อมส่ง</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-4 order-1 sm:order-2">
              <Link
                to={`/restaurants/${id}`}
                className={`flex-1 flex justify-center items-center px-6 sm:px-8 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium ${submitting ? 'opacity-50 pointer-events-none' : ''}`}
              >
                ยกเลิก
              </Link>
              
              <button
                onClick={handleSubmitReview}
                disabled={submitting || reviewData.comment.length === 0}
                className={`flex items-center justify-center px-6 sm:px-8 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all gap-2 ${
                  reviewData.comment.length === 0
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed hover:bg-gray-200'
                    : submitting
                      ? 'bg-blue-400 text-white cursor-wait'
                      : 'bg-blue-accent text-white hover:bg-blue-accent-200 shadow-sm'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    <span>บันทึกรีวิว</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Image Cropper Dialog */}
      {cropperImage && (
        <RectangleCropper
          image={cropperImage}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={16 / 9}
        />
      )}
    </div>
  );
};

export default AddReview;