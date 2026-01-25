import "../styles/dashboard.css";
import { useEffect, useState } from "react";
import { getUserProfile, updateUserProfile, submitFeedback } from "../api";
import DarkModeToggle from "../components/DarkModeToggle";

export default function Profile() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        height: "",
        weight: "",
        tier: "silver",
        batchTime: "Morning",
        membership_end: null
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [msg, setMsg] = useState(null); // { type: 'success'|'error', text: '' }

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        try {
            const data = await getUserProfile();
            setFormData({
                name: data.name || "",
                email: data.email || "",
                phone: data.phone || "",
                height: data.height || "",
                weight: data.weight || "",
                tier: data.tier || "silver",
                batchTime: data.batch_time || "Morning",
                membership_end: data.membership_end
            });
        } catch (err) {
            console.error("Profile load error:", err);
            setMsg({ type: "error", text: "Failed to load profile." });
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setMsg(null);
        try {
            await updateUserProfile({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                height: formData.height,
                weight: formData.weight
            });
            setMsg({ type: "success", text: "Profile updated successfully! ✅" });

            // Update local storage name if changed
            if (formData.name) localStorage.setItem("user_name", formData.name);
            setIsEditing(false); // Exit edit mode on success
        } catch (err) {
            setMsg({ type: "error", text: "Failed to update profile." });
        } finally {
            setSaving(false);
        }
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const [feedback, setFeedback] = useState("");

    const handleFeedbackSubmit = async () => {
        if (!feedback.trim()) return;
        try {
            await submitFeedback(feedback);
            setMsg({ type: "success", text: "Feedback sent! Thank you. 🙏" });
            setFeedback("");
        } catch (err) {
            setMsg({ type: "error", text: "Failed to send feedback." });
        }
    };

    if (loading) return <div className="dash" style={{ textAlign: "center", paddingTop: "50px", color: "var(--text-main)" }}>Loading Profile...</div>;

    return (
        <div className="dash">
            <header className="dash-header" style={{ justifyContent: 'center' }}>
                <h2>My Profile 👤</h2>
                <DarkModeToggle />
            </header>

            <div className="profile-card" style={{ maxWidth: "500px", margin: "0 auto" }}>
                {msg && (
                    <div style={{
                        padding: "12px", borderRadius: "16px", marginBottom: "25px", textAlign: "center", fontWeight: "600", fontSize: "0.9rem",
                        background: msg.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: msg.type === "success" ? "var(--success)" : "#ef4444",
                        border: `1px solid ${msg.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
                    }}>
                        {msg.text}
                    </div>
                )}

                {/* Avatar Section (Always Visible) */}
                <div style={{ textAlign: "center", marginBottom: "25px" }}>
                    <div style={{
                        width: "100px", height: "100px",
                        background: "linear-gradient(135deg, var(--bg), var(--card))",
                        borderRadius: "50%", margin: "0 auto 15px auto",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "3.5rem",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                        border: "2px solid rgba(255,255,255,0.1)"
                    }}>
                        <span style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.2))" }}>👤</span>
                    </div>

                    {!isEditing && (
                        <>
                            <h2 style={{ fontSize: "1.5rem", margin: "0 0 5px 0" }}>{formData.name}</h2>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>{formData.email}</p>
                        </>
                    )}
                </div>

                {/* VIEW MODE */}
                {!isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                            <div style={{ background: "var(--bg)", padding: "15px", borderRadius: "16px" }}>
                                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 5px 0" }}>Height</p>
                                <p style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>{formData.height || "--"} cm</p>
                            </div>
                            <div style={{ background: "var(--bg)", padding: "15px", borderRadius: "16px" }}>
                                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 5px 0" }}>Weight</p>
                                <p style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>{formData.weight || "--"} kg</p>
                            </div>
                        </div>

                        <div style={{ background: "var(--bg)", padding: "15px", borderRadius: "16px" }}>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 5px 0" }}>Phone</p>
                            <p style={{ fontSize: "1rem", fontWeight: "600", margin: 0 }}>{formData.phone || "Not set"}</p>
                        </div>

                        <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "20px", marginTop: "5px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: "0 0 4px 0" }}>Membership Tier</p>
                                <div className="tier-badge" style={{ display: "inline-block", background: "rgba(168, 85, 247, 0.1)", color: "var(--primary-purple)", padding: "4px 10px" }}>
                                    {formData.tier.toUpperCase()}
                                </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: "0 0 4px 0" }}>Current Batch</p>
                                <strong style={{ color: "var(--text-main)" }}>{formData.batchTime}</strong>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsEditing(true)}
                            className="big-log-btn"
                            style={{ background: "var(--text-main)", color: "var(--bg)", marginTop: "10px", justifyContent: "center" }}
                        >
                            Edit Profile ✏️
                        </button>

                        {/* FEEDBACK SECTION */}
                        <div style={{ marginTop: "30px", borderTop: "1px dashed var(--border)", paddingTop: "20px" }}>
                            <h3 style={{ fontSize: "1.1rem", margin: "0 0 10px 0" }}>Feedback & Suggestions 💬</h3>
                            <textarea
                                className="modern-input"
                                rows="3"
                                placeholder="Tell us how we can improve..."
                                value={feedback}
                                onChange={e => setFeedback(e.target.value)}
                                style={{ resize: "none" }}
                            />
                            <button
                                onClick={handleFeedbackSubmit}
                                style={{
                                    marginTop: "10px",
                                    padding: "10px 20px",
                                    borderRadius: "12px",
                                    background: "rgba(16, 185, 129, 0.1)",
                                    color: "#10b981",
                                    fontWeight: "600",
                                    border: "none",
                                    cursor: "pointer",
                                    width: "100%"
                                }}
                            >
                                Send Message
                            </button>
                        </div>
                    </div>
                ) : (
                    /* EDIT MODE */
                    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                        {/* Email is read-only in edit mode often, but user wanted to edit it. Keeping it editable but maybe disabled if preferred? User logic said 'update their email' so keeping enabled. */}
                        <div>
                            <label className="modern-label">Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="modern-input" required />
                        </div>

                        <div>
                            <label className="modern-label">Full Name</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} className="modern-input" required />
                        </div>

                        <div>
                            <label className="modern-label">Phone Number</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="modern-input" placeholder="+91..." />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                            <div>
                                <label className="modern-label">Height (cm)</label>
                                <input type="number" name="height" value={formData.height} onChange={handleChange} className="modern-input" />
                            </div>
                            <div>
                                <label className="modern-label">Weight (kg)</label>
                                <input type="number" name="weight" value={formData.weight} onChange={handleChange} className="modern-input" />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                            <button
                                type="button"
                                onClick={() => { setIsEditing(false); setMsg(null); loadProfile(); }} // Cancel: Reset data
                                className="big-log-btn"
                                style={{ background: "var(--bg)", color: "var(--text-main)", flex: 1, justifyContent: "center", boxShadow: "none", border: "1px solid var(--text-muted)" }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="big-log-btn"
                                style={{ background: "var(--primary-purple)", color: "#fff", flex: 2, justifyContent: "center" }}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
