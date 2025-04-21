import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ProfileProvider } from '../../context/ProfileContext';
import { Menu, User } from 'lucide-react';

const ProfileDashboard: React.FC = () => {
    const location = useLocation();
    const path = location.pathname;

    // Use the location pathname for the key to force remounting when navigation occurs
    const dashboardKey = `profile-dashboard-${location.pathname}`;

    return (
        <ProfileProvider>
            {/* Use a simple key based on the current path */}
            <div
                key={dashboardKey}
                className="drawer lg:drawer-open font-kanit pt-0 mt-0"
            >
                <input id="profile-drawer" type="checkbox" className="drawer-toggle" />
                <div className="drawer-content flex flex-col p-4 md:p-2">
                    {/* Drawer toggle button (visible on mobile) */}
                    <div className="flex items-center mb-6 lg:hidden">
                        <label htmlFor="profile-drawer" className="btn rounded-full btn-square btn-outline border-transparent hover:bg-yellow-accent hover:border-yellow-accent">
                            <Menu className="w-5 h-5" />
                        </label>
                        <h1 className="text-2xl font-bold ml-4 text-yellow-accent">ข้อมูลส่วนตัว</h1>
                    </div>

                    {/* Main content - will be replaced by Outlet */}
                    <div className="bg-white w-full p-4 md:p-6 rounded-lg shadow-md border border-gray-200">
                        <Outlet />
                    </div>
                </div>

                <div className="drawer-side z-10 mt-[72px] lg:mt-0">
                    <label htmlFor="profile-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
                    <ul className="menu p-4 w-60 min-h-full bg-white text-base-content border-r border-gray-200 shadow-md">
                        <li className="mb-5 lg:mt-4">
                            <h1 className="text-xl font-bold text-yellow-accent">โปรไฟล์ของฉัน</h1>
                        </li>
                        <li className={path === '/profile' ? 'font-medium bg-yellow-accent text-white rounded-lg mb-2' : 'mb-2'}>
                            <Link to="/profile" className="flex items-center">
                                <User className="w-4 h-4 mr-2" />
                                ข้อมูลส่วนตัว
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </ProfileProvider>
    );
};

export default ProfileDashboard;