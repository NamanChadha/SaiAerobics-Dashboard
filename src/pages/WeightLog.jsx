import "../styles/weight.css";
import { useNavigate } from "react-router-dom";

export default function WeightLog() {
  const navigate = useNavigate();

  return (
    <div className="weight-screen">
      <header className="weight-header">
        <button className="back" onClick={() => navigate("/dashboard")}>←</button>
        <h2>Log Weight</h2>
      </header>

      <div className="weight-card">
        <p className="label">Today's Weight</p>
        <input type="number" placeholder="kg" />
        <button className="save-btn">Save</button>
      </div>
    </div>
  );
}
