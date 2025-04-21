import React, { useState, useEffect, useRef } from 'react';
import { Edit, Trash2, Star, StarHalf, ImagePlus, Eye, ChevronDown, ChevronUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { reviewService } from '@/services/reviewService';
import { restaurantService } from '@/services/restaurantService';
import { Review } from '@/types/review';
import { Restaurant } from '@/types/restaurant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import logger from '../../utils/logger';

// Type for sorting options
type SortField = 'restaurant_name' | 'rating' | 'createdAt' | 'likes' | 'helpful_count' | 'username';
type SortDirection = 'asc' | 'desc';

const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [displayedReviews, setDisplayedReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentReview, setCurrentReview] = useState<Review | null>(null);
  const [viewingReview, setViewingReview] = useState<Review | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Review>>({
    rating: 5,
    comment: '',
    images: [],
  });
  
  // Pagination and rows per page state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    field: SortField;
    direction: SortDirection;
  }>({
    field: 'createdAt',
    direction: 'desc'
  });
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    restaurant: 'all',
    rating: 'all',
    searchTerm: '',
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchReviews();
    fetchRestaurants();
  }, []);

  useEffect(() => {
    // Apply filters when reviews or filter options change
    applyFilters();
  }, [reviews, filterOptions]);
  
  useEffect(() => {
    // Apply sorting and pagination when filtered reviews or sorting/pagination options change
    if (filteredReviews.length > 0) {
      const sortedData = sortReviews(filteredReviews);
      setTotalPages(Math.ceil(sortedData.length / rowsPerPage));
      
      // Reset to first page if current page exceeds total pages
      if (currentPage > Math.ceil(sortedData.length / rowsPerPage)) {
        setCurrentPage(1);
      }
      
      const startIndex = (currentPage - 1) * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      setDisplayedReviews(sortedData.slice(startIndex, endIndex));
    } else {
      setDisplayedReviews([]);
      setTotalPages(1);
    }
  }, [filteredReviews, currentPage, rowsPerPage, sortConfig]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await reviewService.getAllReviews();
      setReviews(data);
      setFilteredReviews(data);
      setError(null);
    } catch (err) {
      logger.error('Error fetching reviews:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const data = await restaurantService.getAllRestaurants();
      setRestaurants(data);
    } catch (err) {
      logger.error('Failed to fetch restaurants:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...reviews];
  
    // Filter by restaurant
    if (filterOptions.restaurant !== 'all') {
      const restaurantId = parseInt(filterOptions.restaurant, 10);
      if (!isNaN(restaurantId)) {
        filtered = filtered.filter(review => review.restaurant === restaurantId);
      }
    }
  
    // Filter by rating
    if (filterOptions.rating !== 'all') {
      const rating = parseInt(filterOptions.rating, 10);
      if (!isNaN(rating)) {
        filtered = filtered.filter(review => review.rating === rating);
      }
    }
  
    // Filter by search term
    if (filterOptions.searchTerm) {
      const searchLower = filterOptions.searchTerm.toLowerCase();
      filtered = filtered.filter(review =>
        (review.comment && review.comment.toLowerCase().includes(searchLower)) ||
        (review.userDetails?.username && review.userDetails.username.toLowerCase().includes(searchLower)) ||
        (review.restaurant_name && review.restaurant_name.toLowerCase().includes(searchLower))
      );
    }
  
    setFilteredReviews(filtered);
  };
  
  // Sort reviews based on current sort configuration
  const sortReviews = (data: Review[]): Review[] => {
    return [...data].sort((a, b) => {
      let aValue: string | number | Date = '';
      let bValue: string | number | Date = '';

      switch (sortConfig.field) {
        case 'restaurant_name':
          aValue = a.restaurant_name ?? '';
          bValue = b.restaurant_name ?? '';
          break;
        case 'rating':
          aValue = a.rating ?? 0;
          bValue = b.rating ?? 0;
          break;
        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt) : new Date(0);
          bValue = b.createdAt ? new Date(b.createdAt) : new Date(0);
          break;
        case 'likes':
          aValue = a.likes ?? 0;
          bValue = b.likes ?? 0;
          break;
        case 'helpful_count':
          aValue = a.helpful_count ?? 0;
          bValue = b.helpful_count ?? 0;
          break;
        case 'username':
          aValue = a.userDetails?.username ?? '';
          bValue = b.userDetails?.username ?? '';
          break;
      }

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  // Handle sorting when a column header is clicked
  const handleSort = (field: SortField) => {
    setSortConfig({
      field,
      direction: 
        sortConfig.field === field && sortConfig.direction === 'asc' 
          ? 'desc' 
          : 'asc'
    });
  };
  
  // Get sort icon for column header
  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 ml-1" /> 
      : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const handleViewReview = (review: Review) => {
    setViewingReview(review);
    setIsViewDialogOpen(true);
  };

  const handleEditReview = (review: Review) => {
    setCurrentReview(review);
    setFormData({
      rating: review.rating,
      comment: review.comment || '',
      images: review.images || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (value: string) => {
    setFormData(prev => ({ ...prev, rating: parseInt(value) }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size is too large (max 5MB)');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed');
        return;
      }

      try {
        setUploadingImage(true);
        const result = await reviewService.uploadReviewImage(file);
        
        // Add image URL to the form data
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), result.url]
        }));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to upload image');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveImage = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      images: (prev.images || []).filter(img => img !== imageUrl)
    }));
  };

  const handleUpdateReview = async () => {
    try {
      if (!currentReview || !formData.rating) {
        toast.error('Rating is required');
        return;
      }
      
      // Convert ID to string to ensure MongoDB compatibility
      const reviewId = currentReview.id!.toString();
      
      // Prepare data for update
      const updateData = {
        rating: formData.rating,
        comment: formData.comment,
        images: formData.images
      };
      
      await reviewService.updateReview(reviewId, updateData);
      toast.success('Review updated successfully');
      
      setIsEditDialogOpen(false);
      fetchReviews();
      
      // Show success message
      setSuccessMessage(`Review for "${currentReview.restaurant_name}" was updated successfully.`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (error) {
      logger.error('Update review error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleDeleteReview = async (review: Review) => {
    if (window.confirm(`Are you sure you want to delete this review for "${review.restaurant_name}"?`)) {
      try {
        // Convert ID to string to ensure MongoDB compatibility
        const reviewId = review.id!.toString();
        await reviewService.deleteReview(reviewId);
        toast.success('Review deleted successfully');
        fetchReviews();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete review');
      }
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilterOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  // Handle rows per page change
  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(parseInt(value, 10));
    setCurrentPage(1); // Reset to first page when changing rows per page
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    }
    
    // Add half star if needed
    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    }
    
    // Add empty stars
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }
    
    return stars;
  };

  const formatDate = (dateString?: Date) => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return format(date, 'PPP p'); // Format: May 25, 2020, 6:30 PM
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-6 text-blue-accent">จัดการรีวิว</h2>
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}
      
      <div className="bg-white p-4 md:p-6 rounded-lg shadow">
        <div className="flex flex-col mb-6 gap-4">
          <h3 className="text-xl font-medium">Reviews</h3>
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {/* Search Input */}
            <div className="w-full sm:w-64">
              <Input 
                placeholder="Search reviews..." 
                value={filterOptions.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              />
            </div>
            
            {/* Restaurant Filter */}
            <div className="w-full sm:w-48">
              <Select
                value={filterOptions.restaurant}
                onValueChange={(value) => handleFilterChange('restaurant', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by restaurant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Restaurants</SelectItem>
                  {restaurants.map((restaurant) => (
                    <SelectItem 
                      key={restaurant.id} 
                      value={restaurant.id!.toString()}
                    >
                      {restaurant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Rating Filter */}
            <div className="w-full sm:w-36">
              <Select
                value={filterOptions.rating}
                onValueChange={(value) => handleFilterChange('rating', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Rows Per Page Selection */}
            <div className="w-full sm:w-36">
              <Select
                value={rowsPerPage.toString()}
                onValueChange={handleRowsPerPageChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Rows per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="loading loading-spinner loading-lg text-blue-accent"></div>
            <p className="mt-2">Loading reviews...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>Error: {error}</p>
            <Button onClick={fetchReviews} variant="outline" className="mt-2">
              Try Again
            </Button>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">No reviews found.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th 
                      className="px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer"
                      onClick={() => handleSort('restaurant_name')}
                    >
                      <div className="flex items-center">
                        Restaurant {getSortIcon('restaurant_name')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer"
                      onClick={() => handleSort('username')}
                    >
                      <div className="flex items-center">
                        User {getSortIcon('username')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer"
                      onClick={() => handleSort('rating')}
                    >
                      <div className="flex items-center">
                        Rating {getSortIcon('rating')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500">Comment</th>
                    <th 
                      className="px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center">
                        Created {getSortIcon('createdAt')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500">Images</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayedReviews.map((review) => (
                    <tr key={review.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{review.restaurant_name}</td>
                      <td className="px-4 py-3 text-sm">{review.userDetails?.username}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          {renderStars(review.rating)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="max-w-xs truncate">
                          {review.comment || '(No comment)'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(review.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {(review.images && review.images.length > 0) ? (
                          <span className="text-blue-500">{review.images.length} image(s)</span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewReview(review)}
                            className="text-blue-600"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditReview(review)}
                            className="text-amber-600"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteReview(review)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {displayedReviews.map((review) => (
                <div key={review.id} className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{review.restaurant_name}</h4>
                      <div className="text-gray-600 text-sm">{review.userDetails?.username}</div>
                    </div>
                    <div className="flex items-center">{renderStars(review.rating)}</div>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm line-clamp-2">{review.comment || '(No comment)'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                    <div>
                      <span className="font-medium">Date: </span>
                      {formatDate(review.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Images: </span>
                      {(review.images && review.images.length > 0) ? (
                        <span className="text-blue-500">{review.images.length}</span>
                      ) : (
                        <span>None</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewReview(review)}
                      className="text-blue-600"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      <span>View</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditReview(review)}
                      className="text-amber-600"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      <span>Edit</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteReview(review)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 gap-4 px-2">
              <div className="text-sm text-gray-500">
                Showing {displayedReviews.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} 
                - {Math.min(currentPage * rowsPerPage, filteredReviews.length)} 
                {" "}of {filteredReviews.length} reviews
              </div>
              
              <div className="flex items-center justify-center sm:justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="hidden sm:flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else {
                      if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                    }

                    return (
                      <Button
                        key={i}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <div className="sm:hidden">
                  <span className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* View Review Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl font-bold text-blue-accent">Review Details</DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              {viewingReview
                ? <>Review for <span className="font-medium text-blue-accent">{viewingReview.restaurant_name}</span> by <span className="font-medium">{viewingReview.userDetails?.username}</span></>
                : "Viewing review details"}
            </DialogDescription>
          </DialogHeader>
          
          {viewingReview && (
            <div className="py-6">
              <div className="space-y-8">
                {/* Rating & Date Information */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                  <div>
                    <h3 className="text-sm uppercase text-gray-500 mb-1">Rating</h3>
                    <div className="flex items-center">
                      {renderStars(viewingReview.rating)}
                      <span className="ml-2 text-lg font-medium text-gray-700">({viewingReview.rating}/5)</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    <div>
                      <h3 className="text-xs uppercase text-gray-500">Created</h3>
                      <p className="text-sm font-medium">{formatDate(viewingReview.createdAt)}</p>
                    </div>
                    <div>
                      <h3 className="text-xs uppercase text-gray-500">Updated</h3>
                      <p className="text-sm font-medium">{formatDate(viewingReview.updatedAt)}</p>
                    </div>
                    <div>
                      <h3 className="text-xs uppercase text-gray-500">Likes</h3>
                      <p className="text-sm font-medium">{viewingReview.likes || 0}</p>
                    </div>
                    <div>
                      <h3 className="text-xs uppercase text-gray-500">Helpful</h3>
                      <p className="text-sm font-medium">{viewingReview.helpful_count || 0}</p>
                    </div>
                  </div>
                </div>
                
                {/* Comment */}
                <div>
                  <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2 flex items-center">
                    <span className="w-1.5 h-5 bg-blue-accent rounded-sm mr-2"></span>
                    Comment
                  </h3>
                  <div className="bg-gray-50 p-5 rounded-md border border-gray-200">
                    {viewingReview.comment
                        ? (
                            <div className="text-gray-700 leading-relaxed overflow-auto max-h-[300px]">
                              <p className="whitespace-pre-wrap break-words break-all max-w-full overflow-hidden">
                                {viewingReview.comment}
                              </p>
                            </div>
                        )
                        : <span className="text-gray-400 italic">No comment provided</span>
                    }
                  </div>
                </div>
                
                {/* Images */}
                {viewingReview.images && viewingReview.images.length > 0 && (
                  <div>
                    <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2 flex items-center">
                      <span className="w-1.5 h-5 bg-blue-accent rounded-sm mr-2"></span>
                      Images
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {viewingReview.images.map((imageUrl, index) => (
                        <div 
                          key={index} 
                          className="h-40 bg-gray-200 rounded-md overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => window.open(imageUrl, '_blank')}
                        >
                          <img 
                            src={imageUrl} 
                            alt={`Review image ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="border-t pt-4">
            <Button 
              onClick={() => setIsViewDialogOpen(false)}
              className="bg-blue-accent hover:bg-blue-accent-200 px-6"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Review Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent 
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl font-bold text-blue-accent">Edit Review</DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              {currentReview?.restaurant_name && (
                  <>Editing review for <span className="font-medium text-blue-accent">{currentReview.restaurant_name}</span> by <span className="font-medium">{currentReview.userDetails?.username}</span></>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-8 py-6">
            {/* Rating */}
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <Label htmlFor="rating" className="text-sm uppercase tracking-wide text-gray-500 mb-3 block">
                Rating
              </Label>
              <Select
                value={formData.rating?.toString()}
                onValueChange={handleRatingChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 Stars - Excellent</SelectItem>
                  <SelectItem value="4">4 Stars - Very Good</SelectItem>
                  <SelectItem value="3">3 Stars - Good</SelectItem>
                  <SelectItem value="2">2 Stars - Fair</SelectItem>
                  <SelectItem value="1">1 Star - Poor</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center mt-3">
                {formData.rating && renderStars(formData.rating)}
                <span className="ml-2 text-sm text-gray-500">{formData.rating}/5</span>
              </div>
            </div>
            
            {/* Comment */}
            <div>
              <Label htmlFor="comment" className="text-sm uppercase tracking-wide text-gray-500 mb-2 block flex items-center">
                <span className="w-1.5 h-5 bg-blue-accent rounded-sm mr-2"></span>
                Comment
              </Label>
              <textarea
                id="comment"
                name="comment"
                value={formData.comment || ''}
                onChange={handleInputChange}
                className="w-full min-h-[120px] p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-accent focus:border-blue-accent"
                placeholder="Write a detailed review comment..."
              />
            </div>
            
            {/* Images */}
            <div>
              <Label className="text-sm uppercase tracking-wide text-gray-500 mb-2 block flex items-center">
                <span className="w-1.5 h-5 bg-blue-accent rounded-sm mr-2"></span>
                Review Images
              </Label>
              
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Image upload box */}
                <div 
                  onClick={handleImageClick}
                  className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center h-40 hover:border-blue-accent hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  {uploadingImage ? (
                    <div className="text-center">
                      <div className="loading loading-spinner loading-md text-blue-accent"></div>
                      <p className="mt-2 text-sm text-gray-500">Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <ImagePlus className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Click to upload</p>
                      <p className="text-xs text-gray-400 mt-1">Max 5MB</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden" 
                  />
                </div>
                
                {/* Display uploaded images */}
                {(formData.images || []).map((imageUrl, index) => (
                  <div key={index} className="relative h-40 group">
                    <img 
                      src={imageUrl} 
                      alt={`Review image ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200 shadow-sm"
                    />
                    <button 
                      type="button" 
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 w-7 h-7 flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveImage(imageUrl)}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mt-3">
                You can upload multiple images to support this review. Click on an image to add it to your review.
              </p>
            </div>
          </div>
          
          <DialogFooter className="border-t pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateReview}
              className="bg-blue-accent hover:bg-blue-accent-200 px-6"
              disabled={!formData.rating || uploadingImage}
            >
              {uploadingImage ? 'Uploading...' : 'Update Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReviews;