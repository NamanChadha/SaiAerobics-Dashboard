import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import heroIllustration from "../assets/hero_illustration.png";

export default function Home() {
    const navigate = useNavigate();

    return (
        <div className="landing-page-premium">
            {/* Navbar Placeholder (if needed, or just keep it simple) */}

            {/* Hero Section */}
            <section className="premium-hero">
                <div className="hero-text-content fade-in-up">
                    <h1 className="premium-title">
                        Move better.<br />
                        Feel stronger.<br />
                        <span className="highlight-text">Live healthier.</span>
                    </h1>
                    <p className="premium-subtitle">
                        Personalized aerobics & diet plans designed exclusively for women.
                    </p>

                    <div className="premium-buttons">
                        <button onClick={() => navigate("/signup")} className="pill-btn primary">
                            Get Started
                        </button>
                        <button onClick={() => navigate("/login")} className="pill-btn secondary">
                            Login
                        </button>
                    </div>
                </div>

                <div className="hero-visual fade-in-delay">
                    <img src={heroIllustration} alt="Active Lifestyle" className="hero-img" />
                </div>
            </section>

            {/* Value Cards Section */}
            <section className="values-section">
                <div className="values-grid">
                    <div className="value-card">
                        <div className="card-icon">🧘‍♀️</div>
                        <h3>Personalised Aerobics</h3>
                        <p>Workouts adapted to your pace and body type.</p>
                    </div>
                    <div className="value-card">
                        <div className="card-icon">🥗</div>
                        <h3>Custom Diet Plans</h3>
                        <p>Nutrition that fits your lifestyle, not just a trendy diet.</p>
                    </div>
                    <div className="value-card">
                        <div className="card-icon">📈</div>
                        <h3>Visible Results</h3>
                        <p>Track your progress and see the change in weeks.</p>
                    </div>
                </div>
            </section>

            {/* Social Proof */}
            <section className="social-proof">
                <div className="testimonial-box">
                    <p className="testimonial-text">"I lost 6 kg in 2 months and feel more energetic than ever. It's not just a workout, it's a lifestyle change!"</p>
                    <div className="testimonial-author">
                        <span className="author-dot"></span>
                        <span>Priya Sharma, Member</span>
                    </div>
                </div>
            </section>

            {/* Simple Footer */}
            <footer className="premium-footer">
                <p>&copy; 2026 Sai Aerobics. Wellness for Women.</p>
            </footer>
        </div>
    );
}
