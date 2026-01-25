import { useState, useEffect } from "react";
import "../styles/dashboard.css";
import { getUserProfile } from "../api";

export default function BMI() {
    const [height, setHeight] = useState("");
    const [weight, setWeight] = useState("");
    const [bmi, setBmi] = useState(null);
    const [category, setCategory] = useState("");
    const [color, setColor] = useState("var(--text-muted)");

    useEffect(() => {
        // Try to pre-fill from profile
        getUserProfile().then(data => {
            if (data.height) setHeight(data.height);
            if (data.weight) setWeight(data.weight);
            if (data.height && data.weight) calculateBMI(data.height, data.weight);
        }).catch(() => { });
    }, []);

    const calculateBMI = (h, w) => {
        if (!h || !w) return;

        // BMI = kg / (m * m)
        const heightInMeters = h / 100;
        const value = (w / (heightInMeters * heightInMeters)).toFixed(1);
        setBmi(value);

        if (value < 18.5) {
            setCategory("Underweight");
            setColor("#3b82f6"); // Blue
        } else if (value >= 18.5 && value < 24.9) {
            setCategory("Normal Weight");
            setColor("#10b981"); // Green
        } else if (value >= 25 && value < 29.9) {
            setCategory("Overweight");
            setColor("#f59e0b"); // Orange
        } else {
            setCategory("Obese");
            setColor("#ef4444"); // Red
        }
    };

    const handleCalculate = () => {
        calculateBMI(height, weight);
    };

    return (
        <div className="dash">
            <header className="dash-header" style={{ justifyContent: 'center' }}>
                <h2>BMI Calculator ⚖️</h2>
            </header>

            <div style={{
                background: "var(--card)",
                padding: "24px",
                borderRadius: "24px",
                boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
                maxWidth: "500px",
                margin: "0 auto"
            }}>

                {/* Input Section */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
                    <div>
                        <label className="modern-label">Height (cm)</label>
                        <input
                            type="number"
                            className="modern-input"
                            value={height}
                            onChange={e => setHeight(e.target.value)}
                            placeholder="e.g. 170"
                        />
                    </div>
                    <div>
                        <label className="modern-label">Weight (kg)</label>
                        <input
                            type="number"
                            className="modern-input"
                            value={weight}
                            onChange={e => setWeight(e.target.value)}
                            placeholder="e.g. 70"
                        />
                    </div>
                </div>

                <button
                    onClick={handleCalculate}
                    className="big-log-btn"
                    style={{
                        background: "var(--primary-purple)",
                        color: "white",
                        width: "100%",
                        justifyContent: "center",
                        boxShadow: "0 4px 15px rgba(124, 108, 242, 0.3)"
                    }}
                >
                    Calculate BMI
                </button>

                {/* Result Section */}
                {bmi && (
                    <div className="fade-in" style={{ marginTop: "30px", textAlign: "center" }}>
                        <div style={{
                            width: "140px",
                            height: "140px",
                            borderRadius: "50%",
                            border: `8px solid ${color}`,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 20px auto",
                            background: "var(--bg)",
                            boxShadow: "inset 0 2px 10px rgba(0,0,0,0.05)"
                        }}>
                            <span style={{ fontSize: "2.5rem", fontWeight: "800", color: "var(--text-main)" }}>{bmi}</span>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>BMI</span>
                        </div>

                        <h3 style={{ color: color, margin: "0 0 10px 0", fontSize: "1.4rem" }}>{category}</h3>

                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: "1.6" }}>
                            {category === "Underweight" && "You might need to increase your calorie intake. Let's plan a muscle-gain diet!"}
                            {category === "Normal Weight" && "Great job! Keep maintaining your healthy lifestyle."}
                            {category === "Overweight" && "A balanced diet and regular cardio can help you get back on track."}
                            {category === "Obese" && "Consulting a nutritionist and a consistent workout plan is recommended."}
                        </p>

                        {/* Scale Visualization */}
                        <div style={{ marginTop: "25px", height: "10px", borderRadius: "10px", background: "#e5e7eb", overflow: "hidden", display: "flex" }}>
                            <div style={{ flex: 1, background: "#3b82f6" }} title="Underweight" />
                            <div style={{ flex: 1.5, background: "#10b981" }} title="Normal" />
                            <div style={{ flex: 1, background: "#f59e0b" }} title="Overweight" />
                            <div style={{ flex: 1, background: "#ef4444" }} title="Obese" />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "5px" }}>
                            <span>18.5</span>
                            <span>25.0</span>
                            <span>30.0</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
