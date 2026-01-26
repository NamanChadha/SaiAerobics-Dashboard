import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import heroIllustration from "../assets/hero_illustration.png";
import logo from "../assets/logo.png";

export default function Home() {
    const navigate = useNavigate();

    return (
        <div className="landing-page-premium">
            {/* Brand Header */}
            <header style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 8%",
                background: "transparent"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img
                        src={logo}
                        alt="Sai Aerobics Logo"
                        style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            objectFit: "cover"
                        }}
                    />
                    <span style={{
                        fontSize: "1.2rem",
                        fontWeight: "700",
                        color: "var(--text-main)",
                        fontFamily: "Poppins, sans-serif"
                    }}>
                        Sai Aerobics
                    </span>
                </div>
                <button
                    onClick={() => navigate("/login")}
                    style={{
                        background: "transparent",
                        border: "1px solid var(--primary)",
                        color: "var(--primary)",
                        padding: "10px 24px",
                        borderRadius: "50px",
                        fontWeight: "600",
                        cursor: "pointer",
                        fontSize: "0.9rem"
                    }}
                >
                    Login
                </button>
            </header>

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

            {/* About Section */}
            <section className="about-section" style={{
                padding: "60px 8%",
                background: "linear-gradient(135deg, rgba(232, 93, 117, 0.05) 0%, rgba(232, 93, 117, 0.1) 100%)",
                textAlign: "center"
            }}>
                <h2 style={{
                    fontSize: "2rem",
                    fontWeight: "700",
                    color: "var(--text-main)",
                    marginBottom: "15px"
                }}>About Sai Aerobics</h2>
                <p style={{
                    color: "var(--text-muted)",
                    maxWidth: "600px",
                    margin: "0 auto 30px auto",
                    lineHeight: "1.7"
                }}>
                    Sai Aerobics is a women-focused fitness community dedicated to helping you achieve your health goals through personalized aerobics sessions and nutrition guidance. Join us on our journey to a healthier lifestyle!
                </p>

                {/* Social Links */}
                <div style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "20px",
                    flexWrap: "wrap",
                    marginTop: "20px"
                }}>
                    {/* YouTube */}
                    <a
                        href="https://www.youtube.com/@saiaerobics7689"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "14px 28px",
                            borderRadius: "50px",
                            background: "#FF0000",
                            color: "#fff",
                            textDecoration: "none",
                            fontWeight: "600",
                            fontSize: "0.95rem",
                            transition: "transform 0.2s, box-shadow 0.2s",
                            boxShadow: "0 4px 15px rgba(255, 0, 0, 0.3)"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                        onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        YouTube
                    </a>

                    {/* Instagram */}
                    <a
                        href="https://www.instagram.com/saiaerobicss?igsh=M3V3MDV5NGpkNmtw"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "14px 28px",
                            borderRadius: "50px",
                            background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                            color: "#fff",
                            textDecoration: "none",
                            fontWeight: "600",
                            fontSize: "0.95rem",
                            transition: "transform 0.2s, box-shadow 0.2s",
                            boxShadow: "0 4px 15px rgba(220, 39, 67, 0.3)"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                        onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                        Instagram
                    </a>
                </div>

                {/* Contact Info */}
                <p style={{
                    marginTop: "30px",
                    color: "var(--text-muted)",
                    fontSize: "0.9rem"
                }}>
                    📧 Contact: <a href="mailto:saiaerobicsofficial@gmail.com" style={{ color: "var(--primary)", textDecoration: "none" }}>saiaerobicsofficial@gmail.com</a>
                </p>
            </section>

            {/* Simple Footer */}
            <footer className="premium-footer">
                <p>&copy; 2026 Sai Aerobics. Wellness for Women.</p>
            </footer>
        </div>
    );
}
