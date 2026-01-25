import { useState } from "react";
import "../styles/dashboard.css";
import { createOrder, verifyPayment } from "../api";

const PLANS = [
    { id: 'monthly', name: '1 Month', price: 500, label: 'Get Started' },
    { id: 'quarterly', name: '3 Months', price: 1200, label: 'Best Value', recommended: true },
    { id: 'yearly', name: '1 Year', price: 4000, label: 'Pro Plan' }
];

export default function PaymentModal({ isOpen, onClose, onSuccess }) {
    const [selectedPlan, setSelectedPlan] = useState('quarterly');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    async function handlePayment() {
        setLoading(true);
        try {
            const plan = PLANS.find(p => p.id === selectedPlan);

            // 1. Create Order
            const order = await createOrder(plan.price);

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Sai Aerobics",
                description: `Membership - ${plan.name}`,
                order_id: order.id,
                handler: async function (response) {
                    // 2. Verify Payment
                    try {
                        await verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            planType: plan.id
                        });
                        alert("Payment Successful! Welcome to the family! 🎉");
                        onSuccess();
                        onClose();
                    } catch (err) {
                        alert("Payment verification failed. Please contact support.");
                    }
                },
                prefill: {
                    name: localStorage.getItem("user_name"),
                    contact: "" // Can fetch if available
                },
                theme: {
                    color: "#e85d75"
                }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response) {
                alert("Payment Failed: " + response.error.description);
            });
            rzp1.open();

        } catch (err) {
            console.error(err);
            alert("Failed to initiate payment. " + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content fade-in" style={{ maxWidth: '400px' }}>
                <header className="modal-header">
                    <h3 className="modal-title">Extend Membership</h3>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </header>

                <div className="plans-grid" style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
                    {PLANS.map(plan => (
                        <div
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan.id)}
                            className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''}`}
                            style={{
                                border: selectedPlan === plan.id ? "2px solid var(--primary)" : "1px solid #eee",
                                padding: "15px",
                                borderRadius: "12px",
                                cursor: "pointer",
                                background: selectedPlan === plan.id ? "rgba(232, 93, 117, 0.05)" : "white",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                position: "relative"
                            }}
                        >
                            {plan.recommended && (
                                <span style={{
                                    position: "absolute",
                                    top: "-10px",
                                    right: "10px",
                                    background: "#f59e0b",
                                    color: "white",
                                    fontSize: "10px",
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    fontWeight: "bold"
                                }}>
                                    RECOMMENDED
                                </span>
                            )}

                            <div>
                                <h4 style={{ margin: 0, color: "var(--text-main)" }}>{plan.name}</h4>
                                <p style={{ margin: "5px 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>{plan.label}</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <p style={{ margin: 0, fontWeight: "bold", fontSize: "1.1rem", color: "var(--primary)" }}>₹{plan.price}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    className="big-log-btn"
                    onClick={handlePayment}
                    disabled={loading}
                    style={{ marginTop: "25px", background: "var(--primary)" }}
                >
                    {loading ? "Processing..." : `Pay ₹${PLANS.find(p => p.id === selectedPlan).price}`}
                </button>

                <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#666", marginTop: "10px" }}>
                    Secure payment via Razorpay 🔒
                </p>
            </div>
        </div>
    );
}
