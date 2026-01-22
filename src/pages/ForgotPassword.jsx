import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { forgotPassword } from "../api";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [debugLink, setDebugLink] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");
        setDebugLink("");

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address.");
            setLoading(false);
            return;
        }

        try {
            const res = await forgotPassword(email);
            if (res.error) throw new Error(res.error);
            setMessage(res.message || "Check your email for the reset link!");
            // If server returns a debug link (dev mode), display it
            if (res.debug_link) {
                setDebugLink(res.debug_link);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page fade-in">
            <div className="auth-card">
                <h2>Reset Password</h2>
                <p>Enter your email to receive a reset link</p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="styled-input"
                    />

                    {error && <p className="error">{error}</p>}
                    {message && <p className="success">{message}</p>}

                    {/* Dev Mode: Show clickable link if email fails */}
                    {debugLink && (
                        <div style={{ marginTop: "15px", padding: "10px", background: "#fffbcc", borderRadius: "8px", fontSize: "0.85rem" }}>
                            <strong>Dev Link:</strong>{" "}
                            <a href={debugLink} style={{ color: "#0066cc", wordBreak: "break-all" }}>
                                {debugLink}
                            </a>
                        </div>
                    )}

                    <button className="primary-btn" disabled={loading} style={{ marginTop: "20px" }}>
                        {loading ? <span className="spinner" /> : "Send Reset Link"}
                    </button>
                </form>

                <button onClick={() => navigate("/login")} className="secondary-btn" style={{ marginTop: "15px", width: "100%" }}>
                    Back to Login
                </button>
            </div>
        </div>
    );
}
