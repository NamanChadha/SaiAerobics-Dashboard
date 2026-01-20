import { useState, useEffect } from "react";

export default function DarkModeToggle() {
    const [dark, setDark] = useState(true);

    useEffect(() => {
        if (dark) {
            document.body.classList.add("dark");
        } else {
            document.body.classList.remove("dark");
        }
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
                zIndex: 1000
            }}
        >
            {dark ? "🌙" : "☀️"}
        </button>
    );
}
