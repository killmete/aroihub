import React, { useEffect } from 'react';
import {BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigationType} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingProvider, useLoading } from './context/LoadingContext';
import Login from './pages/LoginPage';
import Register from './pages/RegisterPage';
import Home from './pages/Home';
import MainLayout from "./layouts/MainLayout.tsx";
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminHome from './pages/admin/AdminHome';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRestaurants from './pages/admin/AdminRestaurants';
import AdminReviews from './pages/admin/AdminReviews';
import AdminBanners from './pages/admin/AdminBanners';
import AdminRoute from './components/AdminRoute';
import ProfileDashboard from './pages/profile/ProfileDashboard';
import ProfilePage from './pages/profile/ProfilePage';
import RestaurantDetail from './pages/restaurants/RestaurantDetail';
import SearchPage from './pages/restaurants/SearchPage';
import AddReview from './pages/restaurants/AddReview';
import ScrollToTop from './components/ScrollToTop';
import { Toaster } from 'sonner';

// Navigation event tracker component
const NavigationEvents: React.FC = () => {
    const location = useLocation();
    const navType = useNavigationType();
    const { startLoading, completeLoading } = useLoading();

    useEffect(() => {
        if (navType !== 'PUSH' && navType !== 'POP') return;

        let isCompleted = false;

        const handleLoad = () => {
            if (!isCompleted) {
                completeLoading();
                isCompleted = true;
            }
        };

        const handleDOMContentLoaded = () => {
            // Wait for full load after DOM is ready
            if (document.readyState === 'interactive') {
                window.addEventListener('load', handleLoad);
            }
        };

        startLoading();

        if (document.readyState === 'complete') {
            handleLoad(); // already fully loaded
        } else if (document.readyState === 'interactive') {
            handleDOMContentLoaded();
        } else {
            document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
            window.addEventListener('load', handleLoad);
        }

        return () => {
            document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded);
            window.removeEventListener('load', handleLoad);
        };
    }, [location.pathname]); // only depend on path

    return null;
};



// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authState } = useAuth();

    if (authState.loading) {
        return <div>Loading...</div>;
    }

    if (!authState.isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <>
      <NavigationEvents />
      <Routes>
        <Route element={<MainLayout />}>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/restaurants" element={<SearchPage />} />
          <Route path="/restaurants/:id" element={<RestaurantDetail />} />
          
          {/* Protected route for adding reviews */}
          <Route path="/restaurants/:id/reviews" element={
            <ProtectedRoute>
              <AddReview />
            </ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }>
            <Route index element={<AdminHome />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="restaurants" element={<AdminRestaurants />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="banners" element={<AdminBanners />} />
          </Route>

          {/* Profile routes */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfileDashboard />
            </ProtectedRoute>
          }>
            <Route index element={<ProfilePage />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
      <AuthProvider>
          <LoadingProvider>
              <Router>
                  <ScrollToTop />
                  <AppRoutes />
                  <Toaster
                      position="bottom-right"
                      expand={false}
                      richColors
                  />
              </Router>
          </LoadingProvider>
      </AuthProvider>
  );
};


export default App;