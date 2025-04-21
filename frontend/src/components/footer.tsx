import { Link } from "react-router-dom";
import logo from "../assets/logo.svg";


export default function Footer() {
    return (
        <footer className="bg-navbar py-4 border-t-20 border-gray-200/30">
            <div className="max-w-4xl mx-auto px-12 flex flex-col items-center">
                <img src={logo} alt="AroiHub Logo" className="h-10 mb-4" />
                <nav className="mb-4">
                    <ul className="flex space-x-6">
                        <li><Link to="/" className="text-gray-700">Home</Link></li>
                        <li><Link to="/news" className="text-gray-700">News</Link></li>
                        <li><Link to="/about" className="text-gray-700">About</Link></li>
                        <li><Link to="/contact" className="text-gray-700">Contact Us</Link></li>
                        <li><Link to="/team" className="text-gray-700">Our Team</Link></li>
                    </ul>
                </nav>
                <hr className="w-full h-px my-4 bg-gray-200 border-0" />
                <div className="w-full flex justify-between items-center text-sm text-gray-400 mt-2">
                    <p>Copyright ©2025; Designed by กบหางกระดิ่ง. All right reserved.</p>
                    <div className="flex space-x-2">
                        <Link to="/th" className="hover:text-gomi">TH</Link>
                        <span>|</span>
                        <Link to="/en" className="hover:text-gomi">EN</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

