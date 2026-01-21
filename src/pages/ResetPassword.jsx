import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/auth.css";
import { resetPassword } from "../api";

export default function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        setError("");
        setMessage("");

        try {
            const res = await resetPassword(token, password);
            if (res.error) throw new Error(res.error);
            setMessage("Password reset successful! Redirecting...");
            setTimeout(() => navigate("/login"), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page fade-in">
            <div className="auth-card">
                <h2>New Password</h2>
                <p>Enter your new password below</p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="New Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="styled-input"
                    />
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        className="styled-input"
                    />

                    {error && <p className="error">{error}</p>}
                    {message && <p className="success">{message}</p>}

                    <button className="primary-btn" disabled={loading}>
                        {loading ? <span className="spinner" /> : "Reset Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}
