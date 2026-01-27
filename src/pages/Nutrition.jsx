import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import { generateMealPlan, shareMealPlanEmail, getDashboardData } from "../api";
import PaymentModal from "../components/PaymentModal";
import {
  normalizeHeight,
  validateWeight,
  sanitizeMacros,
  generateMealPlanSeed,
  generatePDF,
  generateEmailHTML
} from "../utils/nutritionHelpers";

export default function Nutrition() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    weight: "",
    height: "",
    goal: "Weight Loss",
    diet: "Vegetarian",
    allergies: "",
    dailyRegulars: ""
  });

  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [planSeed, setPlanSeed] = useState(null); // Store seed for consistency
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [isEmailSending, setIsEmailSending] = useState(false); // Prevent email spam
  const [validationErrors, setValidationErrors] = useState({}); // Track validation errors
  const [isPaidMember, setIsPaidMember] = useState(null); // null = loading
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Check subscription status on mount
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const data = await getDashboardData();
        // Check if user is Gold tier OR has valid paid subscription
        const isGoldMember = data.plan && data.plan.toLowerCase() === "gold";
        const hasPaidSubscription = data.payment_status === "PAID" &&
          data.expiry_date &&
          new Date(data.expiry_date) > new Date();
        setIsPaidMember(isGoldMember || hasPaidSubscription);
      } catch (err) {
        console.error("Failed to check subscription:", err);
        setIsPaidMember(false);
      } finally {
        setCheckingSubscription(false);
      }
    };
    checkSubscription();
  }, []);

  const handleGeneratePlan = async () => {
    // Clear previous errors
    setValidationErrors({});

    // Validate weight
    const weightValidation = validateWeight(formData.weight);
    if (!weightValidation.valid) {
      setValidationErrors(prev => ({ ...prev, weight: weightValidation.error }));
      alert(weightValidation.error);
      return;
    }

    // Validate and normalize height
    const heightValidation = normalizeHeight(formData.height);
    if (!heightValidation.valid) {
      setValidationErrors(prev => ({ ...prev, height: heightValidation.error }));
      alert(heightValidation.error);
      return;
    }

    setLoadingPlan(true);
    setGeneratedPlan(null);
    setPlanSeed(null);
    setShareMsg("");

    try {
      // Generate stable seed for this plan
      const seed = generateMealPlanSeed();

      // Prepare request with normalized height (in cm)
      const requestData = {
        ...formData,
        height: heightValidation.value, // Use normalized height in cm
        weight: weightValidation.value,
        seed
      };

      const res = await generateMealPlan(requestData);

      // Handle subscription requirement
      if (res.error === "SUBSCRIPTION_REQUIRED") {
        setIsPaidMember(false);
        setShowPaymentModal(true); // Auto-open payment modal
        alert("⚠️ This feature requires a premium subscription. Please upgrade to continue.");
        return;
      }

      if (res.success && res.plan) {
        setGeneratedPlan(res.plan);
        setPlanSeed(seed); // Store seed for PDF and email consistency
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

  const days = ["day1", "day2", "day3", "day4", "day5", "day6", "day7"];
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const mealTypes = ["breakfast", "lunch", "dinner", "snacks"];
  const mealLabels = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks" };

  const getMealData = (dayPlan, mealType) => {
    if (!dayPlan || !dayPlan[mealType]) {
      return sanitizeMacros(null);
    }
    return sanitizeMacros(dayPlan[mealType]);
  };

  const getDayTotals = (dayPlan) => {
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    mealTypes.forEach(type => {
      const m = getMealData(dayPlan, type);
      calories += m.calories || 0;
      protein += m.protein || 0;
      carbs += m.carbs || 0;
      fat += m.fat || 0;
    });
    return { calories, protein, carbs, fat };
  };

  const downloadPDF = () => {
    if (!generatedPlan) return;

    try {
      generatePDF(generatedPlan, formData);
    } catch (err) {
      console.error("PDF Error:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const handleEmailPlan = async () => {
    if (!generatedPlan) return;

    // Prevent spam - disable if already sending
    if (isEmailSending) return;

    setIsEmailSending(true);
    setShareMsg("Sending email...");

    try {
      const html = generateEmailHTML(generatedPlan, formData);
      await shareMealPlanEmail(html, formData.goal);
      setShareMsg("✅ Email sent successfully!");
    } catch (err) {
      console.error("Email error:", err);
      setShareMsg("❌ Failed to send email. Please try again.");
    } finally {
      setIsEmailSending(false);
    }
  };

  // Loading state
  if (checkingSubscription) {
    return (
      <div className="dash">
        <header className="dash-header" style={{ justifyContent: "center" }}>
          <h2>Nutrition Plan 🥗</h2>
        </header>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
          <span className="spinner" style={{ width: "40px", height: "40px" }}></span>
        </div>
      </div>
    );
  }

  // Subscription blocker for non-paid members
  if (!isPaidMember) {
    return (
      <div className="dash">
        <header className="dash-header" style={{ justifyContent: "center" }}>
          <h2>Nutrition Plan 🥗</h2>
        </header>

        <div className="fade-in">
          <div style={{
            background: "var(--card)",
            padding: "40px",
            borderRadius: "24px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
            maxWidth: "500px",
            margin: "0 auto",
            textAlign: "center"
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #fef3c7, #fde68a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: "36px"
            }}>
              🔒
            </div>

            <h3 style={{ margin: "0 0 10px 0", fontSize: "1.4rem" }}>Premium Feature</h3>
            <p style={{ color: "var(--text-muted)", margin: "0 0 25px 0", lineHeight: "1.6" }}>
              Personalized 7-day meal plans with calories & macros are available exclusively for premium members.
            </p>

            <div style={{
              background: "var(--bg)",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "25px",
              border: "1px solid var(--border)"
            }}>
              <h4 style={{ margin: "0 0 15px 0", color: "var(--primary)" }}>What you'll get:</h4>
              <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: "#10b981" }}>✓</span>
                  <span>AI-powered personalized meal plans</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: "#10b981" }}>✓</span>
                  <span>Detailed calorie & macro breakdown</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: "#10b981" }}>✓</span>
                  <span>Download PDF & email your plan</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: "#10b981" }}>✓</span>
                  <span>Allergy & preference customization</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPaymentModal(true)}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #E85D75, #f687a5)",
                color: "white",
                fontWeight: "700",
                fontSize: "1rem",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(232, 93, 117, 0.3)"
              }}
            >
              💎 Subscribe Now
            </button>

            <p style={{ marginTop: "15px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Starting at just ₹500/month
            </p>
          </div>
        </div>

        {/* Payment Modal */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setIsPaidMember(true);
            setShowPaymentModal(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="dash">
      <header className="dash-header" style={{ justifyContent: "center" }}>
        <h2>Nutrition Plan 🥗</h2>
      </header>

      <div className="fade-in">
        <div style={{ background: "var(--card)", padding: "24px", borderRadius: "24px", boxShadow: "0 8px 30px rgba(0,0,0,0.04)", maxWidth: "750px", margin: "0 auto" }}>
          {!generatedPlan ? (
            <>
              <h3 style={{ marginTop: 0 }}>Create Your 7-Day Meal Plan 🥑</h3>
              <p style={{ color: "var(--text-muted)" }}>Get a personalized weekly diet plan with calories & macros.</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "20px" }}>
                <div>
                  <label className="modern-label">Weight (kg) *</label>
                  <input
                    type="number"
                    className="modern-input"
                    placeholder="e.g. 65"
                    value={formData.weight}
                    onChange={e => {
                      setFormData({ ...formData, weight: e.target.value });
                      setValidationErrors(prev => ({ ...prev, weight: null }));
                    }}
                    style={validationErrors.weight ? { borderColor: '#ef4444' } : {}}
                  />
                  {validationErrors.weight && (
                    <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', marginBottom: 0 }}>
                      {validationErrors.weight}
                    </p>
                  )}
                </div>
                <div>
                  <label className="modern-label">Height (cm or ft) *</label>
                  <input
                    type="text"
                    className="modern-input"
                    placeholder="e.g. 165 or 5'5"
                    value={formData.height}
                    onChange={e => {
                      setFormData({ ...formData, height: e.target.value });
                      setValidationErrors(prev => ({ ...prev, height: null }));
                    }}
                    style={validationErrors.height ? { borderColor: '#ef4444' } : {}}
                  />
                  {validationErrors.height && (
                    <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', marginBottom: 0 }}>
                      {validationErrors.height}
                    </p>
                  )}
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

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button onClick={downloadPDF} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "none", background: "var(--primary)", color: "white", cursor: "pointer", fontWeight: "600", fontSize: "0.95rem" }}>
                  📄 Download PDF
                </button>
                <button
                  onClick={handleEmailPlan}
                  disabled={isEmailSending}
                  style={{
                    flex: 1,
                    padding: "14px",
                    borderRadius: "12px",
                    border: "none",
                    background: isEmailSending ? "#9ca3af" : "#10b981",
                    color: "white",
                    cursor: isEmailSending ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                    opacity: isEmailSending ? 0.6 : 1
                  }}
                >
                  {isEmailSending ? "📧 Sending..." : "📧 Email Me"}
                </button>
              </div>

              {shareMsg && (
                <p style={{
                  color: shareMsg.includes("✅") ? "#10b981" : shareMsg.includes("❌") ? "#ef4444" : "#6366f1",
                  fontSize: "0.9rem",
                  marginTop: "12px",
                  textAlign: "center",
                  fontWeight: "500"
                }}>
                  {shareMsg}
                </p>
              )}

              <div style={{ display: "grid", gap: "15px", marginTop: "25px" }}>
                {days.map((day, index) => {
                  const dayPlan = generatedPlan[day] || {};
                  const totals = getDayTotals(dayPlan);

                  return (
                    <div key={day} style={{ background: "var(--bg)", padding: "20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                        <span style={{ background: "var(--primary)", color: "white", padding: "6px 14px", borderRadius: "20px", fontSize: "0.9rem", fontWeight: "600" }}>
                          {dayNames[index]}
                        </span>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "500" }}>
                          {totals.calories} kcal | P:{totals.protein}g C:{totals.carbs}g F:{totals.fat}g
                        </span>
                      </div>

                      <div style={{ display: "grid", gap: "10px" }}>
                        {mealTypes.map(mealType => {
                          const m = getMealData(dayPlan, mealType);
                          return (
                            <div key={mealType} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px", background: "var(--card)", borderRadius: "10px" }}>
                              <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600" }}>{mealLabels[mealType]}</p>
                                <p style={{ margin: "4px 0 0 0", fontWeight: "500" }}>{m.meal || "-"}</p>
                                {m.portions && (
                                  <p style={{ margin: "4px 0 0 0", fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                                    📏 {m.portions}
                                  </p>
                                )}
                              </div>
                              <div style={{ textAlign: "right", minWidth: "100px" }}>
                                <p style={{ margin: 0, fontWeight: "600", color: "var(--primary)" }}>{m.calories} kcal</p>
                                <p style={{ margin: "2px 0 0 0", fontSize: "0.7rem", color: "var(--text-muted)" }}>P:{m.protein}g C:{m.carbs}g F:{m.fat}g</p>
                              </div>
                            </div>
                          );
                        })}
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
