import { useState, useEffect } from "react";
import "../styles/dashboard.css";

export default function Nutrition() {
  const [eatables, setEatables] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [newNote, setNewNote] = useState("");
  const [timeSlot, setTimeSlot] = useState("Morning");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editNote, setEditNote] = useState("");

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

  // Group eatables by time slot
  const groupedEatables = timeSlots.map(slot => ({
    ...slot,
    items: eatables.filter(item => item.timeSlot === slot.value)
  }));

  return (
    <div className="dash">
      <header className="dash-header" style={{ justifyContent: 'center' }}>
        <h2>Daily Eatables 🍽️</h2>
      </header>

      <div style={{
        background: "var(--card)",
        padding: "24px",
        borderRadius: "24px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
        marginBottom: "20px"
      }}>
        <p style={{ color: "var(--text-muted)", marginBottom: "20px", textAlign: "center" }}>
          Track your daily food and drinks. Add items you consume regularly.
        </p>

        {/* Add New Item Form */}
        <div style={{
          background: "var(--bg)",
          padding: "20px",
          borderRadius: "16px",
          marginBottom: "24px"
        }}>
          <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "1.1rem" }}>
            ➕ Add New Item
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="e.g., Chai, Green Tea, Almonds..."
              style={{
                padding: "14px 16px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--card)",
                fontSize: "1rem",
                outline: "none"
              }}
            />

            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note (optional) - e.g., 1 cup with sugar, after workout..."
              rows={2}
              style={{
                padding: "14px 16px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--card)",
                fontSize: "0.95rem",
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit"
              }}
            />

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {timeSlots.map(slot => (
                <button
                  key={slot.value}
                  onClick={() => setTimeSlot(slot.value)}
                  style={{
                    flex: 1,
                    minWidth: "80px",
                    padding: "12px 8px",
                    borderRadius: "12px",
                    border: timeSlot === slot.value ? "2px solid var(--primary)" : "1px solid var(--border)",
                    background: timeSlot === slot.value ? "rgba(232, 93, 117, 0.1)" : "var(--card)",
                    cursor: "pointer",
                    fontWeight: timeSlot === slot.value ? "600" : "400",
                    color: timeSlot === slot.value ? "var(--primary)" : "var(--text-main)",
                    transition: "all 0.2s"
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>{slot.emoji}</span>
                  <br />
                  <span style={{ fontSize: "0.85rem" }}>{slot.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleAddItem}
              style={{
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #E85D75, #FF8A9B)",
                color: "white",
                fontWeight: "600",
                fontSize: "1rem",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(232, 93, 117, 0.3)",
                transition: "transform 0.2s"
              }}
            >
              Add Item
            </button>
          </div>
        </div>

        {/* Display Items by Time Slot */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {groupedEatables.map(group => (
            <div key={group.value} style={{
              background: "var(--bg)",
              padding: "16px",
              borderRadius: "16px",
              borderLeft: `4px solid ${group.value === "Morning" ? "#FFB347" :
                  group.value === "Afternoon" ? "#4ECDC4" :
                    group.value === "Evening" ? "#9B59B6" :
                      "#3498DB"
                }`
            }}>
              <h4 style={{
                margin: "0 0 12px 0",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--text-main)"
              }}>
                <span style={{ fontSize: "1.3rem" }}>{group.emoji}</span>
                {group.label}
                <span style={{
                  fontSize: "0.8rem",
                  background: "var(--card)",
                  padding: "2px 8px",
                  borderRadius: "20px",
                  color: "var(--text-muted)"
                }}>
                  {group.items.length} items
                </span>
              </h4>

              {group.items.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0, fontStyle: "italic" }}>
                  No items added for {group.label.toLowerCase()}
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {group.items.map(item => (
                    <div key={item.id} style={{
                      background: "var(--card)",
                      padding: "12px 16px",
                      borderRadius: "10px"
                    }}>
                      {editingId === item.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              borderRadius: "8px",
                              border: "1px solid var(--primary)",
                              outline: "none",
                              fontSize: "0.95rem"
                            }}
                            autoFocus
                          />
                          <textarea
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder="Add a note..."
                            rows={2}
                            style={{
                              padding: "8px 12px",
                              borderRadius: "8px",
                              border: "1px solid var(--border)",
                              outline: "none",
                              fontSize: "0.9rem",
                              resize: "vertical",
                              fontFamily: "inherit"
                            }}
                          />
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              style={{
                                padding: "8px 16px",
                                borderRadius: "8px",
                                border: "none",
                                background: "#4CAF50",
                                color: "white",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                fontWeight: "500"
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              style={{
                                padding: "8px 16px",
                                borderRadius: "8px",
                                border: "1px solid var(--border)",
                                background: "var(--bg)",
                                cursor: "pointer",
                                fontSize: "0.85rem"
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: "500", display: "block" }}>{item.name}</span>
                            {item.note && (
                              <span style={{
                                fontSize: "0.85rem",
                                color: "var(--text-muted)",
                                display: "block",
                                marginTop: "4px",
                                fontStyle: "italic"
                              }}>
                                📝 {item.note}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => handleEditItem(item.id)}
                              style={{
                                padding: "6px 10px",
                                borderRadius: "8px",
                                border: "1px solid var(--border)",
                                background: "var(--bg)",
                                cursor: "pointer",
                                fontSize: "0.85rem"
                              }}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              style={{
                                padding: "6px 10px",
                                borderRadius: "8px",
                                border: "none",
                                background: "rgba(239, 68, 68, 0.1)",
                                color: "#EF4444",
                                cursor: "pointer",
                                fontSize: "0.85rem"
                              }}
                              title="Delete"
                            >
                              🗑️
                            </button>
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

        {/* Summary */}
        {eatables.length > 0 && (
          <div style={{
            marginTop: "24px",
            padding: "16px",
            background: "linear-gradient(135deg, rgba(232, 93, 117, 0.1), rgba(255, 138, 155, 0.1))",
            borderRadius: "12px",
            textAlign: "center"
          }}>
            <p style={{ margin: 0, color: "var(--text-main)" }}>
              <strong>Total Items:</strong> {eatables.length} daily eatables tracked
            </p>
          </div>
        )}

        {/* Clear All Button */}
        {eatables.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Are you sure you want to clear all items?")) {
                setEatables([]);
              }
            }}
            style={{
              marginTop: "16px",
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid #EF4444",
              background: "transparent",
              color: "#EF4444",
              fontWeight: "500",
              cursor: "pointer"
            }}
          >
            Clear All Items
          </button>
        )}
      </div>
    </div>
  );
}
