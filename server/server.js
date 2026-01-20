console.log("🔥 SERVER FILE LOADED 🔥");

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import cron from "node-cron";
import { initPool, testDB, pool } from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());

// Middleware: Authenticate JWT
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Middleware: Require Admin
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.sendStatus(403);
  }
  next();
};



// AUTH: Register
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    console.log("SIGNUP REQUEST:", email);

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, email, password, phone) VALUES ($1,$2,$3,$4) RETURNING id, email",
      [name, email, hash, phone]
    );

    console.log("USER INSERTED:", result.rows[0]);

    res.status(201).json({ message: "User created" });
  } catch (err) {
    console.error("SIGNUP ERROR:", err.message);
    res.status(500).json({ error: "Signup failed" });
  }
});

// AUTH: Login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET
    );

    res.json({
      token,
      role: user.role,
      name: user.name,
      id: user.id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PROFILE: Get User Details
app.get("/profile", authenticate, async (req, res) => {
  try {
    const userRes = await pool.query(
      "SELECT name, email, phone, height, tier, batch_time, membership_end FROM users WHERE id=$1",
      [req.user.id]
    );

    // Get latest weight
    const weightRes = await pool.query(
      "SELECT weight FROM weight_logs WHERE user_id=$1 ORDER BY log_date DESC LIMIT 1",
      [req.user.id]
    );

    const profile = {
      ...userRes.rows[0],
      weight: weightRes.rows[0]?.weight || 0
    };
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PROFILE: Update User Details
app.put("/profile", authenticate, async (req, res) => {
  try {
    const { name, email, phone, height, weight } = req.body;

    // 1. Update User Table
    await pool.query(
      "UPDATE users SET name=$1, email=$2, phone=$3, height=$4 WHERE id=$5",
      [name, email, phone, height, req.user.id]
    );

    // 2. Handle Weight Update (Log if changed/new)
    if (weight) {
      // Check last weight to avoid duplicate logs if same
      const lastW = await pool.query("SELECT weight FROM weight_logs WHERE user_id=$1 ORDER BY log_date DESC LIMIT 1", [req.user.id]);
      const currentW = lastW.rows[0]?.weight;

      if (currentW != weight) {
        await pool.query(
          "INSERT INTO weight_logs(user_id, weight, log_date) VALUES($1,$2, NOW())",
          [req.user.id, weight]
        );
        // Update streak
        const today = new Date().toISOString().split("T")[0];
        await updateStreak(req.user.id, today);
      }
    }

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("Profile Update Error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// DASHBOARD: Get user data with membership countdown and streak
app.get("/dashboard", authenticate, async (req, res) => {
  try {
    // 1. Fetch User (Essential)
    const userRes = await pool.query(
      "SELECT membership_end, tier, batch_time FROM users WHERE id=$1",
      [req.user.id]
    );

    if (userRes.rowCount === 0) {
      // Token is valid but user gone? Should typically not happen unless deleted.
      return res.json({ daysLeft: 0, streak: 0, streakDates: [], weights: [], tier: 'silver', batchTime: 'Morning' });
    }

    // 2. Fetch Streaks (Safe)
    const streakRes = await pool.query(
      "SELECT current_streak, last_logged FROM streaks WHERE user_id=$1",
      [req.user.id]
    );

    // 3. Fetch Attendance/Activity (Safe)
    let uniqueDates = [];
    try {
      // Use to_char to avoid timezone shifts (e.g. IST midnight -> UTC previous day)
      const activityRes = await pool.query(
        "SELECT to_char(date, 'YYYY-MM-DD') as date_str FROM attendance WHERE user_id=$1 ORDER BY date DESC",
        [req.user.id]
      );

      const streakDates = activityRes.rows.map(row => row.date_str).filter(Boolean);
      uniqueDates = [...new Set(streakDates)];
    } catch (e) {
      console.error("Attendance fetch failed:", e);
      // Fallback: empty calendar is better than crash
    }

    // 4. Fetch Weights (Safe)
    let weights = [];
    try {
      // FIX: Column is "log_date", not "created_at"
      // Aliasing log_date -> created_at for frontend compatibility
      const weightRes = await pool.query(
        "SELECT weight, log_date as created_at, to_char(log_date, 'YYYY-MM-DD') as date_str FROM weight_logs WHERE user_id=$1 ORDER BY log_date DESC LIMIT 30",
        [req.user.id]
      );
      weights = weightRes.rows;
    } catch (e) { console.error("Weight fetch failed:", e); }


    const membershipEnd = userRes.rows[0]?.membership_end;
    const tier = userRes.rows[0]?.tier || 'silver';
    const batchTime = userRes.rows[0]?.batch_time || 'Morning';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daysLeft = 0;
    if (membershipEnd) {
      const end = new Date(membershipEnd);
      end.setHours(0, 0, 0, 0);
      daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    }

    res.json({
      daysLeft: Math.max(0, daysLeft),
      streak: streakRes.rows[0]?.current_streak || 0,
      streakDates: uniqueDates,
      weights: weights,
      tier,
      batchTime
    });
  } catch (err) {
    console.error("DASHBOARD CRITICAL FAIL:", err);
    // Return empty state instead of 500 so UI loads
    res.json({ daysLeft: 0, streak: 0, streakDates: [], weights: [], tier: 'silver', batchTime: 'Morning' });
  }
});

// ATTENDANCE: Mark attendance manually
app.post("/attendance", authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Insert into attendance if not exists
    await pool.query(
      "INSERT INTO attendance (user_id, date) VALUES ($1, $2) ON CONFLICT (user_id, date) DO NOTHING",
      [req.user.id, today]
    );

    // Update streak logic (Shared)
    await updateStreak(req.user.id, today);

    res.json({ message: "Attendance marked" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to update streak
async function updateStreak(userId, todayDate) {
  const streak = await pool.query(
    "SELECT * FROM streaks WHERE user_id=$1",
    [userId]
  );

  if (streak.rowCount === 0) {
    await pool.query(
      "INSERT INTO streaks(user_id,current_streak,last_logged) VALUES($1,1,$2)",
      [userId, todayDate]
    );
  } else {
    const last = streak.rows[0].last_logged.toISOString().split("T")[0];
    if (last === todayDate) return; // Already logged today

    const diffMs = new Date(todayDate) - new Date(last);
    const diff = diffMs / (1000 * 60 * 60 * 24);

    const newStreak = diff === 1 ? streak.rows[0].current_streak + 1 : 1;

    await pool.query(
      "UPDATE streaks SET current_streak=$1,last_logged=$2 WHERE user_id=$3",
      [newStreak, todayDate, userId]
    );
  }
}

// WEIGHT: Save weight and update streak (Also marks attendance)
app.post("/weight", authenticate, async (req, res) => {
  try {
    const { weight } = req.body;
    const today = new Date().toISOString().split("T")[0];

    // Save weight log - Explicitly set log_date to NOW() since default might be missing
    await pool.query(
      "INSERT INTO weight_logs(user_id, weight, log_date) VALUES($1,$2, NOW())",
      [req.user.id, weight]
    );

    // Also mark attendance
    await pool.query(
      "INSERT INTO attendance (user_id, date) VALUES ($1, $2) ON CONFLICT (user_id, date) DO NOTHING",
      [req.user.id, today]
    );

    // Update streak
    await updateStreak(req.user.id, today);

    res.status(201).json({ message: "Weight logged" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// NUTRITION: AI Diet Plan (Generate & Send)
app.post("/nutrition-plan", authenticate, async (req, res) => {
  try {
    const { weight, height, goal, diet, allergies, deliveryMethod } = req.body;

    // Fetch user details
    const user = await pool.query("SELECT phone, email, name FROM users WHERE id=$1", [req.user.id]);
    if (user.rowCount === 0) return res.status(404).json({ error: "User not found" });

    const { phone, email, name } = user.rows[0];
    const method = deliveryMethod || 'whatsapp'; // Default to whatsapp

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const TWILIO_SID = process.env.TWILIO_SID;
    const TWILIO_AUTH = process.env.TWILIO_AUTH;
    const TWILIO_WHATSAPP = process.env.TWILIO_WHATSAPP;
    const EMAIL_USER = process.env.EMAIL_USER;
    const EMAIL_PASS = process.env.EMAIL_PASS;

    // 1. Generate Plan with Gemini (Request JSON)
    const prompt = `Create a 7-day ${diet} Indian meal plan for ${name} (Weight: ${weight}kg, Goal: ${goal}). 
    Allergies: ${allergies || "None"}.
    Response MUST be a raw JSON Array with no markdown formatting.
    Format:
    [
      { 
        "day": "Mon", 
        "breakfast": "...", "calories_breakfast": "150 kcal",
        "lunch": "...", "calories_lunch": "300 kcal",
        "snack": "...", "calories_snack": "100 kcal",
        "dinner": "...", "calories_dinner": "250 kcal"
      },
      ...
    ]
    Keep meals brief and practical.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    let planData = [];

    if (data.candidates && data.candidates[0].content) {
      const rawText = data.candidates[0].content.parts[0].text;
      // Clean potential markdown code blocks if AI adds them
      const jsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      try {
        planData = JSON.parse(jsonText);
      } catch (e) {
        console.error("JSON Parse Error:", e, jsonText);
        throw new Error("AI generated invalid format. Please try again.");
      }
    } else {
      console.error("Gemini Error:", JSON.stringify(data));
      throw new Error("Failed to generate plan from AI.");
    }

    // Always return the plan object
    res.json({ success: true, plan: planData });

  } catch (err) {
    console.error("Nutrition Plan Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// EMAIL: Share Plan
app.post("/share/email", authenticate, async (req, res) => {
  try {
    const { planHtml, goal } = req.body; // Expecting formatted HTML table or text from frontend

    const user = await pool.query("SELECT email FROM users WHERE id=$1", [req.user.id]);
    const email = user.rows[0]?.email;

    const EMAIL_USER = process.env.EMAIL_USER;
    const EMAIL_PASS = process.env.EMAIL_PASS;

    if (!EMAIL_USER || !EMAIL_PASS) {
      return res.status(500).json({ error: "Email service not configured on server." });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    });

    await transporter.sendMail({
      from: `"Sai Aerobics AI" <${EMAIL_USER}>`,
      to: email,
      subject: `🥗 Your ${goal} Meal Plan`,
      html: `
          <h3>Your Personalized Meal Plan</h3>
          <p>Goal: ${goal}</p>
          <hr/>
          ${planHtml}
          <br/>
          <p>Stay healthy!<br/>- Sai Aerobics Team</p>
        `
    });

    res.json({ success: true, message: `Email sent to ${email}` });
  } catch (err) {
    console.error("Email Share Error:", err);
    res.status(500).json({ error: "Failed to send email." });
  }
});



// NUTRITION: AI Diet Plan (using Gemini API)
app.post("/nutrition", authenticate, async (req, res) => {
  try {
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
      return res.json({ plan: "AI service not configured. Drink water and eat veggies!" });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Give me one short, practical nutrition tip for a gym member. Keep it under 2 sentences. Do not use markdown."
          }]
        }]
      })
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0].content) {
      const tip = data.candidates[0].content.parts[0].text;
      // Send as a single string field 'tip' or keep 'plan' array structure if front-end expects it.
      // Front-end expects 'plan' array in previous code, but dashboard wants a single string.
      // Let's send a single 'tip' field for the dashboard.
      res.json({ tip });
    } else {
      console.error("Gemini Error:", JSON.stringify(data));
      res.status(500).json({ error: "Failed to generate tip" });
    }

  } catch (err) {
    console.error("AI Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Stats
app.get("/admin/stats", authenticate, requireAdmin, async (req, res) => {
  try {
    const total = await pool.query("SELECT COUNT(*) FROM users WHERE role='member' AND active=true");
    const inactive = await pool.query(`
      SELECT COUNT(*) FROM users 
      WHERE role='member' 
      AND active=true 
      AND id NOT IN (
        SELECT user_id FROM streaks WHERE last_logged > NOW() - INTERVAL '3 days'
      )
    `);
    const expiring = await pool.query(`
      SELECT COUNT(*) FROM users 
      WHERE role='member' 
      AND active=true 
      AND membership_end BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    `);

    // New Joins (This Month)
    const newJoins = await pool.query(`
      SELECT COUNT(*) FROM users 
      WHERE role='member' 
      AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
    `);

    // Today's Attendance
    const todayAttendance = await pool.query(`
      SELECT COUNT(*) FROM attendance 
      WHERE date = CURRENT_DATE
    `);

    res.json({
      totalMembers: parseInt(total.rows[0].count),
      inactive: parseInt(inactive.rows[0].count),
      expiringSoon: parseInt(expiring.rows[0].count),
      newJoins: parseInt(newJoins.rows[0].count),
      todayAttendance: parseInt(todayAttendance.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Get all users (Table View)
app.get("/admin/users", authenticate, requireAdmin, async (req, res) => {
  try {
    // Basic user info + simplified streak/last activity integration
    const query = `
      SELECT u.id, u.name, u.email, u.phone, u.membership_end, u.active, s.last_logged, s.current_streak
      FROM users u
      LEFT JOIN streaks s ON u.id = s.user_id
      WHERE u.role = 'member'
      ORDER BY u.name ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Get single user detail (Aggregated)
app.get("/admin/users/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await pool.query("SELECT id, name, email, phone, membership_end, active FROM users WHERE id=$1", [id]);
    const streak = await pool.query("SELECT * FROM streaks WHERE user_id=$1", [id]);
    const weights = await pool.query("SELECT * FROM weight_logs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30", [id]);

    if (user.rowCount === 0) return res.sendStatus(404);

    res.json({
      profile: user.rows[0],
      streak: streak.rows[0] || { current_streak: 0 },
      weights: weights.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Extend Membership
app.post("/admin/users/:id/extend", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.body;

    // First get current end date
    const user = await pool.query("SELECT membership_end FROM users WHERE id=$1", [id]);
    let currentEnd = new Date(user.rows[0].membership_end || new Date());
    if (currentEnd < new Date()) currentEnd = new Date(); // If expired, start from today

    currentEnd.setDate(currentEnd.getDate() + parseInt(days));

    await pool.query("UPDATE users SET membership_end=$1 WHERE id=$2", [currentEnd, id]);
    res.json({ message: "Membership extended", newEnd: currentEnd });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Toggle Active Status
app.post("/admin/users/:id/toggle-active", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await pool.query("SELECT active FROM users WHERE id=$1", [id]);
    const newStatus = !user.rows[0].active;

    await pool.query("UPDATE users SET active=$1 WHERE id=$2", [newStatus, id]);
    res.json({ message: "Status updated", active: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Get Graph Data
app.get("/admin/graphs", authenticate, requireAdmin, async (req, res) => {
  try {
    // 1. Attendance Trend (Last 7 Days)
    const attendanceTrend = await pool.query(`
      SELECT to_char(date, 'Mon DD') as date, COUNT(*) as count 
      FROM attendance 
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY date 
      ORDER BY date ASC
    `);

    // 2. Member Growth (Last 6 Months)
    const memberGrowth = await pool.query(`
      SELECT to_char(date_trunc('month', created_at), 'Mon') as month, COUNT(*) as count 
      FROM users 
      WHERE role='member' 
      AND created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY date_trunc('month', created_at) 
      ORDER BY date_trunc('month', created_at) ASC
    `);

    res.json({
      attendance: attendanceTrend.rows,
      growth: memberGrowth.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Update User Details
app.post("/admin/users/:id/update", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, height, weight, tier } = req.body;

    await pool.query(
      "UPDATE users SET name=$1, phone=$2, email=$3, height=$4, weight=$5, tier=$6 WHERE id=$7",
      [name, phone, email, height, weight, tier, id]
    );
    res.json({ message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Attendance Override
app.post("/admin/users/:id/attendance", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, action } = req.body; // action: 'add' or 'remove'

    if (action === 'add') {
      await pool.query(
        "INSERT INTO attendance (user_id, date) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [id, date]
      );
      // Re-calc streak
      await updateStreak(id, date);
    } else {
      await pool.query("DELETE FROM attendance WHERE user_id=$1 AND date=$2", [id, date]);
      // Re-calc streak (simplified: just leave it or reset if needed, complex to fully recalc backwards)
    }

    res.json({ message: "Attendance updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "✅ Server running" });
});

// DB init (ONLY ONCE)
async function startServer() {
  try {
    const pool = initPool();
    await testDB();
    console.log("PostgreSQL connected ✅");

    // Seed Admin User
    const adminEmail = "namanchadhajii147@gmail.com";
    const adminPass = "Omsairam147@";
    const adminHash = await bcrypt.hash(adminPass, 10);

    // Check if admin exists
    const adminCheck = await pool.query("SELECT * FROM users WHERE email=$1", [adminEmail]);
    if (adminCheck.rowCount === 0) {
      await pool.query(
        "INSERT INTO users (name, email, password, phone, role, active) VALUES ($1, $2, $3, $4, $5, $6)",
        ["Admin", adminEmail, adminHash, "9999999999", "admin", true]
      );
      console.log("👑 Admin user created!");
    } else {
      // Ensure role is admin
      await pool.query("UPDATE users SET role='admin' WHERE email=$1", [adminEmail]);
      console.log("👑 Admin user verified");
    }

    app.listen(5000, () => {
      console.log("🚀 Server running on http://localhost:5000");
    });
  } catch (err) {
    console.error("DB init error:", err.message);
    process.exit(1);
  }
}

// --- Scheduler ---
cron.schedule("0 9 * * *", async () => {
  console.log("⏰ Running daily membership expiry check...");
  await checkMembershipExpiry();
});

async function checkMembershipExpiry() {
  try {
    if (!process.env.EMAIL_USER) return;

    // 7 Days Left
    const sevenDays = await pool.query(
      "SELECT email, name FROM users WHERE membership_end::date = CURRENT_DATE + interval '7 days' AND active=true"
    );
    for (const user of sevenDays.rows) {
      await sendExpiryEmail(user.email, user.name, 7);
    }

    // 3 Days Left
    const threeDays = await pool.query(
      "SELECT email, name FROM users WHERE membership_end::date = CURRENT_DATE + interval '3 days' AND active=true"
    );
    for (const user of threeDays.rows) {
      await sendExpiryEmail(user.email, user.name, 3);
    }
  } catch (e) {
    console.error("Expiry Check Error:", e);
  }
}

async function sendExpiryEmail(email, name, days) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  const subject = days === 7
    ? "Reminder: Membership Expiring in 7 Days ⏳"
    : "Urgent: Membership Expiring in 3 Days! ⚠️";

  const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #6200ea;">Sai Aerobics</h2>
            <h3>Hello ${name},</h3>
            <p>This is a gentle reminder that your gym membership is set to expire in <strong>${days} days</strong>.</p>
            <p>Please renew your plan to continue your fitness journey without interruption!</p>
            <br>
            <a href="http://localhost:3000" style="background: #6200ea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Renew Now</a>
            <p style="margin-top: 20px; color: #666;">Keep pushing! 💪<br>Sai Aerobics Team</p>
        </div>
    `;

  try {
    await transporter.sendMail({ from: process.env.EMAIL_USER, to: email, subject, html });
    console.log(`📧 Sent ${days}-day expiry alert to ${email}`);
  } catch (e) {
    console.error(`Failed to send email to ${email}:`, e);
  }
}

// Test Route for Expiry Check
app.post("/admin/trigger-expiry", authenticate, requireAdmin, async (req, res) => {
  await checkMembershipExpiry();
  res.json({ message: "Expiry check triggered manually." });
});

startServer();