import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import workout from "../assets/workout.svg";
import { login } from "../api";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="auth-page fade-in">
      <div className={`auth-card ${error ? "shake" : ""}`}>
        <img src={workout} />

        <h2>Welcome Back</h2>
        <p>Continue your fitness journey</p>

        <input
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={loading}
        />

        <div style={{ position: "relative", marginBottom: "15px" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
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

        {error && <p className="error">{error}</p>}

        <button className="primary-btn" onClick={handleLogin} disabled={loading}>
          {loading ? <span className="spinner" /> : "Continue"}
        </button>

        {success && <p className="success">Login successful ✓</p>}

        <span className="switch">
          New here? <b onClick={() => navigate("/signup")}>Sign up</b>
        </span>
      </div>
    </div>
  );
}
