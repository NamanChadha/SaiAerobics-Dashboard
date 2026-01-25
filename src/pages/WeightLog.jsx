import { useState } from "react";
import "../styles/weight.css";
import { useNavigate } from "react-router-dom";
import { saveWeight } from "../api";

export default function WeightLog() {
  const navigate = useNavigate();
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!weight) return alert("Please enter a weight!");

    setLoading(true);
    try {
      await saveWeight(Number(weight));
      alert("Weight logged successfully! 💪");
      navigate("/dashboard");
    } catch (err) {
      alert("Failed to log weight. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="weight-screen">
      <header className="weight-header">
        <button className="back" onClick={() => navigate("/dashboard")}>←</button>
        <h2>Log Weight</h2>
      </header>

      <div className="weight-card">
        <p className="label">Today's Weight</p>
        <input
          type="number"
          placeholder="kg"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <button className="save-btn" onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
