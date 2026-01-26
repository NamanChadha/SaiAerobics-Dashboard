import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { forgotPassword, resetPassword } from "../api";

export default function ForgotPassword() {
    const navigate = useNavigate();

    // Steps: 1 = Email, 2 = Verify OTP & Reset
    const [step, setStep] = useState(1);

    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [debugOtp, setDebugOtp] = useState("");

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccessMsg("");
        setDebugOtp("");

        try {
            const res = await forgotPassword(email);
            if (res.error) throw new Error(res.error);

            setSuccessMsg("OTP sent! Please check your email.");

            if (res.debug_otp) {
                setDebugOtp(res.debug_otp);
            }

            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            setLoading(false);
            return;
        }

        try {
            const res = await resetPassword(email, otp, newPassword);
            if (res.error) throw new Error(res.error);

            setSuccessMsg("Password reset successfully! Redirecting...");
            setTimeout(() => navigate("/login"), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page fade-in">
            <div className="auth-card">
                <h2>{step === 1 ? "Reset Password" : "Verify & Set Password"}</h2>
                <p style={{ marginBottom: "20px" }}>
                    {step === 1
                        ? "Enter your email to receive a One-Time Password (OTP)."
                        : `Enter the OTP sent to ${email} and your new password.`}
                </p>

                {error && <p className="error" style={{ marginBottom: "15px" }}>{error}</p>}
                {successMsg && <p className="success" style={{ marginBottom: "15px" }}>{successMsg}</p>}

                {step === 1 && (
                    <form onSubmit={handleSendOtp}>
                        <div style={{ marginBottom: "15px" }}>
                            <label className="modern-label">Email Address</label>
                            <input
                                type="email"
                                className="styled-input"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Ex: john@example.com"
                                required
                            />
                        </div>
                        <button className="primary-btn" disabled={loading}>
                            {loading ? "Sending..." : "Send OTP"}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleResetPassword}>
                        {debugOtp && (
                            <div style={{ padding: "10px", background: "#fef9c3", color: "#854d0e", borderRadius: "8px", marginBottom: "15px", fontSize: "0.9rem", textAlign: "center" }}>
                                <strong>Dev Mode OTP:</strong> {debugOtp}
                            </div>
                        )}

                        <div style={{ marginBottom: "15px" }}>
                            <label className="modern-label">Enter OTP</label>
                            <input
                                type="text"
                                className="styled-input"
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                                placeholder="6-digit code"
                                maxLength={6}
                                required
                                autoComplete="off"
                                name="otp_field_random"
                                style={{ letterSpacing: "2px", textAlign: "center", fontSize: "1.2rem" }}
                            />
                        </div>

                        <div style={{ marginBottom: "15px" }}>
                            <label className="modern-label">New Password</label>
                            <input
                                type="password"
                                className="styled-input"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Min 6 characters"
                                required
                                autoComplete="new-password"
                            />
                        </div>

                        <button className="primary-btn" disabled={loading}>
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setStep(1); setError(""); setSuccessMsg(""); }}
                            className="secondary-btn"
                            style={{ marginTop: "10px", width: "100%" }}
                        >
                            Back to Email
                        </button>
                    </form>
                )}

                <button onClick={() => navigate("/login")} className="link-btn" style={{ marginTop: "20px" }}>
                    Back to Login
                </button>
            </div>
        </div>
    );
}
