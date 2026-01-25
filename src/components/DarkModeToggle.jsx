import { useState, useEffect } from "react";

export default function DarkModeToggle() {
    // Initialize from localStorage, default to light mode (false)
    const [dark, setDark] = useState(() => {
        const saved = localStorage.getItem("darkMode");
        return saved === "true"; // Default to light mode if not set
    });

    useEffect(() => {
        if (dark) {
            document.body.classList.add("dark");
        } else {
            document.body.classList.remove("dark");
        }
        // Save preference to localStorage
        localStorage.setItem("darkMode", dark.toString());
    }, [dark]);

    return (
        <button
            onClick={() => setDark(!dark)}
            style={{
                position: "fixed",
                top: "20px",
                right: "20px",
                background: "var(--card)",
                color: "var(--text-main)",
                border: "1px solid var(--text-muted)",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                zIndex: 1000,
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
            }}
            title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {dark ? "🌙" : "☀️"}
        </button>
    );
}
