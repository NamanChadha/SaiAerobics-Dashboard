import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import heroBg from "../assets/hero_bg.png";

export default function Home() {
    const navigate = useNavigate();

    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="hero-section" style={{ background: "linear-gradient(135deg, #1a1a1a, #2d1b4e)" }}>
                <div className="hero-overlay" style={{ background: "none" }}>
                    <div className="hero-content fade-in">
                        <h1 className="brand-title animate-pulse-glow" style={{ fontSize: "4rem", color: "#ffeb3b", marginBottom: "10px", textShadow: "0px 0px 20px rgba(255, 235, 59, 0.8)" }}>Sai Aerobics</h1>
                        <h1 className="hero-title">TRANSFORM<br />YOUR BODY & MIND</h1>
                        <p className="hero-subtitle">Join the most energetic aerobics community designed exclusively for women.</p>

                        <div className="hero-buttons">
                            <button onClick={() => navigate("/signup")} className="cta-btn primary-cta">Get Started</button>
                            <button onClick={() => navigate("/login")} className="cta-btn secondary-cta">Login</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <h2 className="section-title">Why Sai Aerobics?</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">🥗</div>
                        <h3>Nutrition Plans</h3>
                        <p>Get personalized meal plans generated based on your goals and preferences.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">📊</div>
                        <h3>Track Progress</h3>
                        <p>Monitor your weight loss journey and attendance streaks with beautiful charts.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">💃</div>
                        <h3>Community Energy</h3>
                        <p>Work out with a supportive community and stay motivated every single day.</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <p>&copy; 2026 Sai Aerobics. All rights reserved.</p>
            </footer>
        </div>
    );
}
