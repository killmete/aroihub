import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { restaurantService } from '@/services/restaurantService';
import { Restaurant } from '@/types/restaurant';
import { Star, ArrowLeft, ChevronDown, Clock, Search, X } from 'lucide-react';
import { cuisineTranslations } from '@/utils/translations';
import { Slider, Checkbox, Radio, Rating } from '@mui/material';
import logger from '../../utils/logger';

// Updated to match the food categories in Home.tsx with proper capitalization
const popularCuisines = [
  'Japanese',
  'Korean',
  'Thai',
  'Chinese',
  'Italian',
  'Seafood',
  'Buffet',
  'BBQBuffet',
  'GrillBuffet',
  'Shabu',
  'Cafe',
  'Dessert',
  'Dimsum',
  'Esan',
  'Noodles',
  'Pizza',
  'Steak'
];

// Price ranges
const priceRanges = [
    { symbol: '฿', description: 'ถูกกว่า 100 บาท', min: 0, max: 100 },
    { symbol: '฿฿', description: '101 - 250 บาท', min: 101, max: 250 },
    { symbol: '฿฿฿', description: '251 - 500 บาท', min: 251, max: 500 },
    { symbol: '฿฿฿฿', description: '500 - 1000 บาท', min: 501, max: 1000 },
    { symbol: '฿฿฿฿฿', description: 'มากกว่า 1000 บาท', min: 1001, max: 2000 }
  ];

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

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const cuisineParam = searchParams.get('cuisine');
  const ratingParam = searchParams.get('rating');
  const priceParam = searchParams.get('price');
  const nameParam = searchParams.get('name');
  
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [filterLoading, setFilterLoading] = useState<boolean>(false);
  const filterLoadingTimer = useRef<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [nameFilter, setNameFilter] = useState<string>(nameParam || '');
  const [ratingFilter, setRatingFilter] = useState<number>(ratingParam ? parseFloat(ratingParam) : 0);
  const [priceFilter, setPriceFilter] = useState<string>(priceParam || '');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(
    cuisineParam ? [getProperCaseForCuisine(cuisineParam)] : []
  );
  // Add filter logic state - default to OR
  const [cuisineFilterLogic, setCuisineFilterLogic] = useState<'OR' | 'AND'>('OR');
  
  // Display state for cuisine filters
  // Auto-expand if selected cuisine is not in the first 6 items
  const [showAllCuisines, setShowAllCuisines] = useState(() => {
    if (cuisineParam) {
      const cuisineIndex = popularCuisines.findIndex(c => 
        c.toLowerCase() === cuisineParam.toLowerCase()
      );
      return cuisineIndex >= 6; // Auto-expand if the selected cuisine is beyond the first 6
    }
    return false;
  });
  const visibleCuisines = showAllCuisines ? popularCuisines : popularCuisines.slice(0, 6);

  // Helper function to get proper case for cuisine
  function getProperCaseForCuisine(cuisine: string): string {
    return popularCuisines.find(c => c.toLowerCase() === cuisine.toLowerCase()) || cuisine;
  }

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (filterLoadingTimer.current) {
        clearTimeout(filterLoadingTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchRestaurants = async () => {
      setInitialLoading(true);
      try {
        // If we have name search param, use search API directly
        if (nameParam) {
          const data = await restaurantService.searchRestaurants({ name: nameParam });
          setRestaurants(data);
          setFilteredRestaurants(data);
        } else {
          // Otherwise fetch all restaurants initially
          const data = await restaurantService.getPublicRestaurants();
          setRestaurants(data);
          setFilteredRestaurants(data);
        }
        setError(null);
      } catch (err) {
        logger.error("Error fetching restaurants:", err);
        setError(err instanceof Error ? err.message : 'Failed to fetch restaurants');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchRestaurants();
  }, [nameParam]);

  // Apply filters
  useEffect(() => {
    // Don't run this effect on initial mount
    if (initialLoading) return;

    // Apply filters locally for immediate UI response
    applyFiltersLocally();

    // Use a debounce for API calls
    const debounceTimer = setTimeout(() => {
      // Only make API call if needed (complex filters or search)
      const needsServerFiltering = 
        nameFilter.trim() !== '' || 
        selectedCuisines.length > 0 || 
        ratingFilter > 0 || 
        priceFilter !== '';

      if (needsServerFiltering) {
        // Update URL params with current filters
        updateURLParams();
        // Then fetch from API with the filters for accurate results
        fetchFilteredRestaurants();
      }
    }, 500); // Increased debounce time to 500ms

    return () => clearTimeout(debounceTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCuisines, ratingFilter, priceFilter, cuisineFilterLogic, nameFilter]);

  // Apply filters locally
  const applyFiltersLocally = () => {
    let filtered = [...restaurants];

    // Apply name filter if provided
    if (nameFilter.trim() !== '') {
      const searchTermLower = nameFilter.trim().toLowerCase();
      filtered = filtered.filter(restaurant => 
        restaurant.name.toLowerCase().includes(searchTermLower)
      );
    }

    // Apply cuisine filter with selected logic (OR/AND)
    if (selectedCuisines.length > 0) {
      filtered = filtered.filter(restaurant => {
        if (!restaurant.cuisine_type || !Array.isArray(restaurant.cuisine_type)) {
          return false;
        }

        if (cuisineFilterLogic === 'OR') {
          // OR logic: Restaurant has ANY of the selected cuisines (case-insensitive comparison)
          return restaurant.cuisine_type.some(cuisine => 
            selectedCuisines.some(sc => sc.toLowerCase() === cuisine.toLowerCase())
          );
        } else {
          // AND logic: Restaurant has ALL of the selected cuisines (case-insensitive comparison)
          return selectedCuisines.every(selectedCuisine =>
            restaurant.cuisine_type?.some(c => c.toLowerCase() === selectedCuisine.toLowerCase())
          );
        }
      });
    }

    // Apply rating filter
    if (ratingFilter > 0) {
      filtered = filtered.filter(restaurant => 
        restaurant.average_rating && restaurant.average_rating >= ratingFilter
      );
    }

    // Apply price filter
    if (priceFilter) {
      const selectedRange = priceRanges.find(range => range.symbol === priceFilter);
      if (selectedRange) {
        filtered = filtered.filter(restaurant => 
          (restaurant.min_price && restaurant.min_price >= selectedRange.min) &&
          (restaurant.max_price && restaurant.max_price <= selectedRange.max)
        );
      }
    }

    // Update filtered restaurants immediately for responsive UI
    setFilteredRestaurants(filtered);
  };

  // Fetch filtered restaurants from API
  const fetchFilteredRestaurants = async () => {
    // Clear any existing loading timer
    if (filterLoadingTimer.current) {
      clearTimeout(filterLoadingTimer.current);
    }
    
    // Only show loading indicator after a brief delay to prevent flickering
    filterLoadingTimer.current = setTimeout(() => {
      setFilterLoading(true);
    }, 300);
    
    try {
      // Build search params for API call
      const searchParams: {
        name?: string;
        cuisines?: string[];
        minPrice?: number;
        maxPrice?: number;
        minRating?: number;
        cuisineLogic?: 'OR' | 'AND';
      } = {};

      // Add name filter
      if (nameFilter.trim() !== '') {
        searchParams.name = nameFilter.trim();
      }

      // Add selected cuisines
      if (selectedCuisines.length > 0) {
        searchParams.cuisines = selectedCuisines;
        // Add cuisine logic if multiple cuisines are selected
        if (selectedCuisines.length > 1) {
          searchParams.cuisineLogic = cuisineFilterLogic;
        }
      }

      // Add rating filter
      if (ratingFilter > 0) {
        searchParams.minRating = ratingFilter;
      }

      // Add price filter
      if (priceFilter) {
        const selectedRange = priceRanges.find(range => range.symbol === priceFilter);
        if (selectedRange) {
          searchParams.minPrice = selectedRange.min;
          searchParams.maxPrice = selectedRange.max;
        }
      }

      // Call the API with the current filters
      const data = await restaurantService.searchRestaurants(searchParams);
      
      // Update filtered restaurants
      setFilteredRestaurants(data);
      setError(null);
    } catch (error) {
      logger.error("Error fetching filtered restaurants:", error);
      setError(error instanceof Error ? error.message : 'Failed to fetch restaurants');
    } finally {
      // Clear the loading timer if it's still active
      if (filterLoadingTimer.current) {
        clearTimeout(filterLoadingTimer.current);
        filterLoadingTimer.current = null;
      }
      setFilterLoading(false);
    }
  };

  // Update URL params based on filters
  const updateURLParams = () => {
    const params = new URLSearchParams();
    
    // Add name to URL
    if (nameFilter.trim() !== '') {
      params.set('name', nameFilter.trim());
    }
    
    // Add cuisines to URL
    if (selectedCuisines.length > 0) {
      params.set('cuisines', selectedCuisines.join(','));
    }
    
    // Add rating to URL
    if (ratingFilter > 0) {
      params.set('rating', ratingFilter.toString());
    }
    
    // Add price to URL
    if (priceFilter) {
      params.set('price', priceFilter);
    }
    
    setSearchParams(params, { replace: true });
  };

  // Function to refresh data and reset filters
  const clearAllFilters = async () => {
    // Clear all filter states
    setRatingFilter(0);
    setSelectedCuisines([]);
    setPriceFilter('');
    setNameFilter('');
    
    // Clear URL parameters
    setSearchParams({}, { replace: true });
    
    // Re-fetch all restaurants
    setInitialLoading(true);
    try {
      const data = await restaurantService.getPublicRestaurants();
      setRestaurants(data);
      setFilteredRestaurants(data);
      setError(null);
    } catch (err) {
      logger.error("Error clearing filters and fetching restaurants:", err);
      setError(err instanceof Error ? err.message : 'Failed to fetch restaurants');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleCuisineSelect = (cuisine: string) => {
    if (selectedCuisines.includes(cuisine)) {
      setSelectedCuisines(selectedCuisines.filter(c => c !== cuisine));
    } else {
      setSelectedCuisines([...selectedCuisines, cuisine]);
    }
  };

  const handleRatingChange = (_event: Event, newValue: number | number[]) => {
    setRatingFilter(newValue as number);
  };

  const handlePriceSelect = (priceSymbol: string) => {
    setPriceFilter(priceFilter === priceSymbol ? '' : priceSymbol);
  };

  const handleShowMoreCuisines = () => {
    setShowAllCuisines(!showAllCuisines);
  };

  const handleNameFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setNameFilter(newValue);
    
    // We don't do anything special here - the effect hook above will handle the search
    // with debouncing as the user types or deletes characters
  };

  const handleNameFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFilteredRestaurants();
  };

  const clearNameFilter = () => {
    setNameFilter('');
    // We'll let the effect hook handle the rest
  };
  
  // Function to fetch all restaurants
  // Format cuisine name for display
  const getCuisineName = (cuisine: string) => {
    const cuisineKeys = Object.keys(cuisineTranslations);
    const matchedKey = cuisineKeys.find(key => 
      key.toLowerCase() === cuisine.toLowerCase()
    );
    
    if (matchedKey) {
      return cuisineTranslations[matchedKey];
    }
    
    return cuisine;
  };

  // Check if restaurant is currently open
  const checkIsOpen = (openingHour?: string, closingHour?: string): boolean => {
    if (!openingHour || !closingHour) return false;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const [openHour, openMinute] = openingHour.split(':').map(Number);
    const [closeHour, closeMinute] = closingHour.split(':').map(Number);
    
    // Convert to minutes for easy comparison
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const openingTimeInMinutes = openHour * 60 + openMinute;
    const closingTimeInMinutes = closeHour * 60 + closeMinute;
    
    // Handle case when restaurant closes after midnight
    if (closingTimeInMinutes < openingTimeInMinutes) {
      return currentTimeInMinutes >= openingTimeInMinutes || 
             currentTimeInMinutes <= closingTimeInMinutes;
    }
    
    // Normal case (e.g., 9:00 - 22:00)
    return currentTimeInMinutes >= openingTimeInMinutes && 
           currentTimeInMinutes <= closingTimeInMinutes;
  };

  return (
    <div className="w-full bg-main-background min-h-screen font-kanit pb-10">
      {/* Back button */}
      <div className="max-w-6xl mx-auto pt-4 px-4">
        <Link to="/" className="flex items-center text-gray-600 hover:text-blue-accent mb-4">
          <ArrowLeft className="h-5 w-5 mr-1" />
          <span>กลับไปยังหน้าหลัก</span>
        </Link>
      </div>

      {/* Page header */}
      <div className="max-w-6xl mx-auto px-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">
          ค้นหาร้านอาหาร
        </h1>
        <p className="text-gray-500 mt-1">
        {filteredRestaurants.length > 0 ? 'พบ' : 'ไม่พบ'} {filteredRestaurants.length > 0 ? filteredRestaurants.length : ''} {filteredRestaurants.length > 0 ? 'ร้านอาหาร' : 'ร้านอาหาร'}
        </p>
      </div>

      {/* Main content area - 2 columns */}
      <div className="max-w-6xl mx-auto px-4 flex flex-col lg:flex-row gap-6">
        {/* Left column - Filters - 30% */}
        <div className="w-full lg:w-[20%]">
          <div className="bg-white rounded-lg shadow-sm p-3 pt-2 mb-4">
            <div className="flex justify-between items-baseline mb-4 pb-4 border-b-2">
                <h2 className="font-semibold text-xl">ตัวกรอง</h2>
                <button
                    onClick={clearAllFilters}
                    className="text-gray-400 hover:underline hover:cursor-pointer text-md"
                >
                    ล้างตัวกรอง
                </button>
            </div>

            {/* Name Search Filter */}
            <div className="mb-6 pb-4 border-b-2">
              <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                <span>ค้นหาตามชื่อร้าน</span>
              </h3>
              <form onSubmit={handleNameFilterSubmit} className="relative">
                <input
                  type="text"
                  value={nameFilter}
                  onChange={handleNameFilterChange}
                  placeholder="ชื่อร้านอาหาร..."
                  className="w-full pl-3 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-accent focus:border-transparent"
                />
                {nameFilter && (
                  <button
                    type="button"
                    onClick={clearNameFilter}
                    className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-accent hover:text-blue-700"
                >
                  <Search size={18} />
                </button>
              </form>
            </div>
            
            {/* Rating Filter */}
            <div className="mb-6 pb-4 border-b-2">
              <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                <span>เรตติ้ง</span>
                {ratingFilter > 0 && (
                  <button 
                    onClick={() => setRatingFilter(0)} 
                    className="ml-auto text-xs text-blue-accent hover:underline flex items-center"
                  >
                    ล้าง
                  </button>
                )}
              </h3>
              <div className="px-1">
                <Slider
                  value={ratingFilter}
                  onChange={handleRatingChange}
                  min={0}
                  max={5}
                  step={0.5}
                  valueLabelDisplay="auto"
                  sx={{
                    '& .MuiSlider-thumb': {
                      backgroundColor: '#fff',
                      border: '2px solid var(--color-blue-accent)',
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: '0px 0px 0px 8px rgba(100, 120, 240, 0.16)'
                      }
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: 'var(--color-blue-accent)'
                    },
                    '& .MuiSlider-rail': {
                      backgroundColor: '#d1d5db'
                    },
                    '& .MuiSlider-valueLabel': {
                      backgroundColor: 'var(--color-blue-accent)',
                      borderRadius: '6px',
                      padding: '2px 6px'
                    }
                  }}
                />
                <div className="mt-2">
                  {ratingFilter > 0 ? (
                    <div className="flex items-center justify-between">
                      <Rating 
                        value={ratingFilter} 
                        readOnly 
                        precision={0.5}
                        size="medium"
                        sx={{
                          '& .MuiRating-iconFilled': {
                            color: '#f59e0b',
                          },
                          '& .MuiRating-iconEmpty': {
                            color: '#d1d5db',
                          }
                        }}
                      />
                      <span className="ml-2 text-lg font-medium text-blue-accent">
                        {ratingFilter}{ratingFilter < 5 ? "+" : ""}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-center items-center py-2">
                      <span className="text-sm text-gray-500 bg-gray-100 rounded-full px-4 py-1">
                        ทุกระดับคะแนน
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Cuisine Filter */}
            <div className="mb-6 pb-4 border-b-2">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-700">ประเภทอาหาร</h3>
                {selectedCuisines.length > 1 && (
                  <div className="flex border rounded-md overflow-hidden text-xs">
                    <button 
                      className={`px-2 py-1 ${cuisineFilterLogic === 'OR' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                      onClick={() => setCuisineFilterLogic('OR')}
                    >
                      หรือ
                    </button>
                    <button 
                      className={`px-2 py-1 ${cuisineFilterLogic === 'AND' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                      onClick={() => setCuisineFilterLogic('AND')}
                    >
                      และ
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {visibleCuisines.map((cuisine) => (
                  <div
                    key={cuisine}
                    onClick={() => handleCuisineSelect(cuisine)}
                    className={`flex items-center p-2 py-1 rounded-lg transition-all duration-200 cursor-pointer ${
                      selectedCuisines.includes(cuisine) 
                        ? 'bg-blue-100 shadow-sm' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedCuisines.includes(cuisine)}
                      color="primary"
                      size="small"
                      onChange={() => handleCuisineSelect(cuisine)}
                      onClick={(e) => e.stopPropagation()} // This prevents double-triggering when clicking the checkbox
                      className="mr-2"
                    />
                    <span className="text-sm">
                      {getCuisineName(cuisine)}
                    </span>
                    {selectedCuisines.includes(cuisine) && (
                      <span className="ml-auto text-blue-500 text-xs font-medium animate-fadeIn">
                        เลือกแล้ว
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {popularCuisines.length > 6 && (
                <button
                  onClick={handleShowMoreCuisines}
                  className="text-blue-accent mt-3 py-2 text-sm flex items-center justify-center w-full rounded-md hover:bg-blue-50 transition-colors"
                >
                  {showAllCuisines ? 'แสดงน้อยลง' : 'ดูเพิ่มเติม'}
                  <ChevronDown className={`ml-1 h-4 w-4 transition-transform duration-300 ${showAllCuisines ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
            
            {/* Price Range Filter */}
            <div className='mb-6 pb-4'>
              <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                <span>ช่วงราคา</span>
                {priceFilter && (
                  <button 
                    onClick={() => setPriceFilter('')} 
                    className="ml-auto text-xs text-blue-accent hover:underline flex items-center"
                  >
                    ล้าง
                  </button>
                )}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:grid-cols-1">
              {priceRanges.map((range) => (
                <div
                    key={range.symbol}
                    onClick={() => handlePriceSelect(range.symbol)}
                    className={`px-3 py-2 border rounded-lg cursor-pointer transition-all duration-200 ${
                    priceFilter === range.symbol 
                        ? 'border-blue-accent bg-blue-50 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    <div className="flex items-center">
                    <Radio
                        checked={priceFilter === range.symbol}
                        color="primary"
                        size="small"
                        className="mr-2"
                    />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{range.symbol}</span>
                        <span className="text-xs text-gray-500">{range.description}</span>
                    </div>
                    </div>
                </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right column - Restaurant listings - 70% */}
        <div className="w-full lg:w-[80%]">
          {initialLoading ? (
            <div className="py-20 text-center bg-white rounded-lg shadow-sm">
              <div className="loading loading-spinner loading-lg text-orange-400 mx-auto"></div>
              <p className="mt-3 text-gray-500">กำลังโหลดร้านอาหาร...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-8 rounded-lg text-center">
              <p className="font-medium mb-1">ไม่สามารถโหลดข้อมูลร้านอาหารได้</p>
              <p className="text-sm">{error}</p>
              <Link to="/" className="inline-block mt-4 text-blue-600 hover:underline">
                กลับไปยังหน้าหลัก
              </Link>
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-lg shadow-sm border border-dashed border-gray-300">
              <p className="text-gray-500 text-lg mb-2">ไม่พบร้านอาหาร</p>
              <p className="text-gray-400 mb-4">ลองปรับตัวกรองใหม่</p>
              <button
                onClick={clearAllFilters}
                className="text-blue-600 hover:underline"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            <div className="space-y-4 relative">
              {filterLoading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-lg">
                  <div className="loading loading-spinner loading-md text-orange-400"></div>
                </div>
              )}
              {filteredRestaurants.map((restaurant) => (
                <Link
                  key={restaurant.id}
                  to={`/restaurants/${restaurant.id}`}
                  className="block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Restaurant image with overlay status indicator */}
                    <div className="relative w-full md:w-1/3 h-48 md:h-auto">
                      {restaurant.images && restaurant.images.length > 0 ? (
                        <img
                          src={restaurant.images[0]}
                          alt={restaurant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <p className="text-gray-400">ไม่มีรูปภาพ</p>
                        </div>
                      )}
                      
                      {/* Open/closed status badge */}
                      {restaurant.opening_hour && restaurant.closing_hour && (
                        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-white text-xs font-medium ${
                          checkIsOpen(restaurant.opening_hour, restaurant.closing_hour) 
                            ? 'bg-green-500' 
                            : 'bg-red-500'
                        }`}>
                          {checkIsOpen(restaurant.opening_hour, restaurant.closing_hour) ? 'เปิดอยู่' : 'ปิดอยู่'}
                        </div>
                      )}
                    </div>

                    {/* Restaurant info with improved layout */}
                    <div className="p-4 flex flex-col flex-1 justify-between relative">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-lg line-clamp-2">{restaurant.name}</h3>
                          <div className="flex items-center bg-gradient-to-r from-red-600 to-red-700 text-white px-2 py-0.5 rounded shrink-0">
                            <span className="font-bold">
                              {restaurant.average_rating ? Number(restaurant.average_rating).toFixed(1) : '0.0'}
                            </span>
                            <Star size={16} fill={'white'} className="ml-1" />
                          </div>
                        </div>

                        {restaurant.address && (
                          <p className="text-sm text-gray-600 mb-3 mt-1 line-clamp-1">
                            {restaurant.address}
                          </p>
                        )}

                        <div className="flex items-center text-sm text-gray-600 mb-3 gap-3">
                          <div className="flex items-center">
                            <Star size={14} fill={'#efb100'} className="text-yellow-500 mr-1" />
                            <span>{restaurant.review_count} รีวิว</span>
                          </div>
                          
                          {(restaurant.min_price || restaurant.max_price) && (
                            <div className="flex items-center">
                              <span className="font-medium">
                                {(() => {
                                  const priceRange = getPriceRangeDisplay(restaurant.min_price, restaurant.max_price);
                                  return priceRange.symbol;
                                })()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Restaurant hours with improved visibility */}
                        {restaurant.opening_hour && restaurant.closing_hour && (
                          <div className="mb-3 flex items-center text-sm">
                            <Clock className="h-4 w-4 text-gray-500 mr-1.5" />
                            {checkIsOpen(restaurant.opening_hour, restaurant.closing_hour) ? (
                              <span className="text-gray-600">
                                เวลาทำการ: {restaurant.opening_hour.substring(0, 5)} - {restaurant.closing_hour.substring(0, 5)} น.
                              </span>
                            ) : (
                              <span className="text-gray-600">
                                จะเปิดเวลา {restaurant.opening_hour.substring(0, 5)} - {restaurant.closing_hour.substring(0, 5)} น.
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Cuisine types with improved styling */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {restaurant.cuisine_type && restaurant.cuisine_type.length > 0 ? (
                          restaurant.cuisine_type.slice(0, 3).map((cuisine, index) => (
                            <span
                              key={index}
                              className="bg-blue-50 text-blue-700 border border-blue-100 text-xs px-2 py-0.5 rounded-full"
                            >
                              {getCuisineName(cuisine)}
                            </span>
                          ))
                        ) : (
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 text-xs px-2 py-0.5 rounded-full">
                            ไม่ระบุ
                          </span>
                        )}
                        
                        {restaurant.cuisine_type && restaurant.cuisine_type.length > 3 && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 text-xs px-2 py-0.5 rounded-full">
                            +{restaurant.cuisine_type.length - 3} อื่นๆ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;