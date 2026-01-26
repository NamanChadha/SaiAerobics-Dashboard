import { useState } from "react";
import "../styles/dashboard.css";
import { generateMealPlan, shareMealPlanEmail } from "../api";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function Nutrition() {
  const [formData, setFormData] = useState({
    weight: "",
    height: "",
    goal: "Weight Loss",
    diet: "Vegetarian",
    allergies: "",
    dailyRegulars: ""
  });

  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [shareMsg, setShareMsg] = useState("");

  const handleGeneratePlan = async () => {
    if (!formData.weight || !formData.height) {
      alert("Please enter your weight and height.");
      return;
    }

    setLoadingPlan(true);
    setGeneratedPlan(null);
    setShareMsg("");

    try {
      const res = await generateMealPlan(formData);

      if (res.success && res.plan) {
        setGeneratedPlan(res.plan);
      } else {
        throw new Error(res.error || "Failed to generate plan");
      }
    } catch (err) {
      console.error("Plan generation error:", err);
      alert("Failed to generate plan. Please try again.");
    } finally {
      setLoadingPlan(false);
    }
  };

  const downloadPDF = () => {
    if (!generatedPlan) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(232, 93, 117);
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Sai Aerobics", pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`7-Day ${formData.goal} Meal Plan`, pageWidth / 2, 28, { align: "center" });
    doc.text(`Diet: ${formData.diet} | Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 35, { align: "center" });

    doc.setTextColor(0, 0, 0);

    const days = ["day1", "day2", "day3", "day4", "day5", "day6", "day7"];
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const tableBody = days.map((day, idx) => {
      const d = generatedPlan[day] || {};
      return [
        dayNames[idx],
        d.breakfast || "-",
        d.lunch || "-",
        d.dinner || "-",
        d.snacks || "-"
      ];
    });

    doc.autoTable({
      head: [["Day", "Breakfast", "Lunch", "Dinner", "Snacks"]],
      body: tableBody,
      startY: 50,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [232, 93, 117], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [252, 252, 252] },
      columnStyles: { 0: { cellWidth: 25, fontStyle: "bold" } }
    });

    const fileName = `SaiAerobics_${formData.goal.replace(/\s+/g, "_")}_MealPlan.pdf`;
    doc.save(fileName);
  };

  const handleEmailPlan = async () => {
    if (!generatedPlan) return;
    setShareMsg("Sending email...");

    const days = ["day1", "day2", "day3", "day4", "day5", "day6", "day7"];
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #E85D75, #f687a5); padding: 25px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Sai Aerobics</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Your 7-Day ${formData.goal} Meal Plan</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; background: white;">
          <thead>
            <tr style="background: #E85D75;">
              <th style="padding: 12px; color: white;">Day</th>
              <th style="padding: 12px; color: white;">Breakfast</th>
              <th style="padding: 12px; color: white;">Lunch</th>
              <th style="padding: 12px; color: white;">Dinner</th>
              <th style="padding: 12px; color: white;">Snacks</th>
            </tr>
          </thead>
          <tbody>
    `;

    days.forEach((day, idx) => {
      const d = generatedPlan[day] || {};
      const bgColor = idx % 2 === 0 ? "#ffffff" : "#f9fafb";
      html += `
        <tr style="background: ${bgColor};">
          <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">${dayNames[idx]}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${d.breakfast || "-"}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${d.lunch || "-"}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${d.dinner || "-"}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${d.snacks || "-"}</td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;

    try {
      await shareMealPlanEmail(html, formData.goal);
      setShareMsg("Email sent successfully!");
    } catch (err) {
      setShareMsg("Failed to send email.");
    }
  };

  const handleShare = async () => {
    if (!generatedPlan) return;
    downloadPDF();
  };

  const days = ["day1", "day2", "day3", "day4", "day5", "day6", "day7"];
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="dash">
      <header className="dash-header" style={{ justifyContent: "center" }}>
        <h2>Nutrition Plan 🥗</h2>
      </header>

      <div className="fade-in">
        <div style={{ background: "var(--card)", padding: "24px", borderRadius: "24px", boxShadow: "0 8px 30px rgba(0,0,0,0.04)", maxWidth: "700px", margin: "0 auto" }}>
          {!generatedPlan ? (
            <>
              <h3 style={{ marginTop: 0 }}>Create Your 7-Day Meal Plan 🥑</h3>
              <p style={{ color: "var(--text-muted)" }}>Get a personalized weekly diet plan based on your body and goals.</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "20px" }}>
                <div>
                  <label className="modern-label">Weight (kg) *</label>
                  <input type="number" className="modern-input" placeholder="e.g. 65" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} />
                </div>
                <div>
                  <label className="modern-label">Height (cm or ft) *</label>
                  <input type="text" className="modern-input" placeholder="e.g. 165 or 5'5" value={formData.height} onChange={e => setFormData({ ...formData, height: e.target.value })} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "15px" }}>
                <div>
                  <label className="modern-label">Goal</label>
                  <select className="modern-input" value={formData.goal} onChange={e => setFormData({ ...formData, goal: e.target.value })}>
                    <option value="Weight Loss">Weight Loss</option>
                    <option value="Maintain Weight">Maintain Weight</option>
                    <option value="Muscle Gain">Muscle Gain</option>
                  </select>
                </div>
                <div>
                  <label className="modern-label">Diet Type</label>
                  <select className="modern-input" value={formData.diet} onChange={e => setFormData({ ...formData, diet: e.target.value })}>
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Eggetarian">Eggetarian</option>
                    <option value="Non-Vegetarian">Non-Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: "15px" }}>
                <label className="modern-label">Allergies (Optional)</label>
                <input type="text" className="modern-input" placeholder="e.g. Peanuts, Dairy, Gluten" value={formData.allergies} onChange={e => setFormData({ ...formData, allergies: e.target.value })} />
              </div>

              <div style={{ marginTop: "15px" }}>
                <label className="modern-label">Your Daily Regulars (Notes)</label>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 8px 0" }}>Things you consume daily like tea, coffee, supplements, etc.</p>
                <textarea className="modern-input" rows={2} placeholder="e.g. Morning tea with less sugar, Black coffee, Almonds..." value={formData.dailyRegulars} onChange={e => setFormData({ ...formData, dailyRegulars: e.target.value })} />
              </div>

              <button onClick={handleGeneratePlan} disabled={loadingPlan} className="big-log-btn" style={{ justifyContent: "center", marginTop: "25px", background: "linear-gradient(135deg, #10b981, #059669)", width: "100%" }}>
                {loadingPlan ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="spinner" style={{ width: "20px", height: "20px" }}></span>
                    Generating...
                  </span>
                ) : (
                  "✨ Generate My 7-Day Plan"
                )}
              </button>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h3 style={{ margin: 0 }}>Your 7-Day Plan</h3>
                  <p style={{ margin: "5px 0 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>{formData.goal} • {formData.diet}</p>
                </div>
                <button onClick={() => setGeneratedPlan(null)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--text-muted)", background: "var(--bg)", cursor: "pointer" }}>
                  ← New Plan
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
                <button onClick={downloadPDF} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "none", background: "var(--primary)", color: "white", cursor: "pointer", fontWeight: "600" }}>
                  📄 Download PDF
                </button>
                <button onClick={handleShare} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "none", background: "#6366f1", color: "white", cursor: "pointer", fontWeight: "600" }}>
                  📤 Share
                </button>
                <button onClick={handleEmailPlan} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "none", background: "#10b981", color: "white", cursor: "pointer", fontWeight: "600" }}>
                  📧 Email Me
                </button>
              </div>

              {shareMsg && <p style={{ color: shareMsg.includes("success") ? "green" : "red", fontSize: "0.9rem", marginTop: "10px", textAlign: "center" }}>{shareMsg}</p>}

              <div style={{ display: "grid", gap: "15px", marginTop: "25px" }}>
                {days.map((day, index) => {
                  const d = generatedPlan[day] || {};
                  return (
                    <div key={day} style={{ background: "var(--bg)", padding: "20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                      <h4 style={{ margin: "0 0 15px 0", color: "var(--primary)" }}>
                        <span style={{ background: "var(--primary)", color: "white", padding: "4px 12px", borderRadius: "20px", fontSize: "0.85rem" }}>
                          {dayNames[index]}
                        </span>
                      </h4>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
                        <div>
                          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Breakfast</p>
                          <p style={{ margin: "4px 0 0 0", fontWeight: "500" }}>{d.breakfast || "-"}</p>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Lunch</p>
                          <p style={{ margin: "4px 0 0 0", fontWeight: "500" }}>{d.lunch || "-"}</p>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Dinner</p>
                          <p style={{ margin: "4px 0 0 0", fontWeight: "500" }}>{d.dinner || "-"}</p>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Snacks</p>
                          <p style={{ margin: "4px 0 0 0", fontWeight: "500" }}>{d.snacks || "-"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
