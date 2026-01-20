import "../styles/dashboard.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getDashboardData, markAttendance } from "../api";
import WeightModal from "../components/WeightModal";
import MembershipCard from "../components/MembershipCard";
import StreakCalendar from "../components/StreakCalendar";
import ProgressChart from "../components/ProgressChart";

import NutritionModal from "../components/NutritionModal";

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
      fetchDashboardData(); // Refresh to update calendar and buttons
    } catch (err) {
      alert("Failed to mark attendance");
    }
  }

  // Logout is handled in BurgerMenu
  /*function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_role");
    navigate("/");
  }*/



  if (loading) return <div className="dash"><p style={{ padding: "80px 20px", color: "#fff", textAlign: "center" }}>Loading Dashboard...</p></div>;

  const userName = localStorage.getItem("user_name") || "Member";

  // FIX: Use Local Time for "Today", not UTC (toISOString)
  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  // Derived state from data
  const isAttendanceMarked = data?.streakDates?.includes(todayStr);

  // Check if weight is logged today (Use robust backend date_str)
  const isWeightLogged = data?.weights?.some(w => w.date_str === todayStr);

  return (
    <div className="dash">
      {/* Branding - Logo + Text Side-by-Side */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "15px",
        marginTop: "-60px",
        gap: "8px"
      }}>
        <img
          src="/logo.png"
          alt="Sai Aerobics"
          style={{ width: "60px", height: "60px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)" }}
        />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: "1" }}>
          <span style={{ fontSize: "1.2rem", fontWeight: "800", color: "#fff", letterSpacing: "1px" }}>SAI</span>
          <span style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--primary-purple)", letterSpacing: "1px" }}>AEROBICS</span>
        </div>
      </div>

      <header className="dash-header">

        <div className="header-text">
          <p className="welcome">Good Morning 🌸</p>
          <h2>{userName}</h2>
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
      <div className="log-btn-container" style={{ flexDirection: 'column', gap: '15px' }}>

        {/* Attendance Button */}
        <button
          className={`big-log-btn ${isAttendanceMarked ? 'done' : 'urgent'}`}
          onClick={handleAttendance}
          disabled={isAttendanceMarked}
        >
          <div className="btn-content" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <span className="btn-title" style={{ fontSize: '1rem' }}>
              {isAttendanceMarked ? "Attendance Marked" : "Mark Attendance"}
            </span>
            <span style={{ fontSize: "1.2rem", marginLeft: '8px' }}>
              {isAttendanceMarked ? "✅" : "📍"}
            </span>
          </div>
        </button>

        {/* Weight Button */}
        <button
          className={`big-log-btn ${isWeightLogged ? 'done' : ''}`}
          style={isWeightLogged ? {} : { background: "var(--card)", color: "var(--text-main)", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}
          onClick={() => setIsModalOpen(true)}
          disabled={isWeightLogged}
        >
          {isWeightLogged ? (
            <div className="btn-content" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <span className="btn-title" style={{ fontSize: '1.1rem' }}>Weight Logged</span>
              <span style={{ fontSize: "1.4rem", marginLeft: '8px' }}>✅</span>
            </div>
          ) : (
            <div className="btn-content" style={{ flexDirection: 'row', alignItems: 'center' }}>
              <span className="btn-title" style={{ fontSize: '1rem' }}>Log today's weight</span>
              <span style={{ fontSize: "1.2rem", marginLeft: '8px' }}>⚖️</span>
            </div>
          )}
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



      {/* Modals */}


      <WeightModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(val) => {
          fetchDashboardData(); // Refresh data to update graph/streak immediately
        }}
      />

      <NutritionModal
        isOpen={isNutritionModalOpen}
        onClose={() => setIsNutritionModalOpen(false)}
      />
    </div>
  );
}
