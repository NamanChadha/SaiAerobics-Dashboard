import { useState } from "react";
import { saveWeight } from "../api";

export default function WeightModal({ isOpen, onClose, onSave }) {
    const [weight, setWeight] = useState(60.0); // Default start
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    function adjustWeight(amount) {
        setWeight(prev => Math.max(0, parseFloat((Number(prev) + amount).toFixed(1))));
    }

    async function handleSave() {
        if (!weight) return;
        setLoading(true);
        try {
            await saveWeight(weight);
            onSave(weight);
            onClose();
        } catch (err) {
            alert("Failed to save weight: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
                <div style={{ textAlign: "center", marginBottom: "25px" }}>
                    <h3 style={{ margin: "0 0 5px 0", fontSize: "1.5rem", color: "var(--text-main)" }}>Log Weight</h3>
                    <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>Today's entry</p>
                </div>

                <div className="stepper-container">
                    <button className="step-btn" onClick={() => adjustWeight(-0.5)}>−</button>
                    <div className="weight-display">
                        <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="weight-input"
                        />
                        <span className="unit">kg</span>
                    </div>
                    <button className="step-btn" onClick={() => adjustWeight(0.5)}>+</button>
                </div>

                <div className="modal-actions">
                    <button className="secondary-btn" onClick={onClose}>Cancel</button>
                    <button className="primary-btn" onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}
