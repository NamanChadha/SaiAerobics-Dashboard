import { useEffect, useState } from "react";
import {
  getAdminStats, getAdminUsers, getAdminGraphs,
  extendMembership, toggleUserActive, updateUserAdmin, overrideAttendance
} from "../api";
import "../styles/dashboard.css";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import {
  Users, TrendingUp, Calendar, AlertCircle, Search,
  MoreVertical, Edit, UserX, UserCheck, Shield
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalMembers: 0, expiringSoon: 0, inactive: 0, newJoins: 0, todayAttendance: 0 });
  const [users, setUsers] = useState([]);
  const [graphs, setGraphs] = useState({ attendance: [], growth: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all"); // 'all', 'active', 'inactive'

  // Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [statsData, usersData, graphData] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
        getAdminGraphs()
      ]);
      setStats(statsData);
      setUsers(usersData);
      setGraphs(graphData);
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  }

  // --- Handlers ---
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_role");
    navigate("/");
  }

  async function handleToggleActive(id) {
    if (!confirm("Are you sure you want to freeze/unfreeze this member?")) return;
    try {
      await toggleUserActive(id);
      fetchData(); // Refresh
    } catch (e) { alert(e.message); }
  }

  async function handleSaveUser() {
    try {
      await updateUserAdmin(editingUser.id, editForm);
      alert("User updated successfully!");
      setEditingUser(null);
      fetchData();
    } catch (e) { alert("Update failed: " + e.message); }
  }

  async function handleExtend(days) {
    if (!editingUser) return;
    try {
      await extendMembership(editingUser.id, days);
      alert(`Membership extended by ${days} days`);
      fetchData();
      setEditingUser(null);
    } catch (e) { alert(e.message); }
  }

  async function handleAttendanceOverride(action) {
    // action = 'add' or 'remove' for TODAY (simplified for now, ideally date picker)
    const date = new Date().toISOString().split('T')[0];
    try {
      await overrideAttendance(editingUser.id, date, action);
      alert(`Attendance ${action === 'add' ? 'Marked' : 'Removed'} for today.`);
      fetchData();
    } catch (e) { alert(e.message); }
  }

  // Filter Users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.includes(searchTerm);
    const matchesFilter = filter === 'all' ? true :
      filter === 'active' ? u.active : !u.active;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="dash" style={{ maxWidth: "1200px" }}>
      <header className="dash-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Shield size={32} color="var(--primary-purple)" />
          <div>
            <h2>Welcome Komal ji 🌸</h2>
            <p className="welcome">Admin Dashboard</p>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-subtle" style={{ color: "#ef4444" }}>Logout</button>
      </header>

      {/* 1. Widgets */}
      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <Widget title="Total Active" value={stats.totalMembers} icon={<Users size={24} color="#6366f1" />} bg="rgba(99, 102, 241, 0.1)" />
        <Widget title="New Joins (Month)" value={stats.newJoins} icon={<TrendingUp size={24} color="#10b981" />} bg="rgba(16, 185, 129, 0.1)" />
        <Widget title="Expiring (7 Days)" value={stats.expiringSoon} icon={<AlertCircle size={24} color="#f59e0b" />} bg="rgba(245, 158, 11, 0.1)" />
        <Widget title="Today's Attendance" value={stats.todayAttendance} icon={<Calendar size={24} color="#ec4899" />} bg="rgba(236, 72, 153, 0.1)" />
      </div>

      {/* 2. Graphs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div className="graph-container" style={{ height: '300px' }}>
          <h3>Attendance Trend (7 Days)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={graphs.attendance}>
              <XAxis dataKey="date" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="graph-container" style={{ height: '300px' }}>
          <h3>Member Growth (6 Months)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphs.growth}>
              <XAxis dataKey="month" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. User Management */}
      <div className="member-management-card" style={{ background: "var(--card)", padding: "24px", borderRadius: "24px", boxShadow: "0 8px 30px rgba(0,0,0,0.04)" }}>
        <div className="management-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h3>Member Management</h3>
          <div className="controls-row" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search members..."
                className="styled-input"
                style={{ paddingLeft: '35px', width: '100%', minWidth: '200px' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select className="styled-input" style={{ width: 'auto' }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Frozen Only</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead className="desktop-only">
              <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: "0.9rem", borderBottom: "2px solid #f1f5f9" }}>
                <th style={{ padding: "15px" }}>Member</th>
                <th style={{ padding: "15px" }}>Plan</th>
                <th style={{ padding: "15px" }}>Batch</th>
                <th style={{ padding: "15px" }}>Status</th>
                <th style={{ padding: "15px" }}>Expiry</th>
                <th style={{ padding: "15px" }}>Streak</th>
                <th style={{ padding: "15px", textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => {
                const daysLeft = Math.ceil((new Date(u.membership_end) - new Date()) / (1000 * 60 * 60 * 24));
                const isExpiring = daysLeft <= 7 && daysLeft > 0;
                return (
                  <tr key={u.id} className="member-row">
                    <td className="col-member" style={{ padding: "15px" }}>
                      <div style={{ fontWeight: "600" }}>{u.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{u.phone}</div>
                    </td>
                    <td className="col-plan" style={{ padding: "15px" }}>
                      <span className={`badge-tier ${u.tier?.toLowerCase() || 'silver'}`}>{u.tier || 'Silver'}</span>
                    </td>
                    <td className="col-batch" style={{ padding: "15px" }}>
                      <div className="mobile-label">Batch:</div>
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        fontWeight: "500",
                        background: u.batch_time ? "rgba(99, 102, 241, 0.1)" : "rgba(148, 163, 184, 0.1)",
                        color: u.batch_time ? "#6366f1" : "#94a3b8"
                      }}>
                        {u.batch_time || "Not Set"}
                      </span>
                    </td>
                    <td className="col-status" style={{ padding: "15px" }}>
                      <span style={{
                        padding: "5px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "600",
                        background: u.active ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: u.active ? "#10b981" : "#ef4444"
                      }}>
                        {u.active ? "Active" : "Frozen"}
                      </span>
                    </td>
                    <td className="col-expiry" style={{ padding: "15px" }}>
                      <div className="mobile-label">Expiry:</div>
                      <div style={{ fontWeight: "500" }}>{new Date(u.membership_end).toLocaleDateString('en-GB')}</div>
                      <div style={{ fontSize: "0.75rem", color: isExpiring ? "#f59e0b" : daysLeft < 0 ? "#ef4444" : "#10b981", fontWeight: '600' }}>
                        {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
                      </div>
                    </td>
                    <td className="col-streak" style={{ padding: "15px" }}>
                      <div className="mobile-label">Streak:</div>
                      🔥 {u.current_streak || 0}
                    </td>
                    <td className="col-actions" style={{ padding: "15px", textAlign: 'right' }}>
                      <button onClick={() => { setEditingUser(u); setEditForm(u); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <MoreVertical size={20} color="#64748b" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Edit Member</h3>
            <p className="modal-desc">Manage details for {editingUser.name}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label className="modern-label">Name</label>
                <input className="modern-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="modern-label">Phone</label>
                <input className="modern-input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="modern-label">Membership Tier</label>
                <select className="modern-input" value={editForm.tier || 'Silver'} onChange={e => setEditForm({ ...editForm, tier: e.target.value })}>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                </select>
              </div>
              <div>
                <label className="modern-label">Batch Timing</label>
                <select
                  className="modern-input"
                  value={editForm.batch_time || ''}
                  onChange={e => setEditForm({ ...editForm, batch_time: e.target.value })}
                >
                  <option value="">Select Batch</option>
                  <option value="6:00 AM">6:00 AM - Morning Early</option>
                  <option value="7:00 AM">7:00 AM - Morning</option>
                  <option value="8:00 AM">8:00 AM - Morning</option>
                  <option value="9:00 AM">9:00 AM - Late Morning</option>
                  <option value="10:00 AM">10:00 AM - Late Morning</option>
                  <option value="5:00 PM">5:00 PM - Evening</option>
                  <option value="6:00 PM">6:00 PM - Evening</option>
                  <option value="7:00 PM">7:00 PM - Evening</option>
                  <option value="8:00 PM">8:00 PM - Night</option>
                </select>
              </div>
            </div>

            <h4 style={{ margin: '15px 0 10px 0' }}>Extend Membership</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
              <button onClick={() => handleExtend(30)} className="option-btn">📅 +1 Month</button>
              <button onClick={() => handleExtend(90)} className="option-btn">📅 +3 Months</button>
              <button onClick={() => handleExtend(365)} className="option-btn">📅 +1 Year</button>
            </div>

            <h4 style={{ margin: '15px 0 10px 0' }}>Actions</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <button onClick={() => handleToggleActive(editingUser.id)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'var(--bg)', cursor: 'pointer', color: editingUser.active ? '#ef4444' : '#10b981', fontWeight: '600' }}>
                {editingUser.active ? '❄️ Freeze Member' : '🟢 Unfreeze'}
              </button>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={() => handleAttendanceOverride('add')} title="Mark Present" style={{ flex: 1, padding: '10px', background: '#ec4899', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>✅ Today</button>
                <button onClick={() => handleAttendanceOverride('remove')} title="Remove" style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>❌</button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setEditingUser(null)} className="secondary-btn">Cancel</button>
              <button onClick={handleSaveUser} style={{ background: 'var(--primary-purple)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Widget({ title, value, icon, bg }) {
  return (
    <div style={{ background: "var(--card)", padding: "20px", borderRadius: "20px", display: 'flex', alignItems: 'center', gap: '15px', boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
      <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: "600" }}>{title}</div>
        <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-main)" }}>{value}</div>
      </div>
    </div>
  );
}
