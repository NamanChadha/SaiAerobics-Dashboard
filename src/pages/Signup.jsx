import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { register } from "../api";
import logo from "../assets/logo.png";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignup() {
    setError("");
    setLoading(true);

    try {
      const res = await register(name, email, password, phone);
      if (!res.ok) throw new Error("Signup failed");

      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page fade-in">
      <div className={`auth-card ${error ? "shake" : ""}`}>
        {/* Brand Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "20px" }}>
          <img
            src={logo}
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

        <h2>Create Account</h2>
        <p>Start your fitness journey today</p>

        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={loading}
        />
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={loading}
        />
        <div style={{ position: "relative", marginBottom: "15px" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
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
        <input
          type="tel"
          placeholder="Phone number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          disabled={loading}
        />

        {error && <p className="error">{error}</p>}

        <button className="primary-btn" onClick={handleSignup} disabled={loading}>
          {loading ? <span className="spinner" /> : "Create Account"}
        </button>

        {success && <p className="success">Account created! Redirecting to login...</p>}

        <span className="switch">
          Already a member? <b onClick={() => navigate("/login")}>Login</b>
        </span>
      </div>
    </div>
  );
}
