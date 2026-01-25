import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import "../styles/auth.css";
import { login, googleAuth } from "../api";
import logoPlaceholder from "../assets/logo_placeholder.svg";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);

    try {
      const data = await login(email, password);
      if (data.error) throw new Error(data.error);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user_name", data.name);
      localStorage.setItem("user_role", data.role);

      setSuccess(true);

      setTimeout(() => {
        if (data.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }, 700);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Google OAuth Login using @react-oauth/google
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError("");

      try {
        // Get user info from Google
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        const userInfo = await userInfoRes.json();

        // Send to our backend
        const data = await googleAuth({
          email: userInfo.email,
          name: userInfo.name,
          uid: userInfo.sub, // Google's unique user ID
          photoURL: userInfo.picture
        });

        if (data.error) throw new Error(data.error);

        localStorage.setItem("token", data.token);
        localStorage.setItem("user_name", data.name);
        localStorage.setItem("user_role", data.role);

        setSuccess(true);

        setTimeout(() => {
          if (data.role === "admin") {
            navigate("/admin");
          } else {
            navigate("/dashboard");
          }
        }, 700);
      } catch (err) {
        console.error("Google Login Error:", err);
        setError(err.message || "Google login failed. Please try again.");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: (error) => {
      console.error("Google Login Error:", error);
      setError("Google login failed. Please try again.");
      setGoogleLoading(false);
    }
  });

  function handleGoogleLogin() {
    setGoogleLoading(true);
    googleLogin();
  }

  return (
    <div className="auth-page fade-in">
      <div className={`auth-card ${error ? "shake" : ""}`}>
        {/* Brand Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "20px" }}>
          <img
            src={logoPlaceholder}
            alt="Sai Aerobics Logo"
            style={{
              width: "45px",
              height: "45px",
              borderRadius: "50%",
              objectFit: "cover"
            }}
          />
          <span style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--text-main)" }}>Sai Aerobics</span>
        </div>

        <h2>Welcome Back</h2>
        <p>Continue your fitness journey</p>

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={loading || googleLoading}
        />

        <div style={{ position: "relative", marginBottom: "15px" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading || googleLoading}
            style={{ width: "100%", marginBottom: 0 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.2rem",
              color: "#aaa"
            }}
          >
            {showPassword ? "👁️" : "🙈"}
          </button>
        </div>

        <div style={{ textAlign: "right", marginTop: "-10px", marginBottom: "15px" }}>
          <span onClick={() => navigate("/forgot-password")} style={{ color: "var(--primary, #E85D75)", fontSize: "0.85rem", cursor: "pointer", fontWeight: "500" }}>
            Forgot Password?
          </span>
        </div>

        {error && <p className="error">{error}</p>}

        <button className="primary-btn" onClick={handleLogin} disabled={loading || googleLoading}>
          {loading ? <span className="spinner" /> : "Continue"}
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", margin: "20px 0", gap: "10px" }}>
          <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }}></div>
          <span style={{ color: "#9ca3af", fontSize: "0.85rem" }}>or</span>
          <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }}></div>
        </div>

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "50px",
            border: "1px solid #e5e7eb",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "0.95rem",
            color: "#374151",
            transition: "all 0.2s"
          }}
        >
          {googleLoading ? (
            <span className="spinner" style={{ borderTopColor: "#E85D75" }} />
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {success && <p className="success">Login successful ✓</p>}

        <span className="switch">
          New here? <b onClick={() => navigate("/signup")}>Sign up</b>
        </span>
      </div>
    </div>
  );
}
