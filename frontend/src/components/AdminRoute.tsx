import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminRouteProps {
    children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
    const { authState } = useAuth();
    const isAdmin = authState.user?.role_id === 2;

    if (authState.loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (!authState.isAuthenticated) {
        return <Navigate to="/login" />;
    }

    if (!isAdmin) {
        return <Navigate to="/" />;
    }

    return <>{children}</>;
};

export default AdminRoute;