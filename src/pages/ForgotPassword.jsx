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

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const res = await forgotPassword(email);
            if (res.error) throw new Error(res.error);
            setMessage("Check your email for the reset link!");
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

                    <button className="primary-btn" disabled={loading}>
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
