import { useState, useEffect, useRef } from 'react';
import { Link } from "react-router-dom";
import { restaurantService } from '@/services/restaurantService';
import { bannerService, Banner } from '@/services/bannerService';
import { Restaurant } from '@/types/restaurant';
import { Star } from 'lucide-react';

// Import category and service icons
import restaurant from "../assets/restaurant.svg";
import desserts from "../assets/desserts.svg";
import travel from "../assets/travel.svg";
import delivery from "../assets/delivery.svg";
import recipe from "../assets/recipe.svg";
import bed from "../assets/bed.svg";
import beauty from "../assets/beauty.svg";
import placeholderImage from "../assets/placeholder.png";

// Import category images
import bbqbuffet from "../assets/category/bbqbuffet.jpg";
import buffet from "../assets/category/buffet.jpg";
import cafe from "../assets/category/cafe.jpg";
import dessertImg from "../assets/category/desserts.jpg";
import dimsum from "../assets/category/dimsum.jpg";
import esan from "../assets/category/esan.jpg";
import grillbuffet from "../assets/category/grillbuffet.jpg";
import japanese from "../assets/category/japanese.jpg";
import korean from "../assets/category/korean.jpg";
import noodles from "../assets/category/noodles.jpg";
import pizza from "../assets/category/pizza.jpg";
import seafood from "../assets/category/seafood.jpg";
import shabu from "../assets/category/shabu.jpg";
import steak from "../assets/category/steak.jpg";
import logger from "@/utils/logger.ts";

// Category data
interface FoodCategory {
    id: number;
    name: string;
    englishName: string;
    displayName: string;
    image: string;
}

const foodCategories: FoodCategory[] = [
    { id: 1, name: "bbqbuffet", englishName: "bbqbuffet", displayName: "หมูกระทะ", image: bbqbuffet },
    { id: 2, name: "buffet", englishName: "buffet", displayName: "บุฟเฟ่ต์", image: buffet },
    { id: 3, name: "cafe", englishName: "cafe", displayName: "ร้านกาแฟ/ชา", image: cafe },
    { id: 4, name: "desserts", englishName: "dessert", displayName: "เบเกอรี่/เค้ก", image: dessertImg },
    { id: 5, name: "dimsum", englishName: "dimsum", displayName: "ติ่มซำ", image: dimsum },
    { id: 6, name: "esan", englishName: "esan", displayName: "อาหารอีสาน", image: esan },
    { id: 7, name: "grillbuffet", englishName: "grillbuffet", displayName: "บุฟเฟ่ต์ปิ้งย่าง", image: grillbuffet },
    { id: 8, name: "japanese", englishName: "japanese", displayName: "อาหารญี่ปุ่น", image: japanese },
    { id: 9, name: "korean", englishName: "korean", displayName: "อาหารเกาหลี", image: korean },
    { id: 10, name: "noodles", englishName: "noodles", displayName: "ก๋วยเตี๋ยว", image: noodles },
    { id: 11, name: "pizza", englishName: "pizza", displayName: "พิซซ่า", image: pizza },
    { id: 12, name: "seafood", englishName: "seafood", displayName: "อาหารทะเล", image: seafood },
    { id: 13, name: "shabu", englishName: "shabu", displayName: "ชาบู", image: shabu },
    { id: 14, name: "steak", englishName: "steak", displayName: "สเต็ก", image: steak },
];

export default function Home() {
    const [activeSlide, setActiveSlide] = useState(0);
    const [activeTab, setActiveTab] = useState('popular');
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [restaurantsLoading, setRestaurantsLoading] = useState(true);
    const [restaurantsError, setRestaurantsError] = useState<string | null>(null);
    const carouselRef = useRef<HTMLDivElement>(null);

    // Fetch banners from database
    useEffect(() => {
        const fetchBanners = async () => {
            setLoading(true);
            try {
                // Fetch active banners from API
                const data = await bannerService.getActiveBanners();
                
                // Sort by display_order and limit to 4 active banners
                const sortedBanners = data
                    .filter(banner => banner.is_active)
                    .sort((a, b) => a.display_order - b.display_order)
                    .slice(0, 4);
                
                setBanners(sortedBanners);
            } catch (error) {
                logger.error("Error fetching banners:", error);
                // Provide empty array if fetch fails
                setBanners([]);
            } finally {
                setLoading(false);
            }
        };

        fetchBanners();
    }, []);

    // Fetch restaurants based on active tab
    useEffect(() => {
        const fetchRestaurants = async () => {
            setRestaurantsLoading(true);
            setRestaurantsError(null);
            
            try {
                let data;
                if (activeTab === 'popular') {
                    // Fetch top-rated restaurants
                    data = await restaurantService.getTopRatedRestaurants(8);
                } else {
                    // Fetch newest restaurants
                    data = await restaurantService.getNewestRestaurants(8);
                }
                
                setRestaurants(data);
            } catch (error) {
                logger.error('Error fetching restaurants:', error);
                setRestaurantsError(error instanceof Error ? error.message : 'Failed to fetch restaurants');
                
                // Set empty array if fetch fails
                setRestaurants([]);
            } finally {
                setRestaurantsLoading(false);
            }
        };
        
        fetchRestaurants();
    }, [activeTab]);

    // Handle smooth slide change
    const handleSlideChange = (index: number) => {
        if (!carouselRef.current) return;
        
        setActiveSlide(index);
        
        const slideWidth = carouselRef.current.offsetWidth;
        const scrollPosition = index * slideWidth;
        
        carouselRef.current.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
        });
    };

    // Auto-update active slide based on scroll position
    useEffect(() => {
        const handleScroll = () => {
            if (!carouselRef.current) return;
            
            const slideWidth = carouselRef.current.offsetWidth;
            const scrollPosition = carouselRef.current.scrollLeft;
            const newActiveSlide = Math.round(scrollPosition / slideWidth);
            
            if (newActiveSlide !== activeSlide) {
                setActiveSlide(newActiveSlide);
            }
        };
        
        const carousel = carouselRef.current;
        if (carousel) {
            carousel.addEventListener('scroll', handleScroll);
            return () => carousel.removeEventListener('scroll', handleScroll);
        }
    }, [activeSlide]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
    };

    // Display placeholder when no banners are available
    const renderPlaceholderBanner = () => (
        <div className="w-full h-116 relative">
            <img 
                src={placeholderImage} 
                alt="Banner placeholder" 
                className="w-full h-full object-cover"
            />
        </div>
    );

    return (
        <div className="w-full font-kanit">
            {/* Main Banner - Full Width */}
            <div className="relative w-full bg-white">
                {loading ? (
                    <div className="w-full h-116 flex items-center justify-center bg-gray-100">
                        <div className="loading loading-spinner loading-lg text-orange-400"></div>
                    </div>
                ) : (
                    <div className="relative">
                        {banners.length > 0 ? (
                            <>
                                <div 
                                    ref={carouselRef}
                                    className="flex w-full h-116 overflow-x-hidden scroll-smooth"
                                >
                                    {banners.map((banner) => (
                                        <div 
                                            key={banner._id} 
                                            className="w-full h-full flex-shrink-0 snap-center"
                                        >
                                            <div className="relative w-full h-full">
                                                <img 
                                                    src={banner.image_url} 
                                                    alt={`Promotion Banner ${banner._id}`} 
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {banners.length > 1 && (
                                    <>
                                        {/* Fixed navigation buttons */}
                                        <div className="absolute flex justify-between transform -translate-y-1/2 left-5 right-5 top-1/2 z-10">
                                            <button 
                                                onClick={() => handleSlideChange((activeSlide - 1 + banners.length) % banners.length)}
                                                className="btn btn-circle btn-sm bg-white text-orange-400 border-none hover:bg-white/90 shadow-md"
                                            >
                                                ❮
                                            </button>
                                            <button 
                                                onClick={() => handleSlideChange((activeSlide + 1) % banners.length)}
                                                className="btn btn-circle btn-sm bg-white text-orange-400 border-none hover:bg-white/90 shadow-md"
                                            >
                                                ❯
                                            </button>
                                        </div>

                                        {/* Carousel Pagination - Dots */}
                                        <div className="absolute z-10 flex justify-center w-full py-2 bottom-2">
                                            <div className="bg-white/40 px-4 py-2 rounded-full flex items-center space-x-2">
                                                {banners.map((_, index) => (
                                                    <button 
                                                        key={index}
                                                        onClick={() => handleSlideChange(index)}
                                                        className={`w-3 h-3 rounded-full ${activeSlide === index ? 'bg-blue-accent' : 'bg-gray-400'} inline-block transition-colors`}
                                                        aria-label={`Go to slide ${index + 1}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            renderPlaceholderBanner()
                        )}
                    </div>
                )}
            </div>

            {/* Category Icons - Similar to the image */}
            <div className="bg-main-background py-3">
                <div className="max-w-4xl mx-auto grid grid-cols-7 gap-2">
                    <div className="flex justify-center">
                        <Link to="/" className="inline-block">
                            <div className="flex flex-col items-center">
                                <div className="bg-yellow-500 p-2 rounded-xl mb-2">
                                    <img src={restaurant} alt="restaurant" className="h-8 w-8" />
                                </div>
                                <span className="text-xs font-medium">ร้านอาหาร</span>
                            </div>
                        </Link>
                    </div>
                    <div className="flex justify-center">
                        <Link to="/" className="inline-block">
                            <div className="flex flex-col items-center">
                                <div className="bg-orange-400 p-2 rounded-xl mb-2">
                                    <img src={desserts} alt="desserts" className="h-8 w-8" />
                                </div>
                                <span className="text-xs font-medium">ของหวาน/กาแฟ</span>
                            </div>
                        </Link>
                    </div>
                    <div className="flex justify-center">
                        <Link to="/" className="inline-block">
                            <div className="flex flex-col items-center">
                                <div className="bg-emerald-600 p-2 rounded-xl mb-2">
                                    <img src={travel} alt="travel" className="h-8 w-8" />
                                </div>
                                <span className="text-xs font-medium">ที่เที่ยว</span>
                            </div>
                        </Link>
                    </div>
                    <div className="flex justify-center">
                        <Link to="/" className="inline-block">
                            <div className="flex flex-col items-center">
                                <div className="bg-green-500 p-2 rounded-xl mb-2">
                                    <img src={delivery} alt="delivery" className="h-8 w-8" />
                                </div>
                                <span className="text-xs font-medium">สั่งเดลิเวอรี</span>
                            </div>
                        </Link>
                    </div>
                    <div className="flex justify-center">
                        <Link to="/" className="inline-block">
                            <div className="flex flex-col items-center">
                                <div className="bg-blue-400 p-2 rounded-xl mb-2">
                                    <img src={recipe} alt="recipe" className="h-8 w-8" />
                                </div>
                                <span className="text-xs font-medium">ทำอาหาร</span>
                            </div>
                        </Link>
                    </div>
                    <div className="flex justify-center">
                        <Link to="/" className="inline-block">
                            <div className="flex flex-col items-center">
                                <div className="bg-red-600 p-2 rounded-xl mb-2">
                                    <img src={bed} alt="accomodation" className="h-8 w-8" />
                                </div>
                                <span className="text-xs font-medium">ที่พัก</span>
                            </div>
                        </Link>
                    </div>
                    <div className="flex justify-center">
                        <Link to="/" className="inline-block">
                            <div className="flex flex-col items-center">
                                <div className="bg-fuchsia-300 p-2 rounded-xl mb-2">
                                    <img src={beauty} alt="cosmetic" className="h-8 w-8" />
                                </div>
                                <span className="text-xs font-medium">บิวตี้</span>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Restaurant Recommendations */}
            <div className="bg-white p-5">
                <div className="max-w-5xl mx-auto p-4 bg-main-background rounded-xl">
                    <h2 className="text-lg font-medium mb-1 mt-2">แนะนำสำหรับคุณ</h2>

                    {/* Tab Navigation */}
                    <div className="flex mb-0">
                        <button
                            onClick={() => handleTabChange('popular')}
                            className={`px-8 ${activeTab === 'popular' ? 'border-b-2 bg-violet-200 border-violet-200 text-sky-600 font-medium' : 'text-gray-600'}`}
                        >
                            ร้านยอดนิยม
                        </button>
                        <button
                            onClick={() => handleTabChange('nearby')}
                            className={`px-8 ${activeTab === 'nearby' ? 'border-b-2 bg-violet-200 border-violet-200 text-sky-600 font-medium' : 'text-gray-600'}`}
                        >
                            ร้านใหม่มาแรง
                        </button>
                    </div>
                    <hr className="border-1 text-gray-200 mb-4 w-full"/>
                    {/* Restaurant Grid */}
                    {restaurantsLoading ? (
                        <div className="py-8 text-center">
                            <div className="loading loading-spinner loading-md text-orange-400 mx-auto"></div>
                            <p className="mt-2 text-gray-500">กำลังโหลดร้านอาหาร...</p>
                        </div>
                    ) : restaurantsError ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            <p>ไม่สามารถโหลดข้อมูลร้านอาหารได้</p>
                            <p className="text-sm">{restaurantsError}</p>
                        </div>
                    ) : restaurants.length === 0 ? (
                        <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <p className="text-gray-500">ไม่พบร้านอาหาร</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {restaurants.map((restaurant) => (
                                <Link
                                    key={restaurant.id}
                                    to={`/restaurants/${restaurant.id}`}
                                    className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col group"
                                >
                                    <div className="h-44 bg-gray-200 overflow-hidden">
                                        {restaurant.images && restaurant.images.length > 0 ? (
                                            <img
                                                src={restaurant.images[0]}
                                                alt={restaurant.name}
                                                className="w-full h-full object-cover transition-transform duration-500 transform group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <p className="text-gray-400">ไม่มีรูปภาพ</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* This makes the bottom content flexible */}
                                    <div className="p-3 flex flex-col flex-1">
                                        <h3 className="font-bold text-lg">{restaurant.name}</h3>

                                        {restaurant.address && (
                                            <p className="text-sm text-gray-600 mb-2">{restaurant.address}</p>
                                        )}

                                        {/* Flexible space to push rating section down */}
                                        <div className="flex-1">
                                            <div className="flex flex-wrap gap-1 mb-2">
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-auto">
                                            {restaurant.cuisine_type && restaurant.cuisine_type.length > 0 ? (
                                                restaurant.cuisine_type.map((cuisine, index) => (
                                                    <span
                                                        key={index}
                                                        className="bg-blue-100 text-blue-700 text-sm px-2 py-1 rounded-md"
                                                    >
                                                    {cuisine}
                                                  </span>
                                                ))
                                            ) : (
                                                <span className="bg-blue-100 text-blue-700 text-sm px-2 py-1 rounded-md">
                                              ไม่ระบุ
                                            </span>
                                            )}
                                        </div>

                                        <div className="flex items-center pt-4 mt-auto">
                                            <div className="bg-red-600 text-white px-2 rounded flex items-center mr-2">
                                            <span className="font-bold">
                                              {restaurant.average_rating ? Number(restaurant.average_rating).toFixed(1) : '0.0'}
                                            </span>
                                                <Star size={18} fill={'white'} className="ml-1" />
                                            </div>
                                            <span className="text-sm font-light text-gray-600">
                                            {restaurant.review_count} รีวิว
                                          </span>
                                        </div>

                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* View All Button */}
                    <div className="flex justify-center mt-6">
                        <Link to="/restaurants" className="bg-orange-400 hover:bg-orange-500 text-white py-2 px-8 rounded-full transition-colors">
                            ดูทั้งหมด
                        </Link>
                    </div>
                </div>
            </div>

            <div className="bg-white p-5">
                <div className="max-w-5xl mx-auto p-4 bg-main-background rounded-xl">
                    <h2 className="text-lg font-medium mb-1 mt-2">หาร้านตามประเภทอาหาร</h2>

                    {/* Scrollable Grid Container */}
                    <div className="overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4">
                        <div
                            className="grid grid-rows-2 grid-flow-col gap-3 w-max
                   auto-cols-[minmax(8rem,1fr)] sm:auto-cols-[minmax(9rem,1fr)]
                   md:auto-cols-[minmax(10rem,1fr)] lg:auto-cols-[minmax(11rem,1fr)]"
                        >
                            {foodCategories.map((category) => (
                                <Link
                                    key={category.id}
                                    to={`/restaurants?cuisine=${encodeURIComponent(category.englishName)}`}
                                    className="relative snap-start bg-orange-50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow w-40 h-36 group"
                                >
                                    {/* Image */}
                                    <img
                                        src={category.image}
                                        alt={category.displayName}
                                        className="w-full h-full object-cover transition-transform duration-500 transform group-hover:scale-120"
                                    />

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-black/40"></div>

                                    {/* Centered Text */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <p className="text-white text-m font-medium px-3 pt-18 text-center">
                                            {category.displayName}
                                        </p>
                                    </div>
                                </Link>

                            ))}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}