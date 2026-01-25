import { useState } from "react";
import "../styles/dashboard.css";
import { generateMealPlan, shareMealPlanEmail } from "../api";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function Nutrition() {
  const [goal, setGoal] = useState("Maintenance");
  const [dailyEatablesInput, setDailyEatablesInput] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [shareMsg, setShareMsg] = useState("");

  const handleGeneratePlan = async () => {
    setLoadingPlan(true);
    setGeneratedPlan(null);
    setShareMsg("");
    try {
      // Parse daily eatables from text area (comma separated)
      const eatablesArray = dailyEatablesInput
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .map(name => ({ name, timeSlot: "Morning" })); // Default to Morning for now or just generic specific placement if API handles it?

      // Actually backend expects {name, timeSlot}. 
      // If user just types "Chai", we don't know the slot. 
      // The backend logic (Step 730) checks: if (item.timeSlot && selectedPlan[item.timeSlot])
      // So if I default to "Morning", all custom items go to Morning.
      // Better: Let backend handle generic items or just keep it simple.
      // Since the previous requirement was "daily eatables as constraint", implying the tracker where slot was known.
      // If I remove tracker, I lose slot info unless I ask user.
      // For now, I will default to "Morning" or maybe "Evening" as safe bets, or just send without slot if backend logs it?
      // Backend: if (item.timeSlot && selectedPlan[item.timeSlot]). If no slot, it's ignored.
      // So I MUST provide a slot.
      // Let's simplified: Input is generic. I'll just distribute them or ask user?
      // User asked "revert... only generate meal plan". Simplicity is key.
      // I'll default to "Morning" for now as "Add-ons".

      const eatables = eatablesArray.length > 0 ? eatablesArray : [];

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

  return (
    <div className="dash">
      <header className="dash-header" style={{ justifyContent: 'center' }}>
        <h2>Nutrition Plan 🥗</h2>
      </header>

      <div className="fade-in">
        <div style={{ background: "var(--card)", padding: "24px", borderRadius: "24px", boxShadow: "0 8px 30px rgba(0,0,0,0.04)", maxWidth: "600px", margin: "0 auto" }}>
          <h3 style={{ marginTop: 0 }}>Create Your Diet Plan 🥑</h3>
          <p style={{ color: "var(--text-muted)" }}>Get a customized meal plan based on your goal.</p>

          <div style={{ marginTop: "20px" }}>
            <label className="modern-label">What is your goal?</label>
            <select value={goal} onChange={e => setGoal(e.target.value)} className="modern-input">
              <option value="Maintenance">Maintain Weight & Health</option>
              <option value="Weight Loss">Weight Loss (Fat Burn)</option>
              <option value="Muscle Gain">Muscle Gain (Bulking)</option>
            </select>
          </div>

          <div style={{ marginTop: "20px" }}>
            <label className="modern-label">Your Daily Regulars (Optional)</label>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "5px" }}>Items you eat every day (e.g., Chai, Almonds)</p>
            <textarea
              className="modern-input"
              rows={2}
              placeholder="Enter items separated by comma..."
              value={dailyEatablesInput}
              onChange={e => setDailyEatablesInput(e.target.value)}
            />
          </div>

          <button
            onClick={handleGeneratePlan}
            disabled={loadingPlan}
            className="big-log-btn"
            style={{ justifyContent: "center", marginTop: "20px", background: "linear-gradient(135deg, #10b981, #059669)", width: "100%" }}
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
    </div>
  );
}
