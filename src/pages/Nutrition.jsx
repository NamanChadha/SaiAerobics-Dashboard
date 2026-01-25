import { useState, useEffect } from "react";
import "../styles/dashboard.css";
import { generateMealPlan, shareMealPlanEmail } from "../api";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function Nutrition() {
  const [activeTab, setActiveTab] = useState("tracker"); // 'tracker' | 'generator'

  // TRACKER STATE
  const [eatables, setEatables] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [newNote, setNewNote] = useState("");
  const [timeSlot, setTimeSlot] = useState("Morning");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editNote, setEditNote] = useState("");

  // GENERATOR STATE
  const [goal, setGoal] = useState("Maintenance");
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [shareMsg, setShareMsg] = useState("");

  // Time slot options with emojis
  const timeSlots = [
    { value: "Morning", emoji: "🌅", label: "Morning" },
    { value: "Afternoon", emoji: "☀️", label: "Afternoon" },
    { value: "Evening", emoji: "🌆", label: "Evening" },
    { value: "Night", emoji: "🌙", label: "Night" }
  ];

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("daily_eatables");
    if (saved) {
      setEatables(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage whenever eatables change
  useEffect(() => {
    localStorage.setItem("daily_eatables", JSON.stringify(eatables));
  }, [eatables]);

  // --- TRACKER HANDLERS ---
  const handleAddItem = () => {
    if (!newItem.trim()) {
      alert("Please enter an item name");
      return;
    }
    const item = {
      id: Date.now(),
      name: newItem.trim(),
      note: newNote.trim(),
      timeSlot: timeSlot,
      createdAt: new Date().toISOString()
    };
    setEatables([...eatables, item]);
    setNewItem("");
    setNewNote("");
  };

  const handleDeleteItem = (id) => {
    setEatables(eatables.filter(item => item.id !== id));
  };

  const handleEditItem = (id) => {
    const item = eatables.find(e => e.id === id);
    setEditingId(id);
    setEditText(item.name);
    setEditNote(item.note || "");
  };

  const handleSaveEdit = (id) => {
    if (!editText.trim()) return;
    setEatables(eatables.map(item =>
      item.id === id ? { ...item, name: editText.trim(), note: editNote.trim() } : item
    ));
    setEditingId(null);
    setEditText("");
    setEditNote("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditNote("");
  };

  // --- GENERATOR HANDLERS ---
  const handleGeneratePlan = async () => {
    setLoadingPlan(true);
    setGeneratedPlan(null);
    setShareMsg("");
    try {
      // Pass eatables as constraint
      const res = await generateMealPlan({ goal, eatables });
      setGeneratedPlan(res.plan);
    } catch (err) {
      alert("Failed to generate plan. " + err.message);
    } finally {
      setLoadingPlan(false);
    }
  };

  const downloadPDF = () => {
    if (!generatedPlan) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Sai Aerobics - ${goal} Plan`, 14, 20);

    doc.setFontSize(12);
    doc.text("Generated on: " + new Date().toLocaleDateString(), 14, 30);

    const tableBody = [];
    Object.keys(generatedPlan).forEach(slot => {
      const items = generatedPlan[slot].join(", ");
      tableBody.push([slot, items]);
    });

    doc.autoTable({
      head: [['Time Slot', 'Recommended Items']],
      body: tableBody,
      startY: 40,
      styles: { fontSize: 12, cellPadding: 3 },
      headStyles: { fillColor: [124, 108, 242] } // Primary Purple
    });

    doc.save(`SaiAerobics_${goal}_Plan.pdf`);
  };

  const handleEmailPlan = async () => {
    if (!generatedPlan) return;
    setShareMsg("Sending email...");

    // Create simple HTML table for email
    let html = `<table style="width:100%; border-collapse: collapse;">
                  <tr style="background:#f3f4f6;">
                    <th style="padding:10px; border:1px solid #ddd;">Time Slot</th>
                    <th style="padding:10px; border:1px solid #ddd;">Items</th>
                  </tr>`;
    Object.keys(generatedPlan).forEach(slot => {
      html += `<tr>
                  <td style="padding:10px; border:1px solid #ddd;"><strong>${slot}</strong></td>
                  <td style="padding:10px; border:1px solid #ddd;">${generatedPlan[slot].join(", ")}</td>
                </tr>`;
    });
    html += `</table>`;

    try {
      await shareMealPlanEmail(html, goal);
      setShareMsg("✅ Email sent successfully!");
    } catch (err) {
      setShareMsg("❌ Failed to email plan.");
    }
  };

  // Group eatables by time slot for Tracker
  const groupedEatables = timeSlots.map(slot => ({
    ...slot,
    items: eatables.filter(item => item.timeSlot === slot.value)
  }));

  return (
    <div className="dash">
      <header className="dash-header" style={{ justifyContent: 'center' }}>
        <h2>Nutrition & Diet 🥗</h2>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
        <button
          onClick={() => setActiveTab('tracker')}
          style={{
            padding: '10px 20px',
            borderRadius: '20px',
            border: activeTab === 'tracker' ? '2px solid var(--primary-purple)' : '1px solid var(--border)',
            background: activeTab === 'tracker' ? 'rgba(124, 108, 242, 0.1)' : 'var(--card)',
            color: activeTab === 'tracker' ? 'var(--primary-purple)' : 'var(--text-muted)',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          📝 Daily Eatables
        </button>
        <button
          onClick={() => setActiveTab('generator')}
          style={{
            padding: '10px 20px',
            borderRadius: '20px',
            border: activeTab === 'generator' ? '2px solid var(--primary-purple)' : '1px solid var(--border)',
            background: activeTab === 'generator' ? 'rgba(124, 108, 242, 0.1)' : 'var(--card)',
            color: activeTab === 'generator' ? 'var(--primary-purple)' : 'var(--text-muted)',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          🤖 Diet Plan Generator
        </button>
      </div>

      {activeTab === 'tracker' ? (
        // === TRACKER VIEW ===
        <div className="fade-in">
          <div style={{
            background: "var(--card)", padding: "24px", borderRadius: "24px", boxShadow: "0 8px 30px rgba(0,0,0,0.04)", marginBottom: "20px"
          }}>
            <p style={{ color: "var(--text-muted)", marginBottom: "20px", textAlign: "center" }}>
              Track your daily food and drinks. Add regularly consumed items.
            </p>

            {/* Add New Item Form */}
            <div style={{ background: "var(--bg)", padding: "20px", borderRadius: "16px", marginBottom: "24px" }}>
              <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "1.1rem" }}>➕ Add New Item</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="e.g., Chai, Green Tea, Almonds..." className="modern-input" />
                <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note (optional)..." rows={2} className="modern-input" style={{ resize: "vertical" }} />

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {timeSlots.map(slot => (
                    <button key={slot.value} onClick={() => setTimeSlot(slot.value)}
                      style={{
                        flex: 1, minWidth: "80px", padding: "12px 8px", borderRadius: "12px",
                        border: timeSlot === slot.value ? "2px solid var(--primary-purple)" : "1px solid var(--border)",
                        background: timeSlot === slot.value ? "rgba(124, 108, 242, 0.1)" : "var(--card)",
                        cursor: "pointer", fontWeight: timeSlot === slot.value ? "600" : "400",
                        color: timeSlot === slot.value ? "var(--primary-purple)" : "var(--text-main)", transition: "all 0.2s"
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>{slot.emoji}</span><br /><span style={{ fontSize: "0.85rem" }}>{slot.label}</span>
                    </button>
                  ))}
                </div>

                <button onClick={handleAddItem} className="big-log-btn" style={{ justifyContent: "center" }}>Add Item</button>
              </div>
            </div>

            {/* Display Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {groupedEatables.map(group => (
                <div key={group.value} style={{
                  background: "var(--bg)", padding: "16px", borderRadius: "16px",
                  borderLeft: `4px solid ${group.value === "Morning" ? "#FFB347" : group.value === "Afternoon" ? "#4ECDC4" : group.value === "Evening" ? "#9B59B6" : "#3498DB"}`
                }}>
                  <h4 style={{ margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: "8px", color: "var(--text-main)" }}>
                    <span style={{ fontSize: "1.3rem" }}>{group.emoji}</span> {group.label}
                    <span style={{ fontSize: "0.8rem", background: "var(--card)", padding: "2px 8px", borderRadius: "20px", color: "var(--text-muted)" }}>{group.items.length} items</span>
                  </h4>

                  {group.items.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0, fontStyle: "italic" }}>No items added.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {group.items.map(item => (
                        <div key={item.id} style={{ background: "var(--card)", padding: "12px 16px", borderRadius: "10px" }}>
                          {editingId === item.id ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} className="modern-input" autoFocus />
                              <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} className="modern-input" rows={2} />
                              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                <button onClick={() => handleSaveEdit(item.id)} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#10b981", color: "white", cursor: "pointer" }}>Save</button>
                                <button onClick={handleCancelEdit} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer" }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: "500", display: "block" }}>{item.name}</span>
                                {item.note && <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginTop: "4px", fontStyle: "italic" }}>📝 {item.note}</span>}
                              </div>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button onClick={() => handleEditItem(item.id)} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer" }} title="Edit">✏️</button>
                                <button onClick={() => handleDeleteItem(item.id)} style={{ padding: "6px 10px", borderRadius: "8px", border: "none", background: "rgba(239, 68, 68, 0.1)", color: "#EF4444", cursor: "pointer" }} title="Delete">🗑️</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {eatables.length > 0 && (
              <button
                onClick={() => { if (confirm("Clear all items?")) setEatables([]); }}
                style={{ marginTop: "16px", width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #EF4444", background: "transparent", color: "#EF4444", fontWeight: "500", cursor: "pointer" }}
              >
                Clear All Items
              </button>
            )}
          </div>
        </div>
      ) : (
        // === GENERATOR VIEW ===
        <div className="fade-in">
          <div style={{ background: "var(--card)", padding: "24px", borderRadius: "24px", boxShadow: "0 8px 30px rgba(0,0,0,0.04)" }}>
            <h3 style={{ marginTop: 0 }}>Create Your Diet Plan 🥑</h3>
            <p style={{ color: "var(--text-muted)" }}>Get a customized meal plan. We’ll include your daily eatables as constraints.</p>

            <div style={{ marginTop: "20px" }}>
              <label className="modern-label">What is your goal?</label>
              <select value={goal} onChange={e => setGoal(e.target.value)} className="modern-input">
                <option value="Maintenance">Maintain Weight & Health</option>
                <option value="Weight Loss">Weight Loss (Fat Burn)</option>
                <option value="Muscle Gain">Muscle Gain (Bulking)</option>
              </select>
            </div>

            <button
              onClick={handleGeneratePlan}
              disabled={loadingPlan}
              className="big-log-btn"
              style={{ justifyContent: "center", marginTop: "20px", background: "linear-gradient(135deg, #10b981, #059669)" }}
            >
              {loadingPlan ? "Generating Plan..." : "✨ Generate My Plan"}
            </button>

            {generatedPlan && (
              <div style={{ marginTop: "30px", borderTop: "2px dashed var(--border)", paddingTop: "20px" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: "wrap", gap: "10px" }}>
                  <h3 style={{ margin: 0 }}>Your Plan ({goal})</h3>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={downloadPDF} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--text-muted)", background: "var(--bg)", cursor: "pointer" }}>📄 PDF</button>
                    <button onClick={handleEmailPlan} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--text-muted)", background: "var(--bg)", cursor: "pointer" }}>📧 Email</button>
                  </div>
                </div>

                {shareMsg && <p style={{ color: shareMsg.includes("✅") ? "green" : "red", fontSize: "0.9rem" }}>{shareMsg}</p>}

                <div style={{ display: "grid", gap: "15px", marginTop: "20px" }}>
                  {Object.keys(generatedPlan).map(slot => (
                    <div key={slot} style={{ background: "var(--bg)", padding: "15px", borderRadius: "12px" }}>
                      <h4 style={{ margin: "0 0 8px 0", color: "var(--primary-purple)" }}>{slot}</h4>
                      <ul style={{ margin: 0, paddingLeft: "20px" }}>
                        {generatedPlan[slot].map((food, i) => (
                          <li key={i} style={{ marginBottom: "4px" }}>
                            {food.includes("(Your Regular)") ? <strong>{food}</strong> : food}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
