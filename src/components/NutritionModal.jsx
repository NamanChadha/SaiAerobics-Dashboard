import { useState } from "react";
import { generateMealPlan } from "../api";
import "../styles/dashboard.css"; // Reuse modal styles

export default function NutritionModal({ isOpen, onClose }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        height: "",
        weight: "",
        goal: "Lose Weight",
        diet: "Vegetarian",
        allergies: ""
    });

    if (!isOpen) return null;

    async function handleSubmit() {
        setLoading(true);
        setStep(3); // Loading screen
        try {
            await generateMealPlan(formData);
            setStep(4); // Success screen
        } catch (err) {
            alert("Error: " + err.message);
            setStep(2); // Go back
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content fade-in" style={{ textAlign: 'left' }}>
                {/* Step 1: Intro */}
                {step === 1 && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "15px" }}>🥗</div>
                        <h3 className="modal-title">Your AI Nutritionist</h3>
                        <p className="modal-desc">Answer a few questions and I'll send a personalized 7-day meal plan to your email.</p>
                        <button className="big-log-btn" onClick={() => setStep(2)}>
                            Start Now
                        </button>
                        <button className="secondary-btn" onClick={onClose} style={{ marginTop: "10px", width: "100%" }}>Cancel</button>
                    </div>
                )}

                {/* Step 2: Form */}
                {step === 2 && (
                    <div>
                        <h3 className="modal-title" style={{ marginBottom: "20px" }}>Tell us about you</h3>

                        <div className="form-group">
                            <label>Current Weight (kg)</label>
                            <input
                                type="number"
                                className="styled-input"
                                value={formData.weight}
                                onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                placeholder="e.g. 65"
                            />
                        </div>

                        <div className="form-group">
                            <label>Height (e.g. 5'5 or 165cm)</label>
                            <input
                                type="text"
                                className="styled-input"
                                value={formData.height}
                                onChange={e => setFormData({ ...formData, height: e.target.value })}
                                placeholder="e.g. 5'5"
                            />
                        </div>

                        <div className="form-group">
                            <label>Goal</label>
                            <select
                                className="styled-input"
                                value={formData.goal}
                                onChange={e => setFormData({ ...formData, goal: e.target.value })}
                            >
                                <option>Lose Weight</option>
                                <option>Maintain Weight</option>
                                <option>Gain Muscle</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Diet Type</label>
                            <select
                                className="styled-input"
                                value={formData.diet}
                                onChange={e => setFormData({ ...formData, diet: e.target.value })}
                            >
                                <option>Vegetarian</option>
                                <option>Eggetarian</option>
                                <option>Non-Vegetarian</option>
                                <option>Vegan</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Allergies (Optional)</label>
                            <input
                                type="text"
                                className="styled-input"
                                value={formData.allergies}
                                onChange={e => setFormData({ ...formData, allergies: e.target.value })}
                                placeholder="e.g. Peanuts, Dairy"
                            />
                        </div>

                        <button className="big-log-btn" onClick={handleSubmit} style={{ marginTop: "20px" }}>
                            Generate Plan ✨
                        </button>
                        <button className="secondary-btn" onClick={() => setStep(1)} style={{ marginTop: "10px", width: "100%" }}>Back</button>
                    </div>
                )}

                {/* Step 3: Loading */}
                {step === 3 && (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                        <div className="spinner"></div>
                        <h3 style={{ marginTop: "20px", color: "var(--text-main)" }}>Creating your plan...</h3>
                        <p style={{ color: "var(--text-muted)" }}>Checking calories & macros</p>
                    </div>
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "4rem", marginBottom: "10px" }}>✅</div>
                        <h3 className="modal-title">Plan Sent!</h3>
                        <p className="modal-desc">Check your inbox. Your 7-day personal meal plan has arrived.</p>
                        <button className="big-log-btn" onClick={onClose}>
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
