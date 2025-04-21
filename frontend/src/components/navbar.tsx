import logo from "../assets/logo.svg";
import { UserRound, Search, Menu, X } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useRef, FormEvent } from "react";
import Avatar from '@mui/material/Avatar';
import { grey, lightBlue } from '@mui/material/colors';
import Popover from '@mui/material/Popover';

export default function Navbar() {
    const { authState, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const menuRef = useRef<HTMLDivElement>(null);

    // Reset states when route changes
    useEffect(() => {
        setIsMenuOpen(false);
        setAnchorEl(null);
    }, [location.pathname]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setAnchorEl(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
        setIsMenuOpen(false);
        setAnchorEl(null);
    };

    // Function to handle logo clicks - scroll to top if already on home page
    const handleLogoClick = (e: React.MouseEvent) => {
        if (location.pathname === '/') {
            e.preventDefault(); // Prevent default Link behavior
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/restaurants?name=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery("");
        }
    };

    const isAdmin = authState.user?.role_id === 2;

    // Get user profile picture or use placeholder
    const userProfilePicture = authState.user?.profile_picture_url || null;
    const userInitials = authState.user ? 
        `${authState.user.first_name.charAt(0)}${authState.user.last_name.charAt(0)}` : 
        "G";

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleAvatarClick = (event: React.MouseEvent<HTMLDivElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
    const id = open ? 'user-menu-popover' : undefined;

    return (
        <nav className="bg-white sticky top-0 z-50 shadow">
            <div className="max-w-5xl mx-auto p-4 md:p-6">
                {/* Desktop layout */}
                <div className="hidden md:flex justify-between items-center">
                    <div className="flex items-center space-x-5">
                        <Link to="/" onClick={handleLogoClick}>
                            <img src={logo} alt="AroiHub Logo" className="h-10" />
                        </Link>
                        <div className="relative w-full">
                            <form onSubmit={handleSearch}>
                                <div className="flex items-center bg-search rounded-2xl px-4 py-2 shadow-sm shadow-black/40">
                                    <input
                                        type="text"
                                        placeholder="ร้านอาหาร โรงแรม ที่เที่ยว ร้านเสริมสวย หรืออื่นๆ"
                                        className="bg-secondary-grey-200 w-64 md:w-80 lg:w-96 px-3 outline-none rounded-md font-kanit text-gray-700"
                                        value={searchQuery}
                                        onChange={handleSearchInputChange}
                                    />
                                    <button 
                                        type="submit"
                                        className="absolute right-0 top-0 h-full bg-blue-accent px-2 rounded-r-2xl flex items-center justify-center"
                                    >
                                        <Search className="h-7 w-7 text-white" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {authState.isAuthenticated && isAdmin && (
                            <Link to="/admin" className="mr-3">
                                <button className="flex items-center px-3 py-2 btn btn-outline border-blue-accent hover:border-blue-accent-200 border-1 rounded-full hover:bg-blue-accent hover:text-white text-blue-accent">
                                    <span className="font-kanit">Admin Dashboard</span>
                                </button>
                            </Link>
                        )}

                        {/* User avatar with MUI Popover dropdown */}
                        <div ref={menuRef}>
                            <div 
                                className="cursor-pointer"
                                onClick={handleAvatarClick}
                                aria-describedby={id}
                            >
                                {userProfilePicture ? (
                                    <Avatar 
                                        src={userProfilePicture}
                                        alt="User avatar"
                                        sx={{ width: 42, height: 42, border: '2px solid #4287f5' }}
                                    />
                                ) : (
                                    <Avatar 
                                        sx={{ 
                                            bgcolor: authState.isAuthenticated ? lightBlue[500] : grey[500],
                                            width: 42, 
                                            height: 42,
                                            border: '1px solid #4287f5'
                                        }}
                                    >
                                        {authState.isAuthenticated ? userInitials : ""}
                                    </Avatar>
                                )}
                            </div>
                            <Popover
                                id={id}
                                open={open}
                                anchorEl={anchorEl}
                                onClose={handlePopoverClose}
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'right',
                                }}
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                sx={{ marginTop: '0.5rem' }}
                            >
                                <div className="p-2 w-52 font-kanit bg-white rounded-md shadow-lg">
                                    {authState.isAuthenticated ? (
                                        <>
                                            <Link 
                                                to="/profile" 
                                                className="block py-2 px-3 rounded-lg hover:bg-gray-100 text-black transition-colors"
                                                onClick={handlePopoverClose}
                                            >
                                                หน้าโปรไฟล์
                                            </Link>
                                            <button 
                                                onClick={handleLogout}
                                                className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-100 text-black transition-colors"
                                            >
                                                ออกจากระบบ
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Link 
                                                to="/login" 
                                                className="block py-2 px-3 rounded-lg hover:bg-gray-100 text-black transition-colors"
                                                onClick={handlePopoverClose}
                                            >
                                                เข้าสู่ระบบ
                                            </Link>
                                            <Link 
                                                to="/register" 
                                                className="block py-2 px-3 rounded-lg hover:bg-gray-100 text-black transition-colors"
                                                onClick={handlePopoverClose}
                                            >
                                                สมัครสมาชิก
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </Popover>
                        </div>
                    </div>
                </div>

                {/* Mobile layout */}
                <div className="md:hidden">
                    <div className="flex justify-between items-center">
                        <Link to="/" onClick={handleLogoClick}>
                            <img src={logo} alt="AroiHub Logo" className="h-8" />
                        </Link>

                        <div className="flex items-center space-x-2">
                            {/* Mobile user avatar */}
                            <div>
                                {userProfilePicture ? (
                                    <Avatar 
                                        src={userProfilePicture}
                                        alt="User avatar"
                                        sx={{ width: 38, height: 38, border: '1px solid #e2e8f0' }}
                                    />
                                ) : (
                                    <Avatar 
                                        sx={{ 
                                            bgcolor: authState.isAuthenticated ? lightBlue[500] : grey[500],
                                            width: 38, 
                                            height: 38,
                                            border: '1px solid #e2e8f0'
                                        }}
                                    >
                                        {authState.isAuthenticated ? userInitials : ""}
                                    </Avatar>
                                )}
                            </div>

                            <button
                                onClick={toggleMenu}
                                className="p-2 rounded-full hover:bg-gray-100"
                            >
                                {isMenuOpen ? (
                                    <X className="h-6 w-6" color="#000000"/>
                                ) : (
                                    <Menu className="h-6 w-6" color="#000000"/>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Mobile menu dropdown */}
                    {isMenuOpen && (
                        <div className="mt-4 py-3 bg-white rounded-lg shadow-lg">
                            <div className="px-4 mb-4">
                                <form onSubmit={handleSearch}>
                                    <div className="flex items-center bg-search rounded-2xl px-3 py-2 shadow-md shadow-black/40">
                                        <input
                                            type="text"
                                            placeholder="ค้นหา..."
                                            className="bg-secondary-grey-200 w-full px-2 outline-none rounded-md font-kanit text-gray-700 text-sm"
                                            value={searchQuery}
                                            onChange={handleSearchInputChange}
                                        />
                                        <button 
                                            type="submit"
                                            className="bg-blue-accent px-2 py-1 rounded-xl ml-2 flex items-center justify-center"
                                            onClick={(e) => {
                                                handleSearch(e);
                                                setIsMenuOpen(false);
                                            }}
                                        >
                                            <Search className="h-5 w-5 text-white" />
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="space-y-3 px-4">
                                {authState.isAuthenticated ? (
                                    <>
                                        {isAdmin && (
                                            <Link
                                                to="/admin"
                                                onClick={() => setIsMenuOpen(false)}
                                                className="block py-2 px-3 rounded-lg bg-blue-accent/10 hover:bg-blue-accent/20 text-blue-accent font-kanit border border-blue-accent/30 mb-2"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span>Admin Dashboard</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-gauge">
                                                        <path d="m12 14 4-4"></path>
                                                        <path d="M3.34 19a10 10 0 1 1 17.32 0"></path>
                                                    </svg>
                                                </div>
                                            </Link>
                                        )}
                                        
                                        <Link
                                            to="/profile"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="block py-2 px-3 rounded-lg hover:bg-gray-100 text-black font-kanit"
                                        >
                                            <div className="flex items-center">
                                                <UserRound className="h-5 w-5 mr-2" />
                                                หน้าโปรไฟล์
                                            </div>
                                        </Link>

                                        <button
                                            className="w-full flex items-center py-2 px-3 rounded-lg hover:bg-gray-100 text-black font-kanit"
                                            onClick={handleLogout}
                                        >
                                            <UserRound className="h-5 w-5 mr-2" />
                                            ออกจากระบบ
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            to="/login"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="block py-2 px-3 rounded-lg hover:bg-gray-100 text-black font-kanit"
                                        >
                                            <div className="flex items-center">
                                                <UserRound className="h-5 w-5 mr-2" />
                                                เข้าสู่ระบบ
                                            </div>
                                        </Link>

                                        <Link
                                            to="/register"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="block py-2 px-3 rounded-lg hover:bg-gray-100 text-black font-kanit"
                                        >
                                            <div className="flex items-center">
                                                <UserRound className="h-5 w-5 mr-2" />
                                                สมัครสมาชิก
                                            </div>
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}