import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
    RefreshCw, 
    ImageIcon, 
    Users, 
    Store, 
    Star, 
    LayoutDashboard,
    ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import logger from '../../utils/logger';

// Define types for our activities
interface Activity {
    type: 'restaurant' | 'review' | 'banner';
    id: number | string;
    name?: string;
    restaurant_name?: string;
    title?: string;
    rating?: number;
    created_at: string;
}

const AdminHome: React.FC = () => {
    const [updating, setUpdating] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<string | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [activitiesLoading, setActivitiesLoading] = useState(false);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [stats, setStats] = useState({
        users: 0,
        restaurants: 0,
        reviews: 0,
        banners: 0
    });
    
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    
    const fetchDashboardStats = async () => {
        try {
            setStatsLoading(true);
            const token = localStorage.getItem('token');
            
            if (!token) {
                toast.error('Authentication required');
                return;
            }
            
            const response = await fetch(`${API_URL}/admin/stats`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch dashboard statistics');
            }
            
            const data = await response.json();
            setStats(data);
        } catch (error) {
            logger.error('Error fetching dashboard stats:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to fetch dashboard statistics');
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchRecentActivity = async () => {
        try {
            setActivitiesLoading(true);
            const token = localStorage.getItem('token');
            
            if (!token) {
                toast.error('Authentication required');
                return;
            }
            
            const response = await fetch(`${API_URL}/admin/activities`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch recent activities');
            }
            
            const data = await response.json();
            setActivities(data);
        } catch (error) {
            logger.error('Error fetching recent activities:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to fetch recent activities');
        } finally {
            setActivitiesLoading(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                await Promise.all([
                    fetchDashboardStats(),
                    fetchRecentActivity()
                ]);
            } catch (error) {
                logger.error('Error updating restaurant stats:', error);
            }
        };
        
        fetchData();
        
        // Refresh stats every 5 minutes
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        
        return () => clearInterval(interval);
    }, []);

    const updateAllRestaurantStats = async () => {
        try {
            setUpdating(true);
            const token = localStorage.getItem('token');
            
            if (!token) {
                toast.error('Authentication required');
                return;
            }

            const response = await fetch(`${API_URL}/restaurants/update-all-stats`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update restaurant statistics');
            }

            const result = await response.json();
            const currentTime = new Date().toLocaleString();
            
            toast.success(`Updated ${result.updated_restaurants} restaurants successfully`);
            setLastUpdate(currentTime);
            
            localStorage.setItem('lastStatsUpdate', currentTime);
            
            // Refresh dashboard stats after updating
            fetchDashboardStats();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
            logger.error('Error updating restaurant stats:', error);
        } finally {
            setUpdating(false);
        }
    };
    
    // Format relative time in Thai language
    const formatRelativeTime = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return formatDistanceToNow(date, { addSuffix: true, locale: th });
        } catch (error) {
            logger.error('Error while formatting time: ', error);
            return 'ไม่ทราบเวลา';
        }
    };
    
    // Render activity item based on type
    const renderActivityItem = (activity: Activity) => {
        switch (activity.type) {
            case 'restaurant':
                return (
                    <div key={`restaurant-${activity.id}`} className="py-3 flex justify-between items-center">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                <Store className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="font-medium">ร้าน {activity.name}</p>
                                <p className="text-gray-500 text-xs">เพิ่มเมื่อ {formatRelativeTime(activity.created_at)}</p>
                            </div>
                        </div>
                        <div className="bg-green-50 text-green-600 text-xs py-1 px-2 rounded">
                            NEW
                        </div>
                    </div>
                );
            
            case 'review':
                return (
                    <div key={`review-${activity.id}`} className="py-3 flex justify-between items-center">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                                <Star className="h-5 w-5 text-yellow-500" />
                            </div>
                            <div>
                                <p className="font-medium">รีวิวใหม่สำหรับร้าน {activity.restaurant_name}</p>
                                <p className="text-gray-500 text-xs">เพิ่มเมื่อ {formatRelativeTime(activity.created_at)}</p>
                            </div>
                        </div>
                        <div className="bg-green-50 text-green-600 text-xs py-1 px-2 rounded">
                            NEW
                        </div>
                    </div>
                );
            
            case 'banner':
                return (
                    <div key={`banner-${activity.id}`} className="py-3 flex justify-between items-center">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                <ImageIcon className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="font-medium">แบนเนอร์ใหม่</p>
                                <p className="text-gray-500 text-xs">เพิ่มเมื่อ {formatRelativeTime(activity.created_at)}</p>
                            </div>
                        </div>
                        <div className="bg-green-50 text-green-600 text-xs py-1 px-2 rounded">
                            NEW
                        </div>
                    </div>
                );
            
            default:
                return null;
        }
    };
    
    return (
        <div className="w-full">
            <h2 className="text-3xl font-bold mb-6 text-blue-accent hidden lg:block">สรุปข้อมูล</h2>
            
            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h3 className="text-xl font-medium mb-4 flex items-center">
                    <LayoutDashboard className="h-5 w-5 mr-2 text-blue-accent" />
                    <span>แดชบอร์ด</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-blue-50 p-2 rounded-lg">
                                <Users className="h-5 w-5 text-blue-500" />
                            </div>
                            <h3 className="text-gray-500 text-sm">ผู้ใช้งาน</h3>
                        </div>
                        <div className="flex items-end justify-between">
                            {statsLoading ? (
                                <div className="h-6 w-16 bg-gray-200 animate-pulse rounded"></div>
                            ) : (
                                <p className="text-2xl font-bold text-gray-800">{stats.users}</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-green-50 p-2 rounded-lg">
                                <Store className="h-5 w-5 text-green-500" />
                            </div>
                            <h3 className="text-gray-500 text-sm">ร้านอาหาร</h3>
                        </div>
                        <div className="flex items-end justify-between">
                            {statsLoading ? (
                                <div className="h-6 w-16 bg-gray-200 animate-pulse rounded"></div>
                            ) : (
                                <p className="text-2xl font-bold text-gray-800">{stats.restaurants}</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-yellow-50 p-2 rounded-lg">
                                <Star className="h-5 w-5 text-yellow-500" />
                            </div>
                            <h3 className="text-gray-500 text-sm">รีวิวทั้งหมด</h3>
                        </div>
                        <div className="flex items-end justify-between">
                            {statsLoading ? (
                                <div className="h-6 w-16 bg-gray-200 animate-pulse rounded"></div>
                            ) : (
                                <p className="text-2xl font-bold text-gray-800">{stats.reviews}</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-purple-50 p-2 rounded-lg">
                                <ImageIcon className="h-5 w-5 text-purple-500" />
                            </div>
                            <h3 className="text-gray-500 text-sm">แบนเนอร์</h3>
                        </div>
                        <div className="flex items-end justify-between">
                            {statsLoading ? (
                                <div className="h-6 w-16 bg-gray-200 animate-pulse rounded"></div>
                            ) : (
                                <p className="text-2xl font-bold text-gray-800">{stats.banners}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">ล่าสุดเพิ่มเข้ามา</h3>
                        <Link to="/admin/restaurants" className="text-sm text-blue-accent hover:underline flex items-center">
                            ดูทั้งหมด
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <div className="border-t pt-4">
                        {activitiesLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((item) => (
                                    <div key={item} className="py-3 flex items-center">
                                        <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse mr-3"></div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-2"></div>
                                            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : activities.length > 0 ? (
                            <div className="flex flex-col divide-y">
                                {activities.map(activity => renderActivityItem(activity))}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-gray-500">
                                <p>ไม่มีกิจกรรมล่าสุด</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow text-white p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                            <RefreshCw className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold mb-3 text-white">อัปเดตเรตติ้งร้านอาหาร</h2>
                    <p className="text-white/80 mb-6">อัปเดตคะแนนเฉลี่ยและจำนวนรีวิวของร้านอาหารทั้งหมดให้ตรงกับข้อมูลปัจจุบัน</p>
                    
                    <button 
                        onClick={updateAllRestaurantStats}
                        disabled={updating}
                        className={`mt-auto flex items-center justify-center gap-2 py-3 px-5 rounded-lg transition-all ${
                            updating 
                                ? 'bg-white/20 cursor-not-allowed' 
                                : 'bg-white text-blue-600 hover:bg-blue-50 hover:shadow-md'
                        }`}
                    >
                        {updating ? (
                            <>
                                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                <span>กำลังอัปเดต...</span>
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4" />
                                <span>อัปเดตเดี๋ยวนี้</span>
                            </>
                        )}
                    </button>
                    
                    {lastUpdate && (
                        <p className="mt-4 text-sm text-white/80">
                            อัปเดตล่าสุด: {lastUpdate}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminHome;