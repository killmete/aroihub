import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { restaurantService } from '@/services/restaurantService';
import { reviewService } from '@/services/reviewService';
import { Restaurant } from '@/types/restaurant';
import { Review } from '@/types/review';
import { ArrowLeft, MapPin, Phone, Globe, Star, X, ChevronLeft, ChevronRight, Clock, ThumbsUp } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import GoogleMap from '@/components/GoogleMap';
import logger from '../../utils/logger';

const RestaurantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState<boolean>(false);
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [showGalleryView, setShowGalleryView] = useState<boolean>(false);
  const [galleryIndex, setGalleryIndex] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  // Review-related state
  const { authState: { isAuthenticated, user } } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);

  // Liking functionality
  const [likedReviews, setLikedReviews] = useState<Record<string, boolean>>({});
  const [likeInProgress, setLikeInProgress] = useState<Record<string, boolean>>({});

  // Filter and sorting state
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState<'popular' | 'newest'>('popular');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [visibleReviewCount, setVisibleReviewCount] = useState(3); // Number of reviews initially visible
  
  // Show more reviews function
  const handleShowMoreReviews = () => {
    setVisibleReviewCount(prev => prev + 2); // Increase visible reviews by 2
  };

  // Filtered and sorted reviews
  const filteredAndSortedReviews = useMemo(() => {
    // First filter by star rating if a filter is selected
    let result = [...reviews];
    
    if (starFilter !== null) {
      result = result.filter(review => Math.floor(review.rating) === starFilter);
    }
    
    // Then sort by selected option
    if (sortOption === 'popular') {
      result.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else if (sortOption === 'newest') {
      result.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    }
    
    return result;
  }, [reviews, starFilter, sortOption]);

  // Handle review like toggle
  const handleLikeToggle = async (reviewId: string) => {
    // Don't do anything if there's already a like action in progress for this review
    if (likeInProgress[reviewId] || !isAuthenticated) return;
    
    try {
      setLikeInProgress((prev) => ({ ...prev, [reviewId]: true }));
      
      // Call the API to toggle like status
      const response = await reviewService.toggleReviewLike(reviewId);
      
      // Update the like count in the reviews list
      setReviews(reviews.map(review => {
        if (review.id === reviewId) {
          return { ...review, likes: response.likes };
        }
        return review;
      }));
      
      // Update the liked status for this review
      setLikedReviews((prev) => ({
        ...prev,
        [reviewId]: response.liked,
      }));
      
    } catch (error) {
      logger.error('Error toggling like:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLikeInProgress((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  // Calculate rating distribution for the progress bars
  const ratingDistribution = useMemo(() => {
    type Rating = 1 | 2 | 3 | 4 | 5;
    type Distribution = Record<Rating, number>;
  
    const emptyDistribution: Distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
    if (!reviews || reviews.length === 0) {
      return {
        ...emptyDistribution,
        total: 0,
        percentages: { ...emptyDistribution }
      };
    }
  
    // Count reviews by rating
    const distribution = reviews.reduce((acc: Distribution, review) => {
      const rating = Math.floor(review.rating) as Rating;
      if (rating >= 1 && rating <= 5) {
        acc[rating] = (acc[rating] || 0) + 1;
      }
      return acc;
    }, { ...emptyDistribution });
  
    const total = reviews.length;
  
    // Calculate percentages
    const percentages: Distribution = {
      1: (distribution[1] / total) * 100,
      2: (distribution[2] / total) * 100,
      3: (distribution[3] / total) * 100,
      4: (distribution[4] / total) * 100,
      5: (distribution[5] / total) * 100,
    };
  
    return { ...distribution, total, percentages };
  }, [reviews]);
  
  // Helper function to get price range symbol and description based on min and max prices
  const getPriceRangeDisplay = (minPrice?: number, maxPrice?: number): { symbol: string; description: string } => {
    if (minPrice === undefined || maxPrice === undefined) {
      return { symbol: '', description: 'ไม่ระบุ' };
    }
    
    // Use the same price ranges as in the search page and admin panel
    if (minPrice >= 0 && maxPrice <= 100) {
      return { symbol: '฿', description: 'ต่ำกว่า 100 บาท' };
    } else if (minPrice >= 101 && maxPrice <= 250) {
      return { symbol: '฿฿', description: '101 - 250 บาท' };
    } else if (minPrice >= 251 && maxPrice <= 500) {
      return { symbol: '฿฿฿', description: '251 - 500 บาท' };
    } else if (minPrice >= 501 && maxPrice <= 1000) {
      return { symbol: '฿฿฿฿', description: '501 - 1000 บาท' };
    } else {
      return { symbol: '฿฿฿฿฿', description: 'มากกว่า 1000 บาท' };
    }
  };

  // Check for mobile viewport on mount and on resize
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIsMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIsMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const fetchRestaurant = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Convert string ID from URL to number for API
      const restaurantId = parseInt(id);
      if (isNaN(restaurantId)) {
        logger.error('Invalid restaurant ID');
        throw new Error('Invalid restaurant ID');
      }
      
      const data = await restaurantService.getPublicRestaurantById(restaurantId);
      setRestaurant(data);
      
      // Check if restaurant is currently open
      if (data.opening_hour && data.closing_hour) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Convert current time to minutes since midnight for easier comparison
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        
        // Parse opening and closing hours
        const [openingHour, openingMinute] = data.opening_hour.substring(0, 5).split(':').map(Number);
        const [closingHour, closingMinute] = data.closing_hour.substring(0, 5).split(':').map(Number);
        
        const openingTimeInMinutes = openingHour * 60 + openingMinute;
        const closingTimeInMinutes = closingHour * 60 + closingMinute;
        
        // Handle special case: closing time is before opening time (spans midnight)
        if (closingTimeInMinutes < openingTimeInMinutes) {
          // Restaurant is open if current time is after opening time OR before closing time
          setIsOpen(currentTimeInMinutes >= openingTimeInMinutes || currentTimeInMinutes <= closingTimeInMinutes);
        } else {
          // Normal case: restaurant opens and closes on the same day
          setIsOpen(currentTimeInMinutes >= openingTimeInMinutes && currentTimeInMinutes <= closingTimeInMinutes);
        }
      }
      
      setError(null);
    } catch (err) {
      logger.error('Failed to fetch restaurant details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch restaurant details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant, location]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;

      setLoadingReviews(true);
      try {
        // Convert string ID from URL to number for API
        const restaurantId = parseInt(id);
        if (isNaN(restaurantId)) {
          logger.error("Invalid restaurant ID format");
          setReviews([]);
          return;
        }
        
        const data = await reviewService.getReviewsByRestaurant(restaurantId);
        setReviews(data);
        
        // Initialize the likedReviews state based on the likedBy field in each review
        if (isAuthenticated && user?.id) {
          const userId = user.id;
          const initialLikedState = data.reduce((acc: Record<string, boolean>, review) => {
            // Check if the review has a likedBy array and if it contains the current user's ID
            if (review.likedBy && Array.isArray(review.likedBy)) {
              acc[review.id] = review.likedBy.includes(userId);
            }
            return acc;
          }, {});
          setLikedReviews(initialLikedState);
        }
      } catch (err) {
        logger.error("Error fetching reviews:", err);
        // Set empty reviews array instead of showing an error
        setReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [id, isAuthenticated, user?.id]);

  // Open full size image directly when a thumbnail is clicked
  const openFullImage = (image: string) => {
    setFullImageUrl(image);
    setShowFullImage(true);
  };

  // Open gallery view to show all images
  const openGalleryView = (startIndex: number = 0) => {
    setGalleryIndex(startIndex);
    setShowGalleryView(true);
  };

  // Navigate through images in gallery view
  const navigateGallery = (direction: 'next' | 'prev') => {
    if (!restaurant?.images) return;
    
    if (direction === 'next') {
      setGalleryIndex(prev => (prev + 1) % (restaurant.images?.length ?? 0));
    } else {
      setGalleryIndex(prev => (prev - 1 + (restaurant.images?.length ?? 0)) % (restaurant.images?.length ?? 0));
    }
  };

  // Helper function to render the correct thumbnail gallery based on image count
  const renderThumbnailGallery = () => {
    if (!restaurant?.images || restaurant.images.length <= 1) {
      // No gallery needed for 0-1 images
      return null;
    }

    // Mobile gallery view - horizontal scroll for additional images
    if (isMobile) {
      return (
        <div className="overflow-x-auto pb-2 mt-2">
          <div className="flex gap-2">
            {restaurant.images.slice(1).map((image, index) => (
              <div 
                key={index + 1} 
                className="relative cursor-pointer rounded-lg overflow-hidden h-24 w-24 flex-shrink-0"
                onClick={() => openFullImage(image)}
              >
                <img 
                  src={image} 
                  alt={`${restaurant.name} - photo ${index + 2}`} 
                  className="h-full w-full object-cover"
                />
                {index === (restaurant.images?.slice(1).length || 0) - 1 && (restaurant.images?.length || 0) > 5 && (
                  <div
                    className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold"
                    onClick={(e) => {
                      e.stopPropagation();
                      openGalleryView(5);
                    }}
                  >
                    <span>+{(restaurant.images?.length ?? 0) - 5}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    const imageCount = restaurant.images.length;
    
    switch (imageCount) {
      case 2:
        // One thumbnail image
        return (
          <div className="md:w-[30%] h-full">
            <div 
              className="relative cursor-pointer rounded-lg overflow-hidden h-full"
              onClick={() => {
                const image = restaurant.images?.[1];
                if (image) {
                  openFullImage(image);
                }
              }}
            >
              <img 
                src={restaurant.images[1]} 
                alt={`${restaurant.name} - photo 2`} 
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        );
      
      case 3:
        // Two thumbnails stacked vertically
        return (
          <div className="md:w-[30%] flex flex-col gap-2 h-full">
            {restaurant.images.slice(1).map((image, index) => (
              <div 
                key={index + 1} 
                className="relative cursor-pointer rounded-lg overflow-hidden h-1/2"
                onClick={() => openFullImage(image)}
              >
                <img 
                  src={image} 
                  alt={`${restaurant.name} - photo ${index + 2}`} 
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        );
      
      case 4:
        // First row: 1 image, Second row: 2 images side by side
        return (
          <div className="md:w-[30%] flex flex-col gap-2 h-full">
            <div 
              className="relative cursor-pointer rounded-lg overflow-hidden h-1/2"
              onClick={() => {
                const image = restaurant.images?.[1];
                if (image) {
                  openFullImage(image);
                }
              }}
            >
              <img 
                src={restaurant.images[1]} 
                alt={`${restaurant.name} - photo 2`} 
                className="h-full w-full object-cover"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 h-1/2">
              {restaurant.images.slice(2).map((image, index) => (
                <div 
                  key={index + 2} 
                  className="relative cursor-pointer rounded-lg overflow-hidden h-full"
                  onClick={() => openFullImage(image)}
                >
                  <img 
                    src={image} 
                    alt={`${restaurant.name} - photo ${index + 3}`} 
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        // 5 or more images: 2x2 grid with +X on last one if more than 5 images
        return (
          <div className="md:w-[30%] h-full">
            <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
              {restaurant.images.slice(1, 5).map((image, index) => (
                <div 
                  key={index + 1} 
                  className="relative cursor-pointer rounded-lg overflow-hidden"
                  onClick={() => openFullImage(image)}
                >
                  <img 
                    src={image} 
                    alt={`${restaurant.name} - photo ${index + 2}`} 
                    className="h-full w-full object-cover"
                  />
                  
                  {/* Show +X overlay on the last thumbnail to open full gallery view */}
                  {index === 3 && (restaurant.images?.length ?? 0) > 5 && (
                      <div
                          className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            openGalleryView(5); // Start the gallery view from the 6th image
                          }}
                      >
                        <span>+{(restaurant.images?.length ?? 0) - 5}</span>
                      </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
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
        <Link to="/" className="flex items-center text-gray-600 hover:text-blue-accent mb-4">
          <ArrowLeft className="h-5 w-5 mr-1" />
          <span>กลับไปยังหน้าหลัก</span>
        </Link>
      </div>
      
      <div className="max-w-5xl mx-auto bg-transparent overflow-hidden">
        {/* Image Gallery - Based on the number of images */}
        {restaurant.images && restaurant.images.length > 0 ? (
          <div className="flex flex-col md:flex-row p-4 gap-4 h-auto md:h-[400px]">
            {/* Main Large Image - 100% width if only 1 image, 70% otherwise */}
            <div className={`h-64 md:h-full ${restaurant.images.length > 1 ? 'md:w-[70%]' : 'w-full'}`}>
              <div
                className="w-full h-full rounded-lg overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 relative group"
                onClick={() => {
                  const image = restaurant.images?.[0];
                  if (image) {
                    openFullImage(image);
                  }
                }}
              >
                <img 
                  src={restaurant.images[0]} 
                  alt={restaurant.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center">
                  <span className="text-white text-sm font-medium mb-3 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm">คลิกเพื่อดูรูปภาพ</span>
                </div>
              </div>
            </div>
            
            {/* Thumbnails Gallery - Only shown if more than 1 image */}
            {renderThumbnailGallery()}
          </div>
        ) : (
          <div className="p-4 h-60 md:h-[400px]">
            <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
              <p className="text-gray-500">ไม่มีรูปภาพ</p>
            </div>
          </div>
        )}
        </div>
        {/* Restaurant Details and Info - Main Content Area with improved mobile responsiveness */}
        <div className="max-w-5xl mx-auto mt-4 sm:mt-6 flex flex-col lg:flex-row gap-4 px-4">
          {/* Left column - Restaurant Details - full width on mobile, 70% on desktop */}
          <div className="w-full lg:w-[70%] bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6">
              {/* Restaurant Name and Rating section with right-aligned status pill */}
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1">{restaurant?.name}</h1>
                  
                  {/* Open/closed status pill - positioned on the right */}
                  {restaurant.opening_hour && restaurant.closing_hour && (
                    <div className="flex items-center mt-2 sm:mt-0">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="font-medium text-sm whitespace-nowrap">{isOpen ? 'เปิดอยู่' : 'ปิดอยู่'}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center mt-2">
                  <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-2 py-0.5 rounded flex items-center mr-2">
                    <span className="font-bold">{restaurant.average_rating ? Number(restaurant.average_rating).toFixed(1) : '0.0'}</span>
                    <Star className="pl-1" size={16} fill="white" />
                  </div>
                  <span className="text-gray-700">{restaurant.review_count || 0} <span className="text-gray-500 font-light">รีวิว</span></span>
                </div>
              </div>

              {/* Cuisine Types and Price Range - Improved mobile display */}
              <div className="mb-5 flex flex-wrap items-center gap-2 text-gray-600">
                {restaurant?.cuisine_type && restaurant.cuisine_type.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {restaurant.cuisine_type.map((cuisine, index) => (
                      <span key={index} className="bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-sm">
                        {cuisine}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500">ประเภทอาหาร: <span className="italic">ไม่ระบุ</span></span>
                )}
                
                {(restaurant.min_price || restaurant.max_price) && (
                  <div className="flex items-center">
                    <div className="w-1 h-1 bg-gray-400 rounded-full mx-2 hidden sm:block"></div>
                    <div className="bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-sm">
                      {(() => {
                        const priceRange = getPriceRangeDisplay(restaurant.min_price, restaurant.max_price);
                        return (
                          <span title={priceRange.description}>
                            {priceRange.symbol} <span className="text-xs">{priceRange.description}</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Opening Hours - Enhanced Display */}
              {restaurant.opening_hour && restaurant.closing_hour && (
                <div className="mb-5 flex items-center">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className={`h-4 w-4 ${isOpen ? 'text-green-500' : 'text-red-500'}`} />
                    <div className="flex flex-wrap items-center gap-x-1">
                      <span className="text-sm">เวลาทำการ:</span>
                      <span className="font-medium">
                        {restaurant.opening_hour.substring(0, 5)} - {restaurant.closing_hour.substring(0, 5)} น.
                      </span>
                      {isOpen && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded ml-2">
                          จะปิดในอีก {(() => {
                            const now = new Date();
                            const currentHour = now.getHours();
                            const currentMinute = now.getMinutes();
                            const [closingHour, closingMinute] = restaurant.closing_hour.substring(0, 5).split(':').map(Number);
                            
                            let hoursDiff = closingHour - currentHour;
                            let minutesDiff = closingMinute - currentMinute;
                            
                            if (minutesDiff < 0) {
                              hoursDiff -= 1;
                              minutesDiff += 60;
                            }
                            
                            if (hoursDiff < 0) {
                              // Closing tomorrow
                              hoursDiff += 24;
                            }
                            
                            return hoursDiff > 0 
                              ? `${hoursDiff} ชม. ${minutesDiff} นาที` 
                              : `${minutesDiff} นาที`;
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CTA Buttons - Enhanced and Responsive */}
              <div className="flex flex-wrap gap-2 mt-6 border-t pt-4 font-normal">
                <Link
                  to={isAuthenticated ? `/restaurants/${id}/reviews` : "#"}
                  className={`flex-1 sm:flex-none flex items-center justify-center rounded-md px-3 py-2 gap-x-2 transition-all ${
                    isAuthenticated
                      ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow'
                      : 'bg-blue-400 text-white opacity-50 cursor-not-allowed pointer-events-none'
                  }`}
                  onClick={(e) => {
                    if (!isAuthenticated) {
                      e.preventDefault();
                      toast.error('กรุณาเข้าสู่ระบบก่อนเขียนรีวิว');
                    }
                  }}
                >
                  <Star strokeWidth={2.5} size={18} />
                  <span className="font-medium text-sm sm:text-base">เขียนรีวิว</span>
                </Link>
                
                <button 
                  className="flex-1 sm:flex-none flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 gap-x-2 hover:bg-gray-50 transition-all"
                  onClick={() => {
                    const shareText = `ดูร้าน ${restaurant.name} บน AroiHub`;
                    if (navigator.share) {
                      navigator.share({
                        title: restaurant.name,
                        text: shareText,
                        url: window.location.href,
                      })
                      .then(() => logger.info('Successfully shared restaurant'))
                      .catch((err) => logger.error('Error sharing restaurant:', err));
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('คัดลอกลิงก์แล้ว');
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-share2">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/>
                    <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
                  </svg>
                  <span className="font-medium text-sm sm:text-base">แชร์</span>
                </button>
                
                <button 
                  className="flex-1 sm:flex-none flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 gap-x-2 hover:bg-gray-50 transition-all"
                  onClick={() => {
                    if (restaurant?.phone_number) {
                      window.location.href = `tel:${restaurant.phone_number}`;
                    } else {
                      toast.error('ไม่พบเบอร์โทรศัพท์');
                    }
                  }}
                >
                  <Phone size={18} />
                  <span className="font-medium text-sm sm:text-base">โทร</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right column - Restaurant Info Box - Hide on mobile, show on larger screens */}
          <div className="w-full lg:w-[30%] bg-white rounded-lg shadow-sm overflow-hidden hidden lg:block">
            <div className="p-3">
              {/* Restaurant Hours */}
              <h3 className="text-lg font-semibold mb-1">เวลาเปิดร้าน</h3>
              <div className="mb-6 flex items-center">
                <Clock className="h-5 w-5 text-gray-500 mr-2" />
                {restaurant.opening_hour && restaurant.closing_hour ? (
                  <div>
                    <div className="text-gray-600 text-sm font-normal">
                      ทุกวัน {restaurant.opening_hour.substring(0, 5)} - {restaurant.closing_hour.substring(0, 5)} น.
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-600 font-normal">ไม่ระบุเวลาทำการ</span>
                )}
              </div>

              {/* Price Range */}
              <h3 className="text-lg font-semibold">ช่วงราคา</h3>
              <div className="mb-6">
                {(restaurant.min_price || restaurant.max_price) ? (
                  <div className="text-gray-600">
                    {/* Get the price range display from our helper function */}
                    {(() => {
                      const priceRange = getPriceRangeDisplay(restaurant.min_price, restaurant.max_price);
                      return (
                        <div className="flex flex-col">
                          <span className="text-sm font-normal mt-1">{priceRange.symbol} ({priceRange.description})</span>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <span className="text-gray-600 font-normal">ไม่ระบุ</span>
                )}
              </div>

              {/* Capacity/Seating */}
              {((restaurant.min_capacity ?? 0) > 0 || (restaurant.max_capacity ?? 0) > 0) && (
                <>
                  <h3 className="text-lg font-semibold">จำนวนที่นั่ง</h3>
                  <div className="mb-2">
                    <span className="text-gray-600 text-sm font-normal">
                      {(restaurant.min_capacity ?? 0) > 0 ? restaurant.min_capacity : ''} 
                      {(restaurant.min_capacity ?? 0) > 0 && (restaurant.max_capacity ?? 0) > 0 ? ' - ' : ''} 
                      {(restaurant.max_capacity ?? 0) > 0 ? restaurant.max_capacity : ''} ที่นั่ง
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile Info Box - Only visible on mobile */}
        <div className="max-w-5xl mx-auto mt-4 px-4 lg:hidden">
          <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Hours */}
              <div>
                <h3 className="text-sm font-semibold mb-1 flex items-center">
                  <Clock className="h-4 w-4 text-gray-500 mr-1" />
                  เวลาเปิด
                </h3>
                {restaurant.opening_hour && restaurant.closing_hour ? (
                  <div className="text-gray-600 text-sm">
                    {restaurant.opening_hour.substring(0, 5)} - {restaurant.closing_hour.substring(0, 5)} น.
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm">ไม่ระบุ</span>
                )}
              </div>
              
              {/* Price Range */}
              <div>
                <h3 className="text-sm font-semibold mb-1 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 mr-1">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                  ช่วงราคา
                </h3>
                {(restaurant.min_price || restaurant.max_price) ? (
                  <div className="text-gray-600 text-sm">
                    {(() => {
                      const priceRange = getPriceRangeDisplay(restaurant.min_price, restaurant.max_price);
                      return priceRange.symbol;
                    })()}
                    {(() => {
                      const priceRange = getPriceRangeDisplay(restaurant.min_price, restaurant.max_price);
                      return (
                          <span className="text-xs ml-1">
                            ({priceRange.description})
                          </span>
                      );
                    })()}
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm">ไม่ระบุ</span>
                )}
              </div>
              
              {/* Capacity */}
              {((restaurant.min_capacity ?? 0) > 0 || (restaurant.max_capacity ?? 0) > 0) && (
                <div className="col-span-2">
                  <h3 className="text-sm font-semibold mb-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 mr-1">
                      <path d="M16 12h.01"></path>
                      <path d="M8 12h.01"></path>
                      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
                      <path d="M7 15c1 2 3 3 5 3s4-1 5-3"></path>
                    </svg>
                    จำนวนที่นั่ง
                  </h3>
                  <span className="text-gray-600 text-sm">
                    {(restaurant.min_capacity ?? 0) > 0 ? restaurant.min_capacity : ''} 
                    {(restaurant.min_capacity ?? 0) > 0 && (restaurant.max_capacity ?? 0) > 0 ? ' - ' : ''} 
                    {(restaurant.max_capacity ?? 0) > 0 ? restaurant.max_capacity : ''} ที่นั่ง
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Contact & Location Info in separate container - with better mobile responsiveness */}
        <div className="max-w-5xl mx-auto mt-4 flex flex-col lg:flex-row gap-4 px-4">
          {/* Left column - Contact & Location - full width on mobile, 70% on desktop */}
          <div className="w-full lg:w-[70%] bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6">
              {/* Updated layout with map placeholder and contact info side-by-side */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Left side - Map placeholder */}
                <div className="w-full md:w-[30%]">
                  {restaurant && restaurant.latitude && restaurant.longitude ? (
                    <GoogleMap 
                      latitude={restaurant.latitude} 
                      longitude={restaurant.longitude}
                      restaurantName={restaurant.name}
                      height="192px"
                      zoom={16}
                    />
                  ) : (
                    <div className="bg-gray-200 rounded-lg w-full h-36 sm:h-48 flex items-center justify-center mb-4 md:mb-0">
                      <MapPin className="h-8 w-8 text-gray-400" />
                      <span className="text-gray-500 ml-2">แผนที่จะแสดงที่นี่</span>
                    </div>
                  )}
                </div>

                {/* Right side - Contact info */}
                <div className="w-full md:w-[70%] flex flex-col justify-start">
                  {restaurant?.address && (
                    <div className="mb-2 mr-1 flex flex-col sm:flex-row sm:justify-between sm:items-center">
                      <div className="flex items-center text-gray-700 mb-2 sm:mb-0">
                        {/* Make all icons consistent size */}
                        <div className="w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">
                          <MapPin className="text-gray-500" />
                        </div>
                        <span className="break-words">{restaurant.address}</span>
                      </div>
                      <button className="text-blue-600 bg-blue-200 px-3 py-2 rounded-xl font-medium hover:bg-blue-300 flex items-center gap-1 whitespace-nowrap transition self-start sm:self-center">
                        <span>ดูเส้นทาง</span>
                      </button>
                    </div>
                  )}
                  
                  {restaurant?.phone_number && (
                    <div className="mb-3 pt-2 border-t">
                      <div className="flex items-center text-gray-700">
                        {/* Make all icons consistent size */}
                        <div className="w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">
                          <Phone className="text-gray-500" />
                        </div>
                        <span>{restaurant.phone_number}</span>
                      </div>
                    </div>
                  )}

                  {restaurant?.website_url && (
                    <div className="flex items-center">
                      {/* Make all icons consistent size */}
                      <div className="w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">
                        <Globe className="text-gray-500" />
                      </div>
                      <a
                        href={restaurant.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-accent hover:underline truncate"
                      >
                        {restaurant.website_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Empty div to maintain layout on desktop - hide on mobile */}
          <div className="w-[30%] hidden lg:block"></div>
        </div>
        
        {/* Reviews Container */}
        <div className="max-w-5xl mx-auto mt-4 flex flex-col lg:flex-row gap-4 px-4 mb-8">
          {/* Left column - Reviews - 70% */}
          <div className="w-full lg:w-[70%] bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              {/* Reviews Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="flex items-center">
                  <h2 className="text-xl font-bold mr-3">{restaurant.review_count} รีวิว</h2>
                  <div className="flex items-center">
                    <span className="text-gray-600">({restaurant.review_count} เรตติ้ง)</span>
                  </div>
                </div>
                
                {/* Sorting options dropdown - Enhanced for mobile */}
                <div className="text-sm text-blue-600 relative">
                  <button 
                    className="font-medium flex items-center gap-1 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-md transition-colors"
                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  >
                    <span className="mr-1">เรียงตาม:</span>
                    <span className="font-medium">
                      {sortOption === 'popular' ? 'ยอดนิยม' : 'ล่าสุด'}
                    </span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className={`transition-transform duration-200 ${isFilterMenuOpen ? 'rotate-180' : ''}`}
                    >
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </button>
                  
                  {isFilterMenuOpen && (
                    <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 overflow-hidden">
                      <div className="py-1" role="menu" aria-orientation="vertical">
                        <button
                          className={`flex px-4 py-2 text-sm w-full text-left items-center ${sortOption === 'popular' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                          onClick={() => {
                            setSortOption('popular');
                            setIsFilterMenuOpen(false);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`mr-2 h-4 w-4 ${sortOption === 'popular' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                          </svg>
                          ยอดนิยม
                        </button>
                        <button
                          className={`flex px-4 py-2 text-sm w-full text-left items-center ${sortOption === 'newest' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                          onClick={() => {
                            setSortOption('newest');
                            setIsFilterMenuOpen(false);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`mr-2 h-4 w-4 ${sortOption === 'newest' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          ล่าสุด
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Rating Distribution - Enhanced for mobile */}
              <div className="mb-8 p-4 bg-gray-50 rounded-xl">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Left: Average Score with star visualization */}
                  <div className="flex flex-col items-center">
                    <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col items-center justify-center">
                      <p className="text-3xl font-bold text-gray-800 mb-1">
                        {restaurant.average_rating ? restaurant.average_rating : '0.0'}
                      </p>
                      <div className="flex mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={16}
                            color={i < Math.floor(restaurant.average_rating || 0) ? '#FFC107' : '#E5E7EB'}
                            fill={i < Math.floor(restaurant.average_rating || 0) ? '#FFC107' : '#E5E7EB'}
                          />
                        ))}
                      </div>
                      <p className="text-sm font-normal text-gray-500">จาก {restaurant.review_count} รีวิว</p>
                    </div>
                  </div>

                  {/* Right: Star Progress */}
                  <div className="flex flex-col gap-2 w-full">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <div 
                        key={star} 
                        className="flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors"
                        onClick={() => setStarFilter(starFilter === star ? null : star)}
                      >
                        <div className="flex w-[70px]">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              size={14} 
                              fill={i < star ? "#FFC107" : "#E5E7EB"} 
                              color={i < star ? "#FFC107" : "#E5E7EB"} 
                            />
                          ))}
                        </div>
                        <div className="flex-1 bg-gray-200 h-3 rounded-full mx-2 overflow-hidden">
                          <div
                            className="bg-yellow-400 h-full rounded-full"
                            style={{ 
                              width: `${ratingDistribution.percentages[star as 1 | 2 | 3 | 4 | 5]}%`,
                              transition: "width 0.5s ease-in-out" 
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium min-w-[40px] text-right">
                          {ratingDistribution.percentages[star as 1 | 2 | 3 | 4 | 5].toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Star Filter Pills - Scrollable on mobile */}
              <div className="overflow-x-auto pb-4 mb-4 -mx-2 px-2">
                <div className="flex gap-2 min-w-max">
                  <div 
                    className={`flex items-center px-4 py-2 ${starFilter === null ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'} rounded-full hover:shadow-sm cursor-pointer transition-all`}
                    onClick={() => setStarFilter(null)}
                  >
                    <span className="text-sm font-medium">ทั้งหมด</span>
                  </div>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div 
                      key={rating} 
                      className={`flex items-center px-4 py-2 ${starFilter === rating ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'} rounded-full hover:shadow-sm cursor-pointer transition-all`}
                      onClick={() => setStarFilter(rating)}
                    >
                      <Star size={14} className="mr-1" fill={starFilter === rating ? "white" : "#FFC107"} color={starFilter === rating ? "white" : "#FFC107"} />
                      <span className="text-sm font-medium">{rating}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Review List */}
              <div className="space-y-8">
                {loadingReviews ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="loading loading-spinner text-orange-400"></div>
                    <span className="ml-2">กำลังโหลดรีวิว...</span>
                  </div>
                ) : filteredAndSortedReviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-xl text-center">
                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                        <path d="M7 7h.01" />
                        <path d="M17 7h.01" />
                        <path d="M7 17h.01" />
                        <path d="M17 17h.01" />
                        <path d="M12 12h.01" />
                      </svg>
                    </div>

                    <h3 className="text-xl font-semibold mb-2">ยังไม่มีรีวิว...</h3>
                    <p className="text-gray-500 mb-6 max-w-md">เป็นคนแรกที่แชร์ประสบการณ์ของคุณกับร้านนี้</p>

                    <div className="flex justify-center">
                      <Link
                        to={isAuthenticated ? `/restaurants/${id}/reviews` : "#"}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
                          isAuthenticated
                            ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                        onClick={(e) => {
                          if (!isAuthenticated) {
                            e.preventDefault();
                            toast.error('กรุณาเข้าสู่ระบบก่อนเขียนรีวิว');
                          }
                        }}
                      >
                        <Star className="h-5 w-5" />
                        <span className="font-medium">เขียนรีวิวแรก</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    {filteredAndSortedReviews.slice(0, visibleReviewCount).map((review) => (
                      <div key={review.id} className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 transition-all hover:shadow-md">
                        <div className="flex items-start">
                          <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden mr-4 flex-shrink-0 border border-gray-100">
                            {review.userDetails?.profile_image ? (
                              <img 
                                src={review.userDetails?.profile_image}
                                alt={review.userDetails?.username || 'User'} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500 text-xl font-medium">
                                {(review.userDetails?.username || 'A').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-2">
                              <div>
                                <h3 className="font-bold text-lg">{review.userDetails?.username || 'Anonymous'}</h3>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                  <div className="flex">
                                    {Array(5).fill(0).map((_, i) => (
                                      <Star 
                                        key={i} 
                                        size={16}
                                        color={i < review.rating ? '#FFC107' : '#E5E7EB'}
                                        fill={i < review.rating ? '#FFC107' : '#E5E7EB'}
                                      />
                                    ))}
                                  </div>
                                  <span className="flex items-center">
                                    <span className="inline-block w-1 h-1 bg-gray-300 rounded-full mx-1"></span>
                                    {new Date(review.createdAt || new Date()).toLocaleDateString('th-TH', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Additional actions could go here */}
                            </div>
                            
                            {review.comment && (
                              <p className="mt-3 text-gray-700 text-base leading-relaxed overflow-hidden overflow-wrap-anywhere break-all whitespace-pre-wrap max-w-full">
                                {review.comment}
                              </p>
                            )}
                            
                            {/* Review Images - Enhanced with hover effects */}
                            {review.images && review.images.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-3">
                                {review.images.map((image, idx) => (
                                  <div 
                                    key={idx}
                                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden cursor-pointer relative group border border-gray-200"
                                    onClick={() => openFullImage(image)}
                                  >
                                    <img 
                                      src={image} 
                                      alt={`Review image ${idx + 1}`} 
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                                      <span className="text-white text-xs bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">ดูรูปภาพ</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Review Actions - Improved for better mobile display */}
                            <div className="flex flex-wrap items-start gap-3 mt-4">
                              <button 
                                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full transition-colors ${
                                  likedReviews[review.id] 
                                    ? 'bg-blue-50 text-blue-600 font-medium' 
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                                disabled={likeInProgress[review.id] || !isAuthenticated}
                                onClick={() => handleLikeToggle(review.id)}
                              >
                                <ThumbsUp size={14} className={likedReviews[review.id] ? 'fill-blue-600 text-blue-600' : ''} />
                                <span className="text-sm whitespace-nowrap">{review.likes || 0} ถูกใจ</span>
                              </button>
                              
                              <button className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full text-gray-600 hover:bg-gray-50 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                                <span className="text-sm whitespace-nowrap">{review.comments?.length || 0} คอมเมนต์</span>
                              </button>
                              
                              <div className="flex-1 flex justify-end">
                                <button className="flex items-center gap-1.5 py-1 px-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-50">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="18" cy="5" r="3" />
                                    <circle cx="6" cy="12" r="3" />
                                    <circle cx="18" cy="19" r="3" />
                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                  </svg>
                                  <span className="text-sm md:inline hidden">แชร์</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Load More Button - Enhanced with better styling */}
                    {filteredAndSortedReviews.length > visibleReviewCount && (
                      <div className="text-center mt-8">
                        <button 
                          className="border border-gray-300 rounded-lg px-8 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 mx-auto"
                          onClick={handleShowMoreReviews}
                        >
                          <span className="font-medium">ดูรีวิวเพิ่มเติม</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Empty div to maintain layout - 30% */}
          <div className="w-full lg:w-[30%]"></div>
        </div>
        
      {/* Full Image Dialog - Centered in screen */}
      <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
        <DialogContent
            className="bg-black/95 p-0 m-0 border-none overflow-hidden rounded-lg"
            style={{
              maxWidth: '100vw',
              width: '100%',
              height: 'auto',
              maxHeight: '90vh',
              margin: 0
            }}
        >
          {/* Visually hidden accessible title and description */}
          <DialogTitle className="sr-only">
            รูปภาพร้านอาหาร {restaurant?.name}
          </DialogTitle>
          <DialogDescription className="sr-only">
            รูปภาพแสดงในขนาดเต็มจอ คุณสามารถกดปุ่มปิดที่มุมขวาบนเพื่อกลับไปยังหน้าร้านอาหาร
          </DialogDescription>

          <div className="relative w-full h-full flex items-center justify-center">
            <button
                className="absolute top-4 right-4 bg-black/70 text-white rounded-full p-2.5 hover:bg-black/90 z-10 backdrop-blur-sm"
                onClick={() => setShowFullImage(false)}
                aria-label="Close full image view"
            >
              <X className="h-6 w-6" />
            </button>

            {fullImageUrl && (
                <img
                    src={fullImageUrl}
                    alt="Full view"
                    className="object-contain select-none"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '85vh',
                      width: 'auto',
                      height: 'auto'
                    }}
                    draggable="false"
                />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Gallery View Dialog - To browse all images */}
      <Dialog open={showGalleryView} onOpenChange={setShowGalleryView}>
        <DialogContent
            className="bg-black/95 p-0 m-0 border-none rounded-lg overflow-hidden"
            style={{ width: '95vw', height: '90vh', maxWidth: '1400px' }}
        >
          {/* Title for accessibility & visible heading */}
          <DialogTitle className="sr-only">
            แกลเลอรีร้าน {restaurant?.name}
          </DialogTitle>
          {/* Description for screen readers */}
          <DialogDescription className="sr-only">
            แกลเลอรีรูปภาพทั้งหมดของร้าน {restaurant?.name} คุณสามารถกดปุ่มข้างๆ เพื่อเลื่อนดูรูปถัดไป
          </DialogDescription>

          <div className="p-4 flex justify-between items-center border-b border-gray-800">
            <h2 className="text-white text-lg font-medium">
              รูปภาพทั้งหมด {restaurant?.images ? restaurant.images.length : 0} รูป
            </h2>
            <button
                className="bg-black/60 p-2 rounded-full text-white hover:bg-black/80 backdrop-blur-sm"
                onClick={() => setShowGalleryView(false)}
                aria-label="Close gallery view"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col-reverse md:flex-row h-[calc(90vh-70px)]">
            {/* Thumbnails sidebar */}
            <div className="h-[120px] md:h-full md:w-[180px] flex-shrink-0 bg-black/70 border-t border-gray-800 md:border-t-0 md:border-r overflow-hidden">
              <div className="flex md:flex-col gap-2 p-4 md:p-3 w-full h-full overflow-x-auto md:overflow-y-auto md:overflow-x-hidden scrollbar-thin">
                {restaurant?.images && restaurant.images.map((image, idx) => (
                    <div
                        key={idx}
                        className={`w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] md:w-[80px] md:h-[80px] flex-shrink-0 rounded-md overflow-hidden cursor-pointer transition-all 
                ${idx === galleryIndex ? 'ring-2 ring-blue-500 scale-105' : 'opacity-70 hover:opacity-100'}`}
                        onClick={() => setGalleryIndex(idx)}
                    >
                      <img
                          src={image}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                      />
                    </div>
                ))}
              </div>
            </div>

            {/* Main image */}
            <div className="flex-1 flex items-center justify-center relative h-[calc(90vh-190px)] md:h-auto">
              {restaurant?.images && restaurant.images[galleryIndex] && (
                  <>
                    <img
                        src={restaurant.images[galleryIndex]}
                        alt={`Gallery image ${galleryIndex + 1}`}
                        className="max-h-[60vh] md:max-h-[70vh] max-w-full object-contain select-none"
                        style={{ width: 'auto', height: 'auto' }}
                        draggable="false"
                        onClick={() => {
                          const image = restaurant.images?.[galleryIndex];
                          if (image) {
                            setFullImageUrl(image);
                            setShowGalleryView(false);
                            setShowFullImage(true);
                          }
                        }}
                    />

                    {/* Navigation */}
                    <button
                        className="absolute left-2 sm:left-4 bg-black/60 p-3 rounded-full text-white hover:bg-black/80 backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateGallery('prev');
                        }}
                        aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                    </button>
                    <button
                        className="absolute right-2 sm:right-4 bg-black/60 p-3 rounded-full text-white hover:bg-black/80 backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateGallery('next');
                        }}
                        aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                    </button>
                  </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RestaurantDetail;