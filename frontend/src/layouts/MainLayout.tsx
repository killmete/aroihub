import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { Outlet, useLocation } from "react-router-dom";
import LoadingBar from "../components/LoadingBar";

export default function MainLayout() {
    const location = useLocation();
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    return (
        <div className="flex flex-col min-h-screen">
            <LoadingBar />
            <Navbar />
            <main className={`flex-grow ${isAuthPage ? 'bg-white p-0' : 'p-0'}`}>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}