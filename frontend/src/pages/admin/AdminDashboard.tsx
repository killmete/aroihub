import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {Menu} from "lucide-react";

const AdminDashboard: React.FC = () => {
    const location = useLocation();
    const path = location.pathname;

    return (
        <div className="drawer lg:drawer-open font-kanit pt-0 mt-0">
            <input id="admin-drawer" type="checkbox" className="drawer-toggle" />
            <div className="drawer-content flex flex-col p-4 md:p-8">
                {/* Drawer toggle button (visible on mobile) */}
                <div className="flex items-center mb-6 lg:hidden">
                    <label htmlFor="admin-drawer" className="w-10 h-10 btn rounded-full btn-square btn-outline border-transparent hover:bg-blue-accent hover:border-blue-accent">
                        <Menu className="w-6 h-6" />
                    </label>
                    <h1 className="text-3xl font-bold ml-4 text-blue-accent">หน้าควบคุม</h1>
                </div>
                
                {/* Main content - will be replaced by Outlet */}
                <Outlet />
            </div>
            
            <div className="drawer-side z-10 mt-[72px] lg:mt-0">
                <label htmlFor="admin-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
                <ul className="menu p-4 w-60 min-h-full bg-base-200 text-base-content">
                    <li className="mb-5 lg:mt-4">
                        <h1 className="text-xl font-bold text-blue-accent">หน้าควบคุม</h1>
                    </li>
                    <li className={path === '/admin' ? 'font-medium bg-blue-accent text-white rounded-lg' : ''}>
                        <Link to="/admin">หน้าหลัก</Link>
                    </li>
                    <li className={path === '/admin/users' ? 'font-medium bg-blue-accent text-white rounded-lg' : ''}>
                        <Link to="/admin/users">จัดการผู้ใช้</Link>
                    </li>
                    <li className={path === '/admin/restaurants' ? 'font-medium bg-blue-accent text-white rounded-lg' : ''}>
                        <Link to="/admin/restaurants">จัดการร้าน</Link>
                    </li>
                    <li className={path === '/admin/reviews' ? 'font-medium bg-blue-accent text-white rounded-lg' : ''}>
                        <Link to="/admin/reviews">จัดการรีวิว</Link>
                    </li>
                    <li className={path === '/admin/banners' ? 'font-medium bg-blue-accent text-white rounded-lg' : ''}>
                        <Link to="/admin/banners">จัดการแบนเนอร์</Link>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default AdminDashboard;