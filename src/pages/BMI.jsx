import { useState, useEffect } from "react";
import "../styles/dashboard.css";
import { getUserProfile, createPaymentOrder, verifyPaymentSignature } from "../api";

export default function BMI() {
    const [height, setHeight] = useState("");
    const [weight, setWeight] = useState("");
    const [bmi, setBmi] = useState(null);
    const [category, setCategory] = useState("");
    const [color, setColor] = useState("var(--text-muted)");

    // Locking State
    const [loading, setLoading] = useState(true);
    const [isLocked, setIsLocked] = useState(true);
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        checkAccess();
    }, []);

    async function checkAccess() {
        try {
            const profile = await getUserProfile();
            setUserProfile(profile);

            // ACCESS LOGIC:
            // 1. Gold Members = FREE
            // 2. Already Paid (bundled with Nutrition) = FREE
            if (profile.tier === 'Gold' || profile.tier === 'gold' || profile.payment_status === 'PAID') {
                setIsLocked(false);
            } else {
                setIsLocked(true);
            }

            // Pre-fill data regardless of lock status (why not?)
            if (profile.height) setHeight(profile.height);
            if (profile.weight) setWeight(profile.weight);

            // If unlocked and data exists, calculate auto
            if (!isLocked && profile.height && profile.weight) {
                calculateBMI(profile.height, profile.weight);
            }
        } catch (err) {
            console.error("Access Check Error:", err);
        } finally {
            setLoading(false);
        }
    }

    const handlePayment = async () => {
        try {
            // 1. Create Order (Using same endpoint as Nutrition Plan - Bundled)
            const orderResponse = await createPaymentOrder(500); // ₹500 Fee

            if (!orderResponse.success || !orderResponse.order_id) {
                alert(orderResponse.error || "Server error. Please try again.");
                return;
            }

            const options = {
                key: orderResponse.key_id,
                amount: orderResponse.amount,
                currency: orderResponse.currency,
                name: "Sai Aerobics",
                description: "Premium Bundle: Nutrition Plan + BMI",
                order_id: orderResponse.order_id,
                handler: async function (response) {
                    try {
                        const verify = await verifyPaymentSignature({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });

                        if (verify.success) {
                            alert("Payment Successful! Premium Features Unlocked. 🔓");
                            setIsLocked(false);
                            // Auto-refresh profile to get updated status next time
                            getUserProfile();
                        } else {
                            alert(verify.error || "Payment Verification Failed");
                        }
                    } catch (e) {
                        alert("Payment Verification Error: " + e.message);
                    }
                },
                prefill: {
                    name: userProfile?.name || "User",
                    email: userProfile?.email || "user@example.com",
                    contact: userProfile?.phone || "9999999999"
                },
                theme: { color: "#E85D75" }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.open();

        } catch (err) {
            alert("Payment Failed to Start: " + err.message);
        }
    };

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

    if (loading) return <div className="dash" style={{ textAlign: "center", marginTop: "50px", color: "var(--text-main)" }}>Loading...</div>;

    return (
        <div className="dash">
            <header className="dash-header" style={{ justifyContent: 'center' }}>
                <h2>BMI Calculator ⚖️</h2>
            </header>

            {isLocked ? (
                // LOCKED STATE
                <div style={{
                    background: "var(--card)",
                    padding: "30px 20px",
                    borderRadius: "24px",
                    textAlign: "center",
                    maxWidth: "400px",
                    margin: "20px auto",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
                    border: "1px solid var(--border)"
                }}>
                    <div style={{ fontSize: "3rem", marginBottom: "15px" }}>🔒</div>
                    <h3 style={{ margin: "0 0 10px 0", color: "var(--text-main)" }}>Premium Feature</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: "1.5", marginBottom: "25px" }}>
                        Unlock the <strong>BMI Calculator</strong> and <strong>Smart Nutrition Plan</strong> together in one bundle!
                    </p>

                    <div style={{
                        background: "linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 223, 0, 0.05))",
                        padding: "15px",
                        borderRadius: "15px",
                        marginBottom: "25px",
                        border: "1px solid rgba(255, 215, 0, 0.3)"
                    }}>
                        <p style={{ margin: 0, fontWeight: "600", color: "#b45309" }}>Gold Members: FREE Access 🏆</p>
                    </div>

                    <button
                        onClick={handlePayment}
                        style={{
                            width: "100%",
                            padding: "16px",
                            borderRadius: "16px",
                            border: "none",
                            background: "linear-gradient(135deg, #E85D75, #FF8A9B)",
                            color: "white",
                            fontWeight: "700",
                            fontSize: "1.1rem",
                            cursor: "pointer",
                            boxShadow: "0 4px 15px rgba(232, 93, 117, 0.4)",
                            transition: "transform 0.2s"
                        }}
                    >
                        Unlock for ₹500
                    </button>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "15px" }}>
                        Secure one-time payment. Valid for 30 days.
                    </p>
                </div>
            ) : (
                // UNLOCKED STATE
                <div style={{
                    background: "var(--card)",
                    padding: "24px",
                    borderRadius: "24px",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
                    maxWidth: "500px",
                    margin: "0 auto"
                }}>
                    {userProfile?.tier === 'Gold' && (
                        <div style={{
                            textAlign: "center",
                            marginBottom: "20px",
                            padding: "8px",
                            background: "linear-gradient(to right, #fef9c3, #fef08a)",
                            borderRadius: "10px",
                            color: "#854d0e",
                            fontWeight: "600",
                            fontSize: "0.9rem"
                        }}>
                            🏆 Unlocked via Gold Membership
                        </div>
                    )}

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
            )}
        </div>
    );
}
