import "../styles/dashboard.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getDashboardData, markAttendance } from "../api";
import WeightModal from "../components/WeightModal";
import MembershipCard from "../components/MembershipCard";
import StreakCalendar from "../components/StreakCalendar";
import ProgressChart from "../components/ProgressChart";
import NutritionModal from "../components/NutritionModal";
import logo from "../assets/logo.png";

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNutritionModalOpen, setIsNutritionModalOpen] = useState(false);

  async function fetchDashboardData() {
    try {
      const dashboardData = await getDashboardData();
      setData(dashboardData);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function handleAttendance() {
    try {
      await markAttendance();
      fetchDashboardData();
    } catch (err) {
      alert("Failed to mark attendance");
    }
  }

  if (loading) return <div className="dash"><p style={{ padding: "80px 20px", color: "var(--text-main)", textAlign: "center" }}>Loading Dashboard...</p></div>;

  const userName = localStorage.getItem("user_name") || "Member";
  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
  const isAttendanceMarked = data?.streakDates?.includes(todayStr);
  const isWeightLogged = data?.weights?.some(w => w.date_str === todayStr);

  return (
    <div className="dash">
      {/* Brand Header - Consistent with Home */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "20px",
        marginTop: "-50px",
        gap: "10px"
      }}>
        <img
          src={logo}
          alt="Sai Aerobics Logo"
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            objectFit: "cover",
            boxShadow: "0 4px 15px rgba(232, 93, 117, 0.3)"
          }}
        />
        <div style={{ textAlign: "left" }}>
          <span style={{
            fontSize: "1.3rem",
            fontWeight: "700",
            color: "var(--text-main)",
            fontFamily: "Poppins, sans-serif",
            letterSpacing: "0.5px"
          }}>
            Sai Aerobics
          </span>
        </div>
      </div>

      <header className="dash-header" style={{ justifyContent: "center", textAlign: "center" }}>
        <div>
          <p className="welcome" style={{ margin: 0 }}>
            {(() => {
              return "Nice to see you again 👋";
            })()}
          </p>
          <h2 style={{ margin: "5px 0 0 0", fontSize: "1.4rem" }}>{userName}</h2>
        </div>
      </header>

      {data && (
        <MembershipCard
          tier={data.tier || 'silver'}
          batchTime={data.batchTime || 'Morning'}
          daysLeft={data.daysLeft || 0}
        />
      )}

      {/* Action Buttons */}
      <div className="log-btn-container" style={{ flexDirection: 'column', gap: '12px' }}>
        {/* Attendance Button */}
        <button
          className={`big-log-btn ${isAttendanceMarked ? 'done' : ''}`}
          onClick={handleAttendance}
          disabled={isAttendanceMarked}
          style={isAttendanceMarked ? {
            background: "var(--secondary)",
            color: "var(--text-main)"
          } : {
            background: "var(--primary)",
            color: "white"
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ fontSize: "1.2rem" }}>
              {isAttendanceMarked ? "✅" : "📍"}
            </span>
            <span style={{ fontWeight: '600' }}>
              {isAttendanceMarked ? "Attendance Marked" : "Mark Attendance"}
            </span>
          </div>
        </button>

        {/* Weight Button */}
        <button
          className={`big-log-btn ${isWeightLogged ? 'done' : ''}`}
          onClick={() => setIsModalOpen(true)}
          disabled={isWeightLogged}
          style={isWeightLogged ? {
            background: "var(--secondary)",
            color: "var(--text-main)"
          } : {
            background: "var(--card)",
            color: "var(--text-main)",
            border: "1px solid var(--secondary)"
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ fontSize: "1.2rem" }}>
              {isWeightLogged ? "✅" : "⚖️"}
            </span>
            <span style={{ fontWeight: '600' }}>
              {isWeightLogged ? "Weight Logged" : "Log Today's Weight"}
            </span>
          </div>
        </button>
      </div>

      <div className="dash-grid">
        <div className="grid-item">
          <StreakCalendar streakDates={data?.streakDates || []} />
          <div className="calendar-legend">
            <span className="legend-item"><span className="dot filled"></span> Logged</span>
            <span className="legend-item"><span className="dot empty"></span> Missed</span>
          </div>
        </div>
        <ProgressChart weights={data?.weights || []} />
      </div>

      <WeightModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(val) => {
          fetchDashboardData();
        }}
      />

      <NutritionModal
        isOpen={isNutritionModalOpen}
        onClose={() => setIsNutritionModalOpen(false)}
      />
    </div>
  );
}
