import React, { useState, useEffect, useRef } from 'react';
import { Plus, PenSquare, Trash2, ImagePlus, X, Search } from 'lucide-react';
import { restaurantService } from '@/services/restaurantService';
import { Restaurant } from '@/types/restaurant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
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
import RectangleCropper from '@/components/RectangleCropper';
import DraggableImageGallery from '@/components/DraggableImageGallery';
import { cuisineTranslations, translateCuisine, translateThaiToEnglish } from '@/utils/translations';
import { geocodingService } from '@/services/geocodingService';
import logger from '../../utils/logger';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';

// Price ranges - same as in SearchPage for consistency
const priceRanges = [
  { label: '<100', min: 0, max: 100, symbol: '฿' },
  { label: '101 - 250', min: 101, max: 250, symbol: '฿฿' },
  { label: '251 - 500', min: 251, max: 500, symbol: '฿฿฿' },
  { label: '501 - 1000', min: 501, max: 1000, symbol: '฿฿฿฿' },
  { label: '1000+', min: 1001, max: 2000, symbol: '฿฿฿฿฿' }
];

// Define form data type
type RestaurantFormData = {
  name: string;
  address: string;
  phone_number: string;
  website_url: string;
  cuisine_type: string[];
  images: string[];
  opening_hour: string;
  closing_hour: string;
  min_price: number;
  max_price: number;
  min_capacity: number;
  max_capacity: number;
  latitude: number;
  longitude: number;
};

const AdminRestaurants: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // React Hook Form setup
  const { 
    control,
    handleSubmit, 
    reset, 
    watch, 
    setValue, 
    formState: { errors }
  } = useForm<RestaurantFormData>({
    defaultValues: {
      name: '',
      address: '',
      phone_number: '',
      website_url: '',
      cuisine_type: [],
      images: [],
      opening_hour: '',
      closing_hour: '',
      min_price: 0,
      max_price: 0,
      min_capacity: 0,
      max_capacity: 0,
      latitude: 0,
      longitude: 0,
    }
  });
  
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cuisineInput, setCuisineInput] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [cuisineSuggestions, setCuisineSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cuisineInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const availableCuisines = Object.keys(cuisineTranslations);

  // Get price range symbol based on min and max price
  const getPriceRangeSymbol = (minPrice: number, maxPrice: number): string => {
    for (const range of priceRanges) {
      if (minPrice >= range.min && maxPrice <= range.max) {
        return range.symbol;
      }
    }
    // Default to the highest range if no match
    return priceRanges[priceRanges.length - 1].symbol;
  };

  // Set min and max price based on price range symbol
  const handlePriceRangeChange = (symbol: string) => {
    setSelectedPriceRange(symbol);
    const selectedRange = priceRanges.find(range => range.symbol === symbol);
    if (selectedRange) {
      setValue('min_price', selectedRange.min);
      setValue('max_price', selectedRange.max);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        cuisineInputRef.current &&
        !cuisineInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (cuisineInput.trim()) {
      const inputLower = cuisineInput.toLowerCase();

      const englishMatches = availableCuisines.filter(cuisine =>
        cuisine.toLowerCase().includes(inputLower)
      );

      const thaiMatches = availableCuisines.filter(cuisine =>
        translateCuisine(cuisine).toLowerCase().includes(inputLower) &&
        !englishMatches.includes(cuisine)
      );

      setCuisineSuggestions([...englishMatches, ...thaiMatches]);
      setShowSuggestions(englishMatches.length > 0 || thaiMatches.length > 0);
    } else {
      setCuisineSuggestions([]);
      setShowSuggestions(false);
    }
  }, [cuisineInput]);

  useEffect(() => {
    // If we're editing a restaurant, set the appropriate price range symbol
    const minPrice = watch('min_price');
    const maxPrice = watch('max_price');
    
    if (minPrice !== undefined && maxPrice !== undefined) {
      const symbol = getPriceRangeSymbol(minPrice, maxPrice);
      setSelectedPriceRange(symbol);
    }
  }, [watch('min_price'), watch('max_price')]);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const data = await restaurantService.getAllRestaurants();
      setRestaurants(data);
      setError(null);
    } catch (err) {
      logger.error('Error fetching restaurants:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch restaurants');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRestaurant = () => {
    setCurrentRestaurant(null);
    reset({
      name: '',
      address: '',
      phone_number: '',
      website_url: '',
      cuisine_type: [],
      images: [],
      opening_hour: '',
      closing_hour: '',
      min_price: 0,
      max_price: 0,
      min_capacity: 0,
      max_capacity: 0,
      latitude: 0,
      longitude: 0,
    });
    setCuisineInput('');
    setIsDialogOpen(true);
  };

  const handleEditRestaurant = (restaurant: Restaurant) => {
    setCurrentRestaurant(restaurant);
    reset({
      name: restaurant.name,
      address: restaurant.address || '',
      phone_number: restaurant.phone_number || '',
      website_url: restaurant.website_url || '',
      cuisine_type: restaurant.cuisine_type || [],
      images: restaurant.images || [],
      opening_hour: restaurant.opening_hour || '',
      closing_hour: restaurant.closing_hour || '',
      min_price: restaurant.min_price || 0,
      max_price: restaurant.max_price || 0,
      min_capacity: restaurant.min_capacity || 0,
      max_capacity: restaurant.max_capacity || 0,
      latitude: restaurant.latitude || 0,
      longitude: restaurant.longitude || 0,
    });
    setCuisineInput('');
    setIsDialogOpen(true);
  };

  const handleAddCuisine = () => {
    if (cuisineInput.trim()) {
      // Convert any Thai cuisine name to English before storing
      const englishCuisine = translateThaiToEnglish(cuisineInput.trim());
      
      const currentCuisines = watch('cuisine_type') || [];
      setValue('cuisine_type', [...currentCuisines, englishCuisine]);
      setCuisineInput('');
      setShowSuggestions(false);
    }
  };

  const handleCuisineSelect = (cuisine: string) => {
    // Make sure we're always storing the English version of the cuisine
    const englishCuisine = translateThaiToEnglish(cuisine);
    
    const currentCuisines = watch('cuisine_type') || [];
    if (!currentCuisines.includes(englishCuisine)) {
      setValue('cuisine_type', [...currentCuisines, englishCuisine]);
    }
    setCuisineInput('');
    setShowSuggestions(false);
  };

  const handleRemoveCuisine = (index: number) => {
    const currentCuisines = watch('cuisine_type') || [];
    setValue('cuisine_type', currentCuisines.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setIsDialogOpen(false);
    }
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    try {
      const fetchResponse = await fetch(croppedImageUrl);
      const blob = await fetchResponse.blob();

      const file = new File([blob], originalFile?.name || 'cropped-image.jpg', {
        type: 'image/jpeg'
      });

      setUploadingImage(true);
      const result = await restaurantService.uploadRestaurantImage(file);

      const imageUrl = result?.url || result?.imageUrl;
      if (!imageUrl) {
        toast.error('Invalid response from server, no image URL returned');
        return;
      }

      const currentImages = watch('images') || [];
      setValue('images', [...currentImages, imageUrl]);

      toast.success('Image uploaded successfully');
    } catch (error) {
      logger.error('Image upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      setCropperImage(null);
      setOriginalFile(null);
      setIsDialogOpen(true);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCropCancel = () => {
    setCropperImage(null);
    setOriginalFile(null);
    setIsDialogOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveImage = (imageUrl: string) => {
    const currentImages = watch('images') || [];
    setValue('images', currentImages.filter(img => img !== imageUrl));
  };

  const handleReorderImages = (newImages: string[]) => {
    setValue('images', newImages);
  };

  const handleGeocodeAddress = async () => {
    const address = watch('address');
    if (!address) {
      toast.error('Please enter an address to geocode');
      return;
    }

    try {
      const { latitude, longitude } = await geocodingService.geocodeAddress(address);
      setValue('latitude', latitude);
      setValue('longitude', longitude);
      toast.success('Address geocoded successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to geocode address');
    }
  };

  const handleSaveRestaurant: SubmitHandler<RestaurantFormData> = async (data) => {
    try {
      if (!data.name) {
        toast.error('Restaurant name is required');
        return;
      }

      if (currentRestaurant) {
        await restaurantService.updateRestaurant(currentRestaurant.id!, data);
        toast.success('Restaurant updated successfully');
      } else {
        await restaurantService.createRestaurant(data);
        toast.success('Restaurant created successfully');
      }

      setIsDialogOpen(false);
      fetchRestaurants();

      setSuccessMessage(
        currentRestaurant
          ? `Restaurant "${data.name}" was updated successfully.`
          : `Restaurant "${data.name}" was created successfully.`
      );

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (error) {
      logger.error('Save restaurant error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleDeleteRestaurant = async (restaurant: Restaurant) => {
    if (window.confirm(`Are you sure you want to delete "${restaurant.name}"?`)) {
      try {
        await restaurantService.deleteRestaurant(restaurant.id!);
        toast.success('Restaurant deleted successfully');
        fetchRestaurants();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete restaurant');
      }
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-6 text-blue-accent hidden lg:block">จัดการร้าน</h2>

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-medium">Restaurants</h3>
          <Button
            onClick={handleAddRestaurant}
            className="bg-blue-accent hover:bg-blue-accent-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Restaurant
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="loading loading-spinner loading-lg text-blue-accent"></div>
            <p className="mt-2">Loading restaurants...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>Error: {error}</p>
            <Button onClick={fetchRestaurants} variant="outline" className="mt-2">
              Try Again
            </Button>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">No restaurants found.</p>
            <Button
              onClick={handleAddRestaurant}
              className="bg-blue-accent hover:bg-blue-accent-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Restaurant
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className="bg-gray-50 rounded-lg border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative h-48">
                  {restaurant.images && restaurant.images.length > 0 ? (
                    <>
                      {restaurant.images.length === 1 && (
                        <div className="w-full h-full">
                          <img
                            src={restaurant.images[0]}
                            alt={restaurant.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      {restaurant.images.length === 2 && (
                        <div className="flex h-full">
                          <div className="w-[70%] h-full">
                            <img
                              src={restaurant.images[0]}
                              alt={restaurant.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="w-[30%] h-full pl-1">
                            <img
                              src={restaurant.images[1]}
                              alt={`${restaurant.name} 2`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}
                      {restaurant.images.length === 3 && (
                        <div className="flex h-full">
                          <div className="w-[70%] h-full">
                            <img
                              src={restaurant.images[0]}
                              alt={restaurant.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="w-[30%] h-full pl-1 flex flex-col">
                            <div className="h-1/2 pb-1">
                              <img
                                src={restaurant.images[1]}
                                alt={`${restaurant.name} 2`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="h-1/2">
                              <img
                                src={restaurant.images[2]}
                                alt={`${restaurant.name} 3`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      {restaurant.images.length === 4 && (
                        <div className="flex h-full">
                          <div className="w-[70%] h-full">
                            <img
                              src={restaurant.images[0]}
                              alt={restaurant.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="w-[30%] h-full pl-1 flex flex-col">
                            <div className="h-1/2 pb-1">
                              <img
                                src={restaurant.images[1]}
                                alt={`${restaurant.name} 2`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="h-1/2 grid grid-cols-2 gap-1">
                              <div>
                                <img
                                  src={restaurant.images[2]}
                                  alt={`${restaurant.name} 3`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <img
                                  src={restaurant.images[3]}
                                  alt={`${restaurant.name} 4`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {restaurant.images.length >= 5 && (
                        <div className="flex h-full">
                          <div className="w-[70%] h-full">
                            <img
                              src={restaurant.images[0]}
                              alt={restaurant.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="w-[30%] h-full pl-1 grid grid-cols-2 grid-rows-2 gap-1">
                            {restaurant.images.slice(1, 5).map((img, idx) => (
                              <div key={idx} className="relative">
                                <img
                                  src={img}
                                  alt={`${restaurant.name} ${idx + 2}`}
                                  className="w-full h-full object-cover"
                                />
                                {idx === 3 && (restaurant.images?.length ?? 0) > 5 && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="text-white font-medium text-sm">
                                      +{(restaurant.images?.length ?? 0) - 5}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <p className="text-gray-400">No image</p>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">{restaurant.name}</h3>

                  {restaurant.address && (
                    <p className="text-gray-600 text-sm mb-2">{restaurant.address}</p>
                  )}

                  {restaurant.cuisine_type && restaurant.cuisine_type.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {restaurant.cuisine_type.map((cuisine, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                        >
                          {cuisine}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end mt-4 space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditRestaurant(restaurant)}
                      className="text-blue-accent hover:text-blue-accent-200"
                    >
                      <PenSquare className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRestaurant(restaurant)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <div
              onClick={handleAddRestaurant}
              className="bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center h-full min-h-[320px] cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <div className="text-center p-6">
                <div className="bg-blue-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-blue-accent" />
                </div>
                <h3 className="font-medium text-lg mb-1">Add New Restaurant</h3>
                <p className="text-gray-500 text-sm">Click to add a new restaurant</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="md:max-w-[900px] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sticky top-0 z-10 bg-white p-6 pb-2 mb-2 border-b">
            <div className="flex items-center">
              {currentRestaurant && currentRestaurant.images && currentRestaurant.images[0] && (
                <div className="hidden sm:block h-10 w-10 rounded-md overflow-hidden mr-3 border border-gray-200">
                  <img 
                    src={currentRestaurant.images[0]} 
                    alt={currentRestaurant.name} 
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-blue-accent">
                  {currentRestaurant ? 'Edit Restaurant' : 'Add New Restaurant'}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  {currentRestaurant
                    ? `Update details for ${currentRestaurant.name}`
                    : 'Create a new restaurant listing'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleSaveRestaurant)}>
            <div className="px-6">
              <div className="flex flex-col sm:flex-row gap-6 py-4">
                {/* Left column - Main Info */}
                <div className="w-full sm:w-1/2 space-y-5">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center">
                      <span className="inline-block w-1 h-4 bg-blue-accent rounded-full mr-2"></span>
                      Basic Information
                    </h3>
                  
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium">
                        Restaurant Name <span className="text-red-500">*</span>
                      </Label>
                      <Controller
                        name="name"
                        control={control}
                        rules={{ required: "Restaurant name is required" }}
                        render={({ field }) => (
                          <Input
                            id="name"
                            {...field}
                            className="mt-1.5"
                            placeholder="Enter restaurant name"
                          />
                        )}
                      />
                      {errors.name && (
                        <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="address" className="text-sm font-medium">
                        Address
                      </Label>
                      <div className="relative">
                        <Controller
                          name="address"
                          control={control}
                          render={({ field }) => (
                            <Input
                              id="address"
                              {...field}
                              className="mt-1.5 pr-10"
                              placeholder="Enter full address"
                            />
                          )}
                        />
                        <button
                          type="button"
                          onClick={handleGeocodeAddress}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          <Search className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="latitude" className="text-sm font-medium">
                          Latitude
                        </Label>
                        <Controller
                          name="latitude"
                          control={control}
                          render={({ field }) => (
                            <Input
                              id="latitude"
                              {...field}
                              className="mt-1.5"
                              placeholder="Latitude"
                              readOnly
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label htmlFor="longitude" className="text-sm font-medium">
                          Longitude
                        </Label>
                        <Controller
                          name="longitude"
                          control={control}
                          render={({ field }) => (
                            <Input
                              id="longitude"
                              {...field}
                              className="mt-1.5"
                              placeholder="Longitude"
                              readOnly
                            />
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="phone_number" className="text-sm font-medium">
                          Phone Number
                        </Label>
                        <Controller
                          name="phone_number"
                          control={control}
                          render={({ field }) => (
                            <Input
                              id="phone_number"
                              {...field}
                              className="mt-1.5"
                              placeholder="e.g. 0xx-xxx-xxxx"
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label htmlFor="website_url" className="text-sm font-medium">
                          Website URL
                        </Label>
                        <Controller
                          name="website_url"
                          control={control}
                          render={({ field }) => (
                            <Input
                              id="website_url"
                              {...field}
                              type="url"
                              className="mt-1.5"
                              placeholder="https://example.com"
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center">
                      <span className="inline-block w-1 h-4 bg-blue-accent rounded-full mr-2"></span>
                      Details & Pricing
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="opening_hour" className="text-sm font-medium">
                          Opening Hour
                        </Label>
                        <div className="relative mt-1.5">
                          <Controller
                            name="opening_hour"
                            control={control}
                            render={({ field }) => (
                              <Input
                                id="opening_hour"
                                {...field}
                                type="time"
                                className="pr-8"
                              />
                            )}
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-gray-400" viewBox="0 0 16 16">
                              <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="closing_hour" className="text-sm font-medium">
                          Closing Hour
                        </Label>
                        <div className="relative mt-1.5">
                          <Controller
                            name="closing_hour"
                            control={control}
                            render={({ field }) => (
                              <Input
                                id="closing_hour"
                                {...field}
                                type="time"
                                className="pr-8"
                              />
                            )}
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-gray-400" viewBox="0 0 16 16">
                              <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="price_range" className="text-sm font-medium">
                        Price Range
                      </Label>
                      <Select
                        value={selectedPriceRange}
                        onValueChange={handlePriceRangeChange}
                      >
                        <SelectTrigger className="w-full mt-1.5">
                          <SelectValue placeholder="Select price range" />
                        </SelectTrigger>
                        <SelectContent>
                          {priceRanges.map((range) => (
                            <SelectItem key={range.symbol} value={range.symbol}>
                              <span className="font-medium">{range.symbol}</span> <span className="ml-2 text-gray-600">{range.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="min_capacity" className="text-sm font-medium">
                          Min Capacity
                        </Label>
                        <div className="relative mt-1.5">
                          <Controller
                            name="min_capacity"
                            control={control}
                            render={({ field: { value, onChange, ...rest } }) => (
                              <Input
                                id="min_capacity"
                                {...rest}
                                value={value || 0}
                                onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                                type="number"
                                min="0"
                                className="[&::-webkit-inner-spin-button]:appearance-none"
                                style={{
                                  WebkitAppearance: "none",
                                  MozAppearance: "textfield"
                                }}
                              />
                            )}
                          />
                          <div className="absolute inset-y-0 right-0 flex flex-col border-l">
                            <button
                              type="button"
                              className="flex-1 px-2 border-b text-gray-500 hover:bg-gray-100 flex items-center justify-center"
                              onClick={() => {
                                const newValue = (watch('min_capacity') || 0) + 1;
                                setValue('min_capacity', newValue);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/>
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="flex-1 px-2 text-gray-500 hover:bg-gray-100 flex items-center justify-center"
                              onClick={() => {
                                const newValue = Math.max(0, (watch('min_capacity') || 0) - 1);
                                setValue('min_capacity', newValue);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1-.708-.708l6-6a.5.5 0 0 1 0-.708z"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="max_capacity" className="text-sm font-medium">
                          Max Capacity
                        </Label>
                        <div className="relative mt-1.5">
                          <Controller
                            name="max_capacity"
                            control={control}
                            render={({ field: { value, onChange, ...rest } }) => (
                              <Input
                                id="max_capacity"
                                {...rest}
                                value={value || 0}
                                onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                                type="number"
                                min="0"
                                className="[&::-webkit-inner-spin-button]:appearance-none"
                                style={{
                                  WebkitAppearance: "none",
                                  MozAppearance: "textfield"
                                }}
                              />
                            )}
                          />
                          <div className="absolute inset-y-0 right-0 flex flex-col border-l">
                            <button
                              type="button"
                              className="flex-1 px-2 border-b text-gray-500 hover:bg-gray-100 flex items-center justify-center"
                              onClick={() => {
                                const newValue = (watch('max_capacity') || 0) + 1;
                                setValue('max_capacity', newValue);
                              }}                            
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/>
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="flex-1 px-2 text-gray-500 hover:bg-gray-100 flex items-center justify-center"
                              onClick={() => {
                                const newValue = Math.max(0, (watch('max_capacity') || 0) - 1);
                                setValue('max_capacity', newValue);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1-.708-.708l6-6a.5.5 0 0 1 0-.708z"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center">
                      <span className="inline-block w-1 h-4 bg-blue-accent rounded-full mr-2"></span>
                      Cuisine Types
                    </h3>
                    
                    <div className="relative">
                      <div className="flex mt-1 relative">
                        <div className="relative flex-1">
                          <Input
                            id="cuisine_input"
                            ref={cuisineInputRef}
                            value={cuisineInput}
                            onChange={(e) => setCuisineInput(e.target.value)}
                            className="flex-1 pr-8 font-kanit"
                            placeholder="Add cuisine type"
                            onFocus={() => {
                              if (cuisineInput.trim() && cuisineSuggestions.length > 0) {
                                setShowSuggestions(true);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (showSuggestions && cuisineSuggestions.length > 0) {
                                  handleCuisineSelect(cuisineSuggestions[0]);
                                } else {
                                  handleAddCuisine();
                                }
                              } else if (e.key === 'Escape') {
                                setShowSuggestions(false);
                              } else if (e.key === 'ArrowDown' && showSuggestions) {
                                const suggestionElements = suggestionsRef.current?.querySelectorAll('button');
                                if (suggestionElements && suggestionElements.length > 0) {
                                  (suggestionElements[0] as HTMLElement).focus();
                                }
                                e.preventDefault();
                              }
                            }}
                          />
                          {cuisineInput && (
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              onClick={() => setCuisineInput('')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <Button
                          type="button"
                          onClick={handleAddCuisine}
                          className="ml-2 bg-blue-accent hover:bg-blue-accent-200"
                          size="sm"
                        >
                          Add
                        </Button>
                      </div>

                      {showSuggestions && cuisineSuggestions.length > 0 && (
                        <div
                          ref={suggestionsRef}
                          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto font-kanit"
                        >
                          {cuisineSuggestions.map((cuisine, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 flex justify-between items-center focus:bg-blue-100 focus:outline-none"
                              onClick={() => handleCuisineSelect(cuisine)}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  const next = suggestionsRef.current?.querySelectorAll('button')[index + 1] as HTMLElement;
                                  if (next) next.focus();
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  if (index === 0) {
                                    cuisineInputRef.current?.focus();
                                  } else {
                                    const prev = suggestionsRef.current?.querySelectorAll('button')[index - 1] as HTMLElement;
                                    if (prev) prev.focus();
                                  }
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleCuisineSelect(cuisine);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setShowSuggestions(false);
                                  cuisineInputRef.current?.focus();
                                }
                              }}
                            >
                              <span>{cuisine}</span>
                              <span className="text-sm text-gray-500">
                                {cuisine !== translateCuisine(cuisine) ? translateCuisine(cuisine) : ''}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2 min-h-[32px]">
                      {watch('cuisine_type')?.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No cuisine types added yet</p>
                      ) : (
                        watch('cuisine_type')?.map((cuisine, index) => (
                          <div key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center font-kanit text-sm">
                            <span className="mr-1">{cuisine}</span>
                            {cuisine !== translateCuisine(cuisine) && (
                              <span className="text-xs text-blue-600">({translateCuisine(cuisine)})</span>
                            )}
                            <button
                              type="button"
                              className="ml-1 text-blue-500 hover:text-blue-700 w-5 h-5 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors"
                              onClick={() => handleRemoveCuisine(index)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right column - Images */}
                <div className="w-full sm:w-1/2 space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-700 flex items-center">
                        <span className="inline-block w-1 h-4 bg-blue-accent rounded-full mr-2"></span>
                        Restaurant Images
                      </h3>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleImageClick}
                        disabled={uploadingImage}
                        className="flex items-center text-blue-accent border-blue-accent hover:bg-blue-50"
                      >
                        <ImagePlus className="h-4 w-4 mr-1" />
                        Add Image
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>

                    {uploadingImage ? (
                      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <div className="loading loading-spinner loading-md text-blue-accent"></div>
                        <p className="mt-2 text-sm text-gray-500">Uploading image...</p>
                      </div>
                    ) : watch('images')?.length > 0 ? (
                      <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                        <p className="text-xs text-gray-500 mb-2">Drag to reorder images. First image will be the main display image.</p>
                        <DraggableImageGallery
                          images={watch('images')}
                          onImagesReordered={handleReorderImages}
                          onImageRemove={handleRemoveImage}
                        />
                      </div>
                    ) : (
                      <div
                        onClick={handleImageClick}
                        className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center h-64 hover:border-blue-accent hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <ImagePlus className="h-10 w-10 text-gray-400 mb-3" />
                        <p className="font-medium text-gray-600">Click to upload restaurant images</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, JPEG (max 5MB)</p>
                        <p className="text-xs text-gray-500 mt-3">Recommended ratio: 16:9</p>
                      </div>
                    )}
                  </div>

                  {/* Image Preview for the Main Image */}
                  {watch('images')?.length > 0 && (
                    <div className="space-y-3 pt-3 border-t">
                      <h3 className="text-sm font-medium text-gray-700 flex items-center">
                        <span className="inline-block w-1 h-4 bg-blue-accent rounded-full mr-2"></span>
                        Main Image Preview
                      </h3>
                      <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                        <img 
                          src={watch('images')[0]} 
                          alt="Main restaurant view"
                          className="w-full h-auto aspect-video object-cover" 
                        />
                      </div>
                      <p className="text-xs text-gray-500 text-center">This is how your main image will appear to users</p>
                    </div>
                  )}

                  {/* Form Status */}
                  <div className="pt-3 border-t">
                    <div className={`p-3 rounded-lg ${watch('name') ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
                      <p className={`text-sm flex items-center ${watch('name') ? 'text-green-600' : 'text-amber-600'}`}>
                        {watch('name') ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Ready to {currentRestaurant ? 'update' : 'create'}!
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Please add a restaurant name
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="sticky bottom-0 z-10 bg-white p-4 border-t mt-4 flex flex-wrap gap-2 justify-between sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-accent hover:bg-blue-accent-200 min-w-[150px]"
                disabled={!watch('name') || uploadingImage}
              >
                {currentRestaurant ? 'Update Restaurant' : 'Add Restaurant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {cropperImage && (
        <div className="fixed inset-0 z-[9999]">
          <RectangleCropper
            image={cropperImage}
            onCropComplete={handleCropComplete}
            onCancel={handleCropCancel}
            aspectRatio={16 / 9}
          />
        </div>
      )}
    </div>
  );
};

export default AdminRestaurants;