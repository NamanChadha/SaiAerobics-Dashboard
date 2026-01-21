import { useState, useEffect } from "react";
import { generateMealPlan, shareMealPlanEmail, getUserProfile, createOrder, verifyPayment } from "../api";
import "../styles/dashboard.css";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function Nutrition() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState([]);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Payment State
  const [locked, setLocked] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  // Load draft from storage or default
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem("nutrition_draft");
    return saved ? JSON.parse(saved) : {
      height: "",
      weight: "",
      goal: "Lose Weight",
      diet: "Vegetarian",
      allergies: ""
    };
  });

  useEffect(() => {
    // Load Razorpay Script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    checkSubscription();
  }, []);

  async function checkSubscription() {
    try {
      setProfileLoading(true);
      const user = await getUserProfile();

      const isPremium = ["Gold", "Platinum"].includes(user.tier);
      const isPaid = user.payment_status === "PAID";
      const notExpired = user.expiry_date && new Date(user.expiry_date) > new Date();

      if (isPremium || (isPaid && notExpired)) {
        setLocked(false);
      } else {
        setLocked(true);
      }
    } catch (err) {
      console.error("Subscription Check Failed:", err);
    } finally {
      setProfileLoading(false);
    }
  }

  const handlePayment = async () => {
    try {
      const order = await createOrder();

      if (!order.id) {
        alert("Server error. Please try again.");
        return;
      }

      const options = {
        key: "rzp_test_PLACEHOLDER", // Uses placeholder from env in real app, but client needs explicit key or fetch from server config
        amount: order.amount,
        currency: order.currency,
        name: "Sai Aerobics",
        description: "Personalised Meal Plan Subscription",
        order_id: order.id,
        handler: async function (response) {
          try {
            const verify = await verifyPayment(response);
            if (verify.success) {
              alert("Payment Successful! Unlocking Plan...");
              checkSubscription(); // Refresh state
            } else {
              alert("Payment Verification Failed");
            }
          } catch (e) {
            alert("Payment Verification Error");
          }
        },
        prefill: {
          name: "User", // Ideally fetch name
          email: "user@example.com", // Ideally fetch email
          contact: "9999999999" // Ideally fetch phone
        },
        theme: { color: "#6200ea" }
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.open();

    } catch (err) {
      alert("Payment Failed to Start: " + err.message);
    }
  };

  async function handleSubmit() {
    if (!formData.weight || !formData.height) {
      alert("Please enter both Weight and Height.");
      return;
    }
    if (formData.weight < 20 || formData.weight > 300) {
      alert("Please enter a valid weight between 20kg and 300kg.");
      return;
    }

    setLoading(true);
    try {
      const res = await generateMealPlan(formData);
      if (res.plan) {
        setPlan(res.plan);
        setStep(3);
      } else {
        alert(res.message || "Failed to generate plan.");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(98, 0, 234);
    doc.text("Sai Aerobics - Personalized Meal Plan", 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Goal: ${formData.goal} | Diet: ${formData.diet}`, 14, 30);
    doc.text(`Weight: ${formData.weight}kg | Height: ${formData.height}`, 14, 36);

    // Prepare table data including calories
    const tableData = plan.map(day => [
      day.day,
      `${day.breakfast || '-'} (${day.calories_breakfast || ''})`,
      `${day.lunch || '-'} (${day.calories_lunch || ''})`,
      `${day.snack || '-'} (${day.calories_snack || ''})`,
      `${day.dinner || '-'} (${day.calories_dinner || ''})`
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Day', 'Breakfast', 'Lunch', 'Snack', 'Dinner']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [98, 0, 234] },
      styles: { fontSize: 8, cellPadding: 2 }
    });

    doc.save("SaiAerobics_MealPlan.pdf");
  };

  const handleShareEmail = async () => {
    setSendingEmail(true);
    // Construct simple HTML table for email
    let html = `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse; width:100%;">
        <tr style="background:#7c6cf2; color:white;">
            <th>Day</th><th>Breakfast</th><th>Lunch</th><th>Snack</th><th>Dinner</th>
        </tr>`;

    plan.forEach(p => {
      html += `<tr>
            <td><strong>${p.day}</strong></td>
            <td>${p.breakfast} <br><small>${p.calories_breakfast}</small></td>
            <td>${p.lunch} <br><small>${p.calories_lunch}</small></td>
            <td>${p.snack} <br><small>${p.calories_snack}</small></td>
            <td>${p.dinner} <br><small>${p.calories_dinner}</small></td>
          </tr>`;
    });
    html += `</table>`;

    try {
      const res = await shareMealPlanEmail(html, formData.goal);
      if (res.success) alert(res.message);
      else alert(res.error || "Failed");
    } catch (e) {
      alert("Email failed: " + e.message);
    } finally {
      setSendingEmail(false);
    }
  };

  if (profileLoading) return <div className="dash"><p className="modal-desc">Checking Subscription...</p></div>;

  return (
    <div className="dash">
      <header className="dash-header" style={{ justifyContent: 'center' }}>
        <h2>AI Nutritionist 🥗</h2>
      </header>

      <div style={{ position: "relative" }}> {/* Container for potential overlay */}

        {/* LOCK OVERLAY */}
        {locked && (
          <div style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(255, 255, 255, 0.6)",
            backdropFilter: "blur(8px)",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "24px"
          }}>
            <div style={{
              background: "white",
              padding: "40px",
              borderRadius: "20px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
              textAlign: "center",
              maxWidth: "400px",
              border: "1px solid #eee"
            }}>
              <h2 style={{ fontSize: "1.8rem", marginBottom: "10px", color: "#6200ea" }}>🔒 Premium Content</h2>
              <p style={{ color: "#666", marginBottom: "24px", lineHeight: "1.5" }}>
                Your personalized meal plan is locked. Please subscribe to unlock AI-powered nutrition plans.
              </p>
              <div style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "20px", color: "#333" }}>
                ₹500<span style={{ fontSize: "1rem", fontWeight: "normal", color: "#888" }}>/month</span>
              </div>
              <button
                onClick={handlePayment}
                style={{
                  background: "#6200ea", color: "white", border: "none",
                  padding: "16px 32px", fontSize: "1.1rem", borderRadius: "50px",
                  cursor: "pointer", boxShadow: "0 10px 20px rgba(98, 0, 234, 0.3)",
                  transition: "transform 0.2s"
                }}
              >
                Unlock for ₹500
              </button>
            </div>
          </div>
        )}

        <div style={{
          background: "var(--card)",
          padding: "24px",
          borderRadius: "24px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
          filter: locked ? "blur(4px)" : "none", // Additional visual cue
          pointerEvents: locked ? "none" : "auto",
          userSelect: locked ? "none" : "auto"
        }}>
          {/* Form Step */}
          {step === 1 && (
            <div className="fade-in">
              <p className="modal-desc">Get a personalized 7-day Indian meal plan generated by AI.</p>

              <div className="form-group">
                <label>Current Weight (kg) <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="number"
                  min="20"
                  max="300"
                  required
                  className="styled-input"
                  value={formData.weight}
                  onChange={e => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="e.g. 65"
                />
              </div>
              <div className="form-group">
                <label>Height <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  required
                  className="styled-input"
                  value={formData.height}
                  onChange={e => setFormData({ ...formData, height: e.target.value })}
                  placeholder="e.g. 5'5 or 165cm"
                />
              </div>

              <div className="form-group">
                <label>Goal</label>
                <select className="styled-input" value={formData.goal} onChange={e => setFormData({ ...formData, goal: e.target.value })}>
                  <option>Lose Weight</option><option>Maintain Weight</option><option>Gain Muscle</option>
                </select>
              </div>

              <div className="form-group">
                <label>Diet Type</label>
                <select className="styled-input" value={formData.diet} onChange={e => setFormData({ ...formData, diet: e.target.value })}>
                  <option>Vegetarian</option><option>Eggetarian</option><option>Non-Vegetarian</option><option>Vegan</option>
                </select>
              </div>

              <div className="form-group"><label>Allergies (Optional)</label><input type="text" className="styled-input" value={formData.allergies} onChange={e => setFormData({ ...formData, allergies: e.target.value })} placeholder="e.g. Peanuts, Dairy" /></div>

              <button className="big-log-btn" onClick={handleSubmit} style={{ marginTop: "20px", background: "var(--primary-purple)", color: "white" }} disabled={loading}>
                {loading ? "Generating Plan..." : "Generate Meal Plan ✨"}
              </button>
            </div>
          )}

          {/* Result Step */}
          {step === 3 && (
            <div className="fade-in">
              <h3 style={{ marginTop: 0, color: "var(--success)" }}>Plan Ready! ✅</h3>

              <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                <button onClick={handleDownloadPDF} style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "none", background: "#ef4444", color: "white", cursor: "pointer", fontWeight: "600" }}>Download PDF 📥</button>
                <button onClick={handleShareEmail} disabled={sendingEmail} style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "1px solid var(--primary-purple)", background: "rgba(98, 0, 234, 0.1)", color: "var(--primary-purple)", cursor: "pointer", fontWeight: "600" }}>
                  {sendingEmail ? "Sending..." : "Email to Me 📧"}
                </button>
              </div>

              <div className="meal-grid" style={{ display: "grid", gap: "15px", maxHeight: "500px", overflowY: "auto" }}>
                {Array.isArray(plan) && plan.map((day, i) => (
                  <div key={i} style={{ background: "var(--bg)", padding: "15px", borderRadius: "12px", borderLeft: "4px solid var(--primary-purple)" }}>
                    <strong style={{ display: "block", fontSize: "1.1rem", marginBottom: "8px", color: "var(--primary-purple)" }}>{day.day}</strong>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "8px", fontSize: "0.9rem", alignItems: "center" }}>
                      <span style={{ color: "var(--text-muted)" }}>🍳 Breakfast:</span> <span>{day.breakfast}</span> <span className="cal-badge">{day.calories_breakfast}</span>
                      <span style={{ color: "var(--text-muted)" }}>🍛 Lunch:</span> <span>{day.lunch}</span> <span className="cal-badge">{day.calories_lunch}</span>
                      <span style={{ color: "var(--text-muted)" }}>🥨 Snack:</span> <span>{day.snack}</span> <span className="cal-badge">{day.calories_snack}</span>
                      <span style={{ color: "var(--text-muted)" }}>🍲 Dinner:</span> <span>{day.dinner}</span> <span className="cal-badge">{day.calories_dinner}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button className="primary-btn" onClick={() => setStep(1)} style={{ marginTop: "20px", width: "100%", padding: "12px", background: "var(--text-main)", color: "var(--bg)", border: "none", borderRadius: "12px", fontWeight: "600", cursor: "pointer" }}>Create New Plan</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
