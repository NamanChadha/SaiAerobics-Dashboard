import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/burger.css";

export default function BurgerMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Hide menu on auth pages and admin dashboard
    const hideMenu = ["/", "/login", "/signup", "/forgot-password", "/admin"].includes(location.pathname) || location.pathname.startsWith("/reset-password");
    if (hideMenu) return null;

    function handleLogout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user_name");
        localStorage.removeItem("user_role");
        navigate("/");
    }

    const isActive = (path) => location.pathname === path ? "active" : "";

    return (
        <>
            <button className="burger-btn" onClick={() => setIsOpen(true)}>
                ☰
            </button>

            <div className={`menu-overlay ${isOpen ? "open" : ""}`} onClick={() => setIsOpen(false)}>
                <div className="menu-drawer" onClick={e => e.stopPropagation()}>
                    <header className="menu-header">
                        <h2 className="menu-title"></h2>
                        <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
                    </header>

                    <nav className="menu-links">
                        <Link to="/dashboard" className={`menu-link ${isActive('/dashboard')}`} onClick={() => setIsOpen(false)}>
                            <span>🏠</span> Dashboard
                        </Link>
                        <Link to="/nutrition" className={`menu-link ${isActive('/nutrition')}`} onClick={() => setIsOpen(false)}>
                            <span>🍎</span> Daily Eatables
                        </Link>
                        <Link to="/bmi" className={`menu-link ${isActive('/bmi')}`} onClick={() => setIsOpen(false)}>
                            <span>⚖️</span> BMI Calculator
                        </Link>
                        <Link to="/profile" className={`menu-link ${isActive('/profile')}`} onClick={() => setIsOpen(false)}>
                            <span>👤</span> My Profile
                        </Link>
                    </nav>

                    <div className="menu-footer">
                        <button className="logout-btn" onClick={handleLogout}>
                            <span>🚪</span> Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
