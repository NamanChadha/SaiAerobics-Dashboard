import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AuthCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const token = searchParams.get("token");
        const name = searchParams.get("name");
        const role = searchParams.get("role");
        const error = searchParams.get("error");

        if (error) {
            // Handle errors from OAuth
            let errorMessage = "Google login failed. Please try again.";
            if (error === "account_frozen") {
                errorMessage = "Your account is frozen. Please contact admin.";
            } else if (error === "google_auth_failed") {
                errorMessage = "Google authentication failed. Please try again.";
            }

            navigate(`/login?error=${encodeURIComponent(errorMessage)}`);
            return;
        }

        if (token && name) {
            // Store auth data
            localStorage.setItem("token", token);
            localStorage.setItem("user_name", name);
            localStorage.setItem("user_role", role || "member");

            // Redirect based on role
            if (role === "admin") {
                navigate("/admin");
            } else {
                navigate("/dashboard");
            }
        } else {
            // No token received, redirect to login
            navigate("/login?error=Authentication failed");
        }
    }, [navigate, searchParams]);

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            background: "var(--bg)",
            color: "var(--text-main)"
        }}>
            <div style={{
                width: "50px",
                height: "50px",
                border: "4px solid var(--primary)",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
            }} />
            <p style={{ marginTop: "20px", fontSize: "1.1rem" }}>Completing login...</p>
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
