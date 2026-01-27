console.log("🔥 SERVER FILE LOADED - v2.2 (CACHE BUST) 🔥");

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail } from "./utils/emailService.js";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import helmet from "helmet";
import xss from "xss-clean";
import hpp from "hpp";
import compression from "compression";


import cron from "node-cron";
import { initPool, pool, testDB } from "./db.js";

/* SCHEMA AUTOMATION */
async function ensureSchema() {
  try {
    console.log("🛠 Ensuring Database Schema...");
    // Add missing columns safely
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS batch_time VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp VARCHAR(6);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires TIMESTAMP;
      
      -- Backfill plan from tier if exists
      DO $$
      BEGIN
        IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='users' AND column_name='tier') THEN
           UPDATE users SET plan = tier WHERE plan IS NULL AND tier IS NOT NULL;
        END IF;

        -- Hardening: Add CHECK constraint if missing (NOT VALID to preserve existing data)
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_tier') THEN
           ALTER TABLE users ADD CONSTRAINT check_tier CHECK (tier IN ('silver', 'gold', 'platinum')) NOT VALID;
        END IF;

        -- Ensure Attendance Unique Index for ON CONFLICT (Fixes attendance marking crashing)
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_unique_date') THEN
             CREATE UNIQUE INDEX idx_attendance_unique_date ON attendance(user_id, date);
        END IF;
      END $$;
    `);
    console.log("✅ Database Schema Ready.");
  } catch (err) {
    console.error("⚠️ Schema Auto-Update Warning:", err.message);
  }
}
ensureSchema();

const app = express();
app.set('trust proxy', 1); // Trust Render's proxy for rate limiting

// --- SECURITY MIDDLEWARE ---
// Set Security HTTP Headers
app.use(helmet());

// Prevent Cross-Site Scripting (XSS)
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Compress responses (Performance)
app.use(compression());

// Global Rate Limiting - Limit 100 requests per 10 mins per IP
const globalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 200, // Augmented limit for normal usage
  message: "Too many requests from this IP, please try again later."
});
app.use("/api", globalLimiter); // Apply to API routes if prefixed, or globally if not

// Allow CORS
app.use(cors());

// Body Parsers - Increased limit for email payloads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

import Razorpay from "razorpay";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_PLACEHOLDER",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "PLACEHOLDER_SECRET"
});

const isDev = process.env.NODE_ENV !== "production";

// Passport Google OAuth 2.0 Strategy - Production Ready
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Null-safe profile access
      const email = profile?.emails?.[0]?.value?.toLowerCase()?.trim();
      const name = profile?.displayName || "User";
      const googleId = profile?.id;

      if (!email) {
        console.error("Google OAuth: No email in profile");
        return done(null, false);
      }

      // Check if user exists
      let userResult = await pool.query("SELECT * FROM users WHERE LOWER(email)=$1", [email]);

      if (userResult.rowCount === 0) {
        // Create new user
        const randomPassword = crypto.randomBytes(16).toString("hex");
        const hash = await bcrypt.hash(randomPassword, 10);

        const insertResult = await pool.query(
          "INSERT INTO users (name, email, password, google_uid, active) VALUES ($1,$2,$3,$4,$5) RETURNING id, email, role, name, active",
          [name, email, hash, googleId, true]
        );
        return done(null, insertResult.rows[0]);
      } else {
        // Update google_uid if not set
        const existingUser = userResult.rows[0];
        if (!existingUser.google_uid) {
          await pool.query("UPDATE users SET google_uid=$1 WHERE id=$2", [googleId, existingUser.id]);
        }
        return done(null, existingUser);
      }
    } catch (err) {
      console.error("Google Strategy DB Error:", err.message);
      return done(null, false);
    }
  }
));

// Passport serialization (not using sessions, but required)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Initialize DB
// DB Init handled in startServer

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

// Rate Limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: "Too many login attempts from this IP, please try again after 15 minutes"
});

// Initialize Passport
app.use(passport.initialize());

// ==========================================
// GOOGLE OAUTH ROUTES - Production Ready
// ==========================================

const FRONTEND_URL = process.env.FRONTEND_URL || "https://www.saiaerobics.in";

// GET /auth/google - Initiate Google OAuth
app.get("/auth/google", (req, res, next) => {
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false
  })(req, res, next);
});

// GET /auth/google/callback - Handle Google OAuth callback (NEVER returns JSON)
app.get("/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user, info) => {
    try {
      // Auth failed or no user
      if (err || !user) {
        console.error("Google OAuth Error:", err?.message || "No user returned");
        return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
      }

      // Check if account is frozen
      if (user.active === false) {
        return res.redirect(`${FRONTEND_URL}/login?error=account_frozen`);
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, role: user.role || "member" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Build redirect URL
      const userName = encodeURIComponent(user.name || "User");
      const userRole = user.role || "member";
      const redirectUrl = `${FRONTEND_URL}/auth/callback?token=${token}&name=${userName}&role=${userRole}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google Callback Exception:", error.message);
      return res.redirect(`${FRONTEND_URL}/login?error=server_error`);
    }
  })(req, res, next);
});



// SHARE: Email Meal Plan
import { sendEmail } from "./utils/emailService.js";

app.post("/share/email", authenticate, async (req, res) => {
  try {
    const { planHtml, goal } = req.body;

    const userResult = await pool.query(
      "SELECT email FROM users WHERE id=$1",
      [req.user.id]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userEmail = userResult.rows[0].email;

    await sendEmail({
      to: userEmail,
      subject: `Your ${goal || "Weekly"} Meal Plan - Sai Aerobics 🥗`,
      html: planHtml
    });

    console.log(`✅ Meal plan email sent to ${userEmail}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Resend Email Error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
});


// AUTH: Register (Allowed for public signup)
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const lowerEmail = email.toLowerCase().trim();

    // Strong Password Check
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name, email, password, phone) VALUES ($1,$2,$3,$4) RETURNING id, email",
      [name, lowerEmail, hash, phone]
    );
    res.status(201).json({ message: "User created" });
  } catch (err) {
    console.error("SIGNUP ERROR:", err.message);
    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Signup failed. Please try again." });
  }
});

// AUTH: Login with Rate Limit
app.post("/auth/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const lowerEmail = email.toLowerCase().trim();
    console.log(`Login attempt for: ${lowerEmail}`);
    const result = await pool.query("SELECT * FROM users WHERE LOWER(email)=$1", [lowerEmail]);

    if (result.rowCount === 0) return res.status(401).json({ error: "Invalid email or password" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    if (!user.active) return res.status(403).json({ error: "Account is frozen. Contact admin." });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, role: user.role, name: user.name, id: user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AUTH: Forgot Password (Send OTP)
app.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const lowerEmail = email.toLowerCase().trim();

    // Check if user exists
    const userCheck = await pool.query("SELECT id FROM users WHERE LOWER(email)=$1", [lowerEmail]);
    if (userCheck.rowCount === 0) {
      // Security: Return 404 to let frontend know, or 200 to prevent enumeration (User requested 404 behavior)
      return res.status(404).json({ error: "User not found" });
    }

    // Generate 6-digit number OTP as string
    const otp = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 10 * 60000); // 10 Minutes

    // Store in DB FIRST - Atomic safety
    await pool.query(
      "UPDATE users SET otp=$1, otp_expires=$2 WHERE LOWER(email)=$3",
      [otp, expires, lowerEmail]
    );

    // Send Email (Non-blocking)
    // Send Email via Resend Utility
    sendEmail({
      to: lowerEmail,
      subject: "Password Reset OTP - Sai Aerobics",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #6366f1;">Reset Password</h2>
          <p>Your OTP code is:</p>
          <h1 style="background: #f3f4f6; color: #333; padding: 10px 20px; display: inline-block; border-radius: 5px; letter-spacing: 5px;">${otp}</h1>
          <p>Valid for 10 minutes.</p>
          <p style="color: #666; font-size: 0.9em;">If you didn't request this, ignore this email.</p>
        </div>
      `
    }).catch(err => console.error("❌ Failed to send OTP email:", err));

    // Respond immediately - do not wait for email
    console.log(`✅ OTP generated and saved for ${lowerEmail}`);
    res.json({ message: "OTP sent successfully" });

  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ error: "Failed to send OTP. Please try again." });
  }
});

// AUTH: Verify OTP
app.post("/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const lowerEmail = email.toLowerCase().trim();

    const result = await pool.query(
      "SELECT id FROM users WHERE LOWER(email)=$1 AND otp=$2 AND otp_expires > NOW()",
      [lowerEmail, otp]
    );

    if (result.rowCount === 0) return res.status(400).json({ error: "Invalid or expired OTP" });

    res.json({ message: "OTP Verified", valid: true });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// AUTH: Reset Password
app.post("/auth/reset-password", async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const lowerEmail = email.toLowerCase().trim();

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "UPDATE users SET password=$1, otp=NULL, otp_expires=NULL WHERE LOWER(email)=$2 AND otp=$3 AND otp_expires > NOW() RETURNING id",
      [hash, lowerEmail, otp]
    );

    if (result.rowCount === 0) return res.status(400).json({ error: "Invalid or expired OTP" });

    res.json({ message: "Password updated successfully! Please login." });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// AUTH: Google Login/Signup (Sync Firebase user)
app.post("/auth/google", async (req, res) => {
  try {
    const { email, name, uid } = req.body;
    const lowerEmail = email.toLowerCase().trim();

    // Check if user exists
    let user = await pool.query("SELECT * FROM users WHERE LOWER(email)=$1", [lowerEmail]);

    if (user.rowCount === 0) {
      // Create new user with random password (they'll use Google to login)
      const randomPassword = crypto.randomBytes(16).toString("hex");
      const hash = await bcrypt.hash(randomPassword, 10);

      const result = await pool.query(
        "INSERT INTO users (name, email, password, google_uid) VALUES ($1,$2,$3,$4) RETURNING id, email, role, name",
        [name, lowerEmail, hash, uid]
      );
      user = { rows: [result.rows[0]], rowCount: 1 };
    } else {
      // Update google_uid if not set
      if (!user.rows[0].google_uid) {
        await pool.query("UPDATE users SET google_uid=$1 WHERE id=$2", [uid, user.rows[0].id]);
      }
    }

    const userData = user.rows[0];

    if (!userData.active) {
      return res.status(403).json({ error: "Account is frozen. Contact admin." });
    }

    const token = jwt.sign({ id: userData.id, role: userData.role || "member" }, process.env.JWT_SECRET);
    res.json({ token, role: userData.role || "member", name: userData.name, id: userData.id });
  } catch (err) {
    console.error("Google Auth Error:", err);
    res.status(500).json({ error: "Google login failed. Please try again." });
  }
});




// PROFILE: Get User Details
app.get("/profile", authenticate, async (req, res) => {
  try {
    const userRes = await pool.query(
      "SELECT name, email, phone, height, tier, batch_time, membership_end, payment_status, expiry_date FROM users WHERE id=$1",
      [req.user.id]
    );

    // Get latest weight
    const weightRes = await pool.query(
      "SELECT weight FROM weight_logs WHERE user_id=$1 ORDER BY log_date DESC LIMIT 1",
      [req.user.id]
    );

    const profile = {
      ...userRes.rows[0],
      weight: weightRes.rows[0]?.weight || 0,
      payment_status: userRes.rows[0].payment_status,
      expiry_date: userRes.rows[0].expiry_date
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

// FEEDBACK: Submit User Feedback
app.post("/feedback", authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    await pool.query(
      "INSERT INTO feedback (user_id, message) VALUES ($1, $2)",
      [req.user.id, message]
    );

    res.json({ success: true, message: "Feedback submitted successfully! We appreciate your input." });
  } catch (err) {
    console.error("Feedback Error:", err);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

// DASHBOARD: Get user data with membership countdown and streak
app.get("/dashboard", authenticate, async (req, res) => {
  try {
    // 1. Fetch User (Essential) with Payment info (Use tier as plan)
    const userRes = await pool.query(
      "SELECT membership_end, tier, batch_time, payment_status, expiry_date FROM users WHERE id=$1",
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
      // FIX: Convert UTC timestamp to IST date string for correct comparison
      const weightRes = await pool.query(
        "SELECT weight, log_date as created_at, to_char(log_date AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') as date_str FROM weight_logs WHERE user_id=$1 ORDER BY log_date DESC LIMIT 30",
        [req.user.id]
      );
      weights = weightRes.rows;
    } catch (e) { console.error("Weight fetch failed:", e); }


    const membershipEnd = userRes.rows[0]?.membership_end;
    const tier = userRes.rows[0]?.tier || 'silver';
    const plan = tier; // Explicitly map tier to plan since column is missing

    const batchTime = userRes.rows[0]?.batch_time || 'Morning';
    const payment_status = userRes.rows[0]?.payment_status;
    const expiry_date = userRes.rows[0]?.expiry_date;

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
      plan,
      batchTime,
      payment_status,
      expiry_date
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
    // FIX: Use IST Date to match frontend expectation (UTC vs IST issue)
    const today = new Date().toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).split(",")[0];

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

// NUTRITION: AI Diet Plan - Production Ready with Calories & Macros (PAID MEMBERS ONLY)
app.post("/nutrition-plan", authenticate, async (req, res) => {
  try {
    const { weight, height, goal, diet, allergies, dailyRegulars, seed } = req.body;
    const userId = req.user.id;

    // Check subscription status
    const userResult = await pool.query(
      "SELECT name, payment_status, expiry_date, tier FROM users WHERE id=$1",
      [userId]
    );
    if (userResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = userResult.rows[0];
    const userName = user.name || "User";

    // Check if user has active subscription OR is Gold tier member
    const isGoldMember = user.tier && user.tier.toLowerCase() === "gold";
    const hasPaidSubscription = user.payment_status === "PAID" &&
      user.expiry_date &&
      new Date(user.expiry_date) > new Date();

    const isPaid = isGoldMember || hasPaidSubscription;

    if (!isPaid) {
      return res.status(403).json({
        success: false,
        error: "SUBSCRIPTION_REQUIRED",
        message: "This feature is available for premium members only. Please subscribe to access personalized meal plans."
      });
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    console.log("🔑 Checking Gemini Key:", GEMINI_KEY ? "Present" : "Missing");

    if (!GEMINI_KEY) {
      console.log("⚠️ No Gemini Key found. Using fallback plan.");
      return res.json({ success: true, plan: generateFallbackPlan(goal, diet) });
    }

    // Generate seed for variety (use provided or create new)
    const generationSeed = seed || Date.now();
    console.log("🌱 Generation Seed:", generationSeed);

    // Fetch recent meal plans to avoid repetition across regenerations (# DISABLED due to DB schema error)
    let recentFoods = [];

    const prompt = `You are a professional clinical nutritionist and meal-planning AI used in a real production fitness app.

YOU are the sole authority for deciding meals, snacks, and food choices.
No backend logic will restrict, filter, replace, or override your food decisions.

STRICT INPUTS:
Weight: ${weight} kg
Height: ${height} cm
Goal: ${goal}
Diet Type: ${diet}
Allergies: ${allergies || "None"}
Daily Regulars: ${dailyRegulars || "None"}
Seed: ${generationSeed}

DIET ENFORCEMENT (MANDATORY):
- Vegetarian → NO eggs, NO meat, NO fish
- Eggetarian → Eggs allowed, NO meat, NO fish
- Non-Vegetarian → Eggs, chicken, fish allowed; rotate proteins
- Vegan → NO dairy, NO eggs, NO animal products

DAILY REGULARS (STRONG PREFERENCE):
- Treat daily regulars as habitual foods
- Integrate them naturally (example: morning chai, evening coffee)
- Do NOT ignore them

SNACKS & MEALS:
- You are NOT restricted to any predefined snack or meal list
- Choose snacks freely based on diet and goal
- Meals must be realistic and culturally appropriate

VARIETY & RANDOMIZATION:
- Use the seed to ensure different plans every generation
- No meal may repeat within the 7-day plan

NUTRITION LOGIC:
- Weight Loss → calorie deficit
- Maintain Weight → maintenance calories
- Muscle Gain → calorie surplus with high protein

OUTPUT FORMAT (JSON ONLY):
{
  "day1": {
    "breakfast": { "meal": "...", "portions": "...", "calories": number, "protein": number, "carbs": number, "fat": number },
    "lunch": { ... },
    "dinner": { ... },
    "snacks": { ... }
  },
  ...
}

❌ No explanations
❌ No markdown
❌ No generic templates
❌ Do NOT ignore diet or daily regulars`;

    console.log("📤 Sending request to Gemini API...");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,  // Increased for more variety and creativity
          maxOutputTokens: 8192  // Increased for longer portions field
        }
      })
    });

    const data = await response.json();
    let plan = null;

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      console.log("✅ Received response from Gemini API");
      let rawText = data.candidates[0].content.parts[0].text;
      rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        rawText = jsonMatch[0];
      }

      try {
        const parsed = JSON.parse(rawText);
        plan = validateAndRepairPlan(parsed, goal, diet);
      } catch (e) {
        console.error("❌ JSON Parse Failed:", e.message);
        console.error("Raw Text was:", rawText.slice(0, 200) + "..."); // Log first 200 chars
        console.log("⚠️ Using fallback plan due to parse error.");
        plan = generateFallbackPlan(goal, diet);
      }
    } else {
      console.error("❌ Invalid response structure from Gemini:", JSON.stringify(data));
      console.log("⚠️ Using fallback plan due to API error.");
      plan = generateFallbackPlan(goal, diet);
    }

    return res.json({ success: true, plan });

  } catch (err) {
    console.error("Nutrition Plan Error:", err.message);
    return res.json({ success: true, plan: generateFallbackPlan("Weight Loss", "Vegetarian") });
  }
});

function validateAndRepairPlan(parsed, goal, diet) {
  const days = ["day1", "day2", "day3", "day4", "day5", "day6", "day7"];
  const meals = ["breakfast", "lunch", "dinner", "snacks"];
  const fallback = generateFallbackPlan(goal, diet);

  // Normalize keys helper
  const getCaseInsensitiveKey = (obj, key) => {
    return Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  };

  const plan = {};
  days.forEach((day, index) => {
    plan[day] = {};

    // Find day key (e.g., "Day 1", "Monday", "day1")
    let parsedDayKey = getCaseInsensitiveKey(parsed, day);

    // If not found, try index based (e.g. if parsed is array or has generic keys)
    if (!parsedDayKey) {
      const keys = Object.keys(parsed);
      if (keys[index]) parsedDayKey = keys[index];
    }

    const dayData = parsedDayKey ? parsed[parsedDayKey] : null;

    meals.forEach(meal => {
      let mealData = null;
      if (dayData) {
        const mealKey = getCaseInsensitiveKey(dayData, meal);
        if (mealKey) mealData = dayData[mealKey];
      }

      if (mealData) {
        const m = mealData;
        if (typeof m === "object" && m.meal) {
          plan[day][meal] = {
            meal: m.meal || fallback[day][meal].meal,
            portions: m.portions || fallback[day][meal].portions,
            calories: m.calories || fallback[day][meal].calories,
            protein: m.protein || fallback[day][meal].protein,
            carbs: m.carbs || fallback[day][meal].carbs,
            fat: m.fat || fallback[day][meal].fat
          };
        } else if (typeof m === "string") {
          plan[day][meal] = {
            meal: m,
            portions: fallback[day][meal].portions,
            calories: fallback[day][meal].calories,
            protein: fallback[day][meal].protein,
            carbs: fallback[day][meal].carbs,
            fat: fallback[day][meal].fat
          };
        } else {
          plan[day][meal] = fallback[day][meal];
        }
      } else {
        plan[day][meal] = fallback[day][meal];
      }
    });
  });
  return plan;
}

function generateFallbackPlan(goal, diet) {
  const isVeg = diet !== "Non-Vegetarian";
  const isWeightLoss = goal === "Weight Loss";
  const calMult = isWeightLoss ? 0.85 : 1;

  // Helper to pick random item from array
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Randomized meal options
  const breakfasts = [
    { meal: "Oats with milk & banana", portions: "Oats: 50g, Milk: 200ml, Banana: 1" },
    { meal: "Poha with peanuts", portions: "Poha: 1.5 bowls, Peanuts: 2 tbsp" },
    { meal: "Idli Sambar", portions: "Idli: 3 pcs, Sambar: 1 bowl" },
    { meal: "Besan Chilla", portions: "Chilla: 2 pcs, Chutney: 2 tbsp" },
    { meal: "Upma with veggies", portions: "Upma: 1.5 bowls" },
    { meal: "Masala Omelette & Toast", portions: "Eggs: 2, Toast: 2 slices" } // Non-veg option handled by logic
  ];

  const lunches = [
    { meal: "Dal Tadka, Rice, Sabzi", portions: "Dal: 1 bowl, Rice: 1 bowl, Sabzi: 1 bowl" },
    { meal: "Rajma Masala, Rice", portions: "Rajma: 1 bowl, Rice: 1 bowl, Salad: 1 plate" },
    { meal: "Chole, Rice, Salad", portions: "Chole: 1 bowl, Rice: 1 bowl, Salad: 1 plate" },
    { meal: "Paneer Butter Masala, Roti", portions: "Paneer: 1 bowl, Roti: 2 pcs" },
    { meal: "Chicken Curry, Rice", portions: "Chicken: 150g, Rice: 1 bowl" } // Non-veg
  ];

  const dinners = [
    { meal: "Khichdi with Ghee", portions: "Khichdi: 1.5 bowls, Ghee: 1 tsp" },
    { meal: "Vegetable Soup & Toast", portions: "Soup: 1 large bowl, Toast: 2 slices" },
    { meal: "Paneer Bhurji & Roti", portions: "Paneer: 100g, Roti: 2 pcs" },
    { meal: "Grilled Fish & Salad", portions: "Fish: 150g, Salad: 1 large bowl" }, // Non-veg
    { meal: "Moong Dal & Rice", portions: "Dal: 1 bowl, Rice: 1 bowl" }
  ];

  // Filter options based on diet
  const safeBreakfasts = isVeg ? breakfasts.filter(b => !b.meal.includes("Omelette")) : breakfasts;
  const safeLunches = isVeg ? lunches.filter(l => !l.meal.includes("Chicken") && !l.meal.includes("Fish")) : lunches;
  const safeDinners = isVeg ? dinners.filter(d => !d.meal.includes("Chicken") && !d.meal.includes("Fish")) : dinners;

  const days = ["day1", "day2", "day3", "day4", "day5", "day6", "day7"];
  const plan = {};

  days.forEach(day => {
    plan[day] = {
      breakfast: { ...pick(safeBreakfasts), calories: Math.round(350 * calMult), protein: 12, carbs: 45, fat: 10 },
      lunch: { ...pick(safeLunches), calories: Math.round(550 * calMult), protein: 22, carbs: 65, fat: 15 },
      dinner: { ...pick(safeDinners), calories: Math.round(450 * calMult), protein: 20, carbs: 40, fat: 12 },
      snacks: {
        meal: pick(["Green tea & Almonds", "Fruit Salad", "Roasted Chana", "Sprouts Chaat"]),
        portions: "Standard serving",
        calories: 150, protein: 5, carbs: 20, fat: 5
      }
    };
  });

  return plan;
}

// PAYMENT: Create Order (Razorpay)
app.post("/payment/order", authenticate, async (req, res) => {
  try {
    const options = {
      amount: 500 * 100, // ₹500 in paise
      currency: "INR",
      receipt: "receipt_" + req.user.id,
      notes: { userId: req.user.id }
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error("Payment Order Error:", err);
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

// PAYMENT: Verify & Update Subscription
app.post("/payment/verify", authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Payment Success!
      // Update User DB
      const today = new Date();
      const expiry = new Date();
      expiry.setDate(today.getDate() + 30); // 30 Days Validity

      await pool.query(
        `UPDATE users SET 
          payment_status='PAID', 
          payment_id=$1, 
          payment_date=$2, 
          expiry_date=$3 
         WHERE id=$4`,
        [razorpay_payment_id, today, expiry, req.user.id]
      );

      res.json({ success: true, message: "Payment Verified! Subscription Unlocked." });
    } else {
      res.status(400).json({ error: "Invalid Signature. Payment Verification Failed." });
    }
  } catch (err) {
    console.error("Payment Verify Error:", err);
    res.status(500).json({ error: "Verification Failed" });
  }
});

// ==========================================
// RAZORPAY LIVE PAYMENT INTEGRATION
// Routes: /payments/create-order, /payments/verify
// ==========================================

// POST /payments/create-order - Create Razorpay Order
app.post("/payments/create-order", authenticate, async (req, res) => {
  try {
    // Validate environment variables
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Razorpay keys not configured");
      return res.status(500).json({
        success: false,
        error: "Payment gateway not configured. Please contact support."
      });
    }

    // Get amount from request or use default
    const amount = req.body.amount || 500; // Default ₹500

    // Validate amount
    if (amount < 1 || amount > 100000) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount. Must be between ₹1 and ₹100,000."
      });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: `rcpt_${req.user.id}_${Date.now()}`,
      notes: {
        userId: req.user.id,
        purpose: "Nutrition Plan Subscription"
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID // Safe to expose - this is the public key
    });

  } catch (err) {
    console.error("Razorpay Create Order Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create payment order. Please try again."
    });
  }
});

// POST /payments/verify - Verify Razorpay Payment
app.post("/payments/verify", authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Missing required payment details."
      });
    }

    // Validate environment variable
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error("Razorpay secret not configured");
      return res.status(500).json({
        success: false,
        error: "Payment verification not configured. Please contact support."
      });
    }

    // Generate expected signature using HMAC SHA256
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    // Verify signature
    if (expectedSignature !== razorpay_signature) {
      console.error("Signature mismatch for user:", req.user.id);
      return res.status(400).json({
        success: false,
        error: "Payment verification failed. Invalid signature."
      });
    }

    // Payment verified! Update user subscription
    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + 30); // 30 Days Validity

    await pool.query(
      `UPDATE users SET 
        payment_status = 'PAID', 
        payment_id = $1, 
        payment_date = $2, 
        expiry_date = $3 
       WHERE id = $4`,
      [razorpay_payment_id, today, expiry, req.user.id]
    );

    console.log(`✅ Payment verified for user ${req.user.id}: ${razorpay_payment_id}`);

    res.json({
      success: true,
      message: "Payment successful! Your subscription is now active.",
      expiry_date: expiry.toISOString()
    });

  } catch (err) {
    console.error("Razorpay Verify Error:", err);
    res.status(500).json({
      success: false,
      error: "Payment verification failed. Please contact support."
    });
  }
});

// EMAIL: Share Plan





// NUTRITION: AI Diet Plan (using Gemini API)
app.post("/nutrition", authenticate, async (req, res) => {
  try {
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
      return res.json({ plan: "AI service not configured. Drink water and eat veggies!" });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
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
// ADMIN: Get all users (Table View)
app.get("/admin/users", authenticate, requireAdmin, async (req, res) => {
  try {
    // Try fetch with new columns (batch_time) - Removed plan as it doesn't exist
    const query = `
      SELECT u.id, u.name, u.email, u.phone, u.membership_end, u.active, u.tier, u.batch_time, u.height, s.last_logged, s.current_streak
      FROM users u
      LEFT JOIN streaks s ON u.id = s.user_id
        WHERE u.role = 'member'
      ORDER BY u.name ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Users Error (Primary):", err.message);

    // Fallback: If 'plan' or 'batch_time' missing, fetch without them to prevent UI crash
    try {
      console.warn("⚠️ Attempting fallback fetch for users...");
      const fallbackQuery = `
        SELECT u.id, u.name, u.email, u.phone, u.membership_end, u.active, u.tier, u.height, s.last_logged, s.current_streak
        FROM users u
        LEFT JOIN streaks s ON u.id = s.user_id
        WHERE u.role = 'member'
        ORDER BY u.name ASC
      `;
      const fallbackResult = await pool.query(fallbackQuery);
      res.json(fallbackResult.rows);
    } catch (fatalErr) {
      console.error("Fetch Users Error (Fatal):", fatalErr.message);
      res.status(500).json({ error: fatalErr.message });
    }
  }
});

// ADMIN: Update User Details
app.post("/admin/users/:id/update", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Align fields: Remove plan, keep only verified columns
    const { name, phone, email, height, tier, batch_time, membership_end } = req.body;

    // LOGGING
    console.log(`[Admin Update-Member] ID: ${id}`, req.body);

    // 1. Validate Tier
    let validTier = (tier || 'silver').toLowerCase();
    const allowedTiers = ['silver', 'gold', 'platinum'];
    if (!allowedTiers.includes(validTier)) validTier = 'silver';

    // 2. Validate Batch
    if (!batch_time) return res.status(400).json({ error: "Batch time is required" });

    // 3. Update DB
    let result;
    if (membership_end) {
      result = await pool.query(
        "UPDATE users SET name=$1, phone=$2, email=$3, height=$4, tier=$5, batch_time=$6, membership_end=$7 WHERE id=$8",
        [name, phone, email, height, validTier, batch_time, membership_end, id]
      );
    } else {
      result = await pool.query(
        "UPDATE users SET name=$1, phone=$2, email=$3, height=$4, tier=$5, batch_time=$6 WHERE id=$7",
        [name, phone, email, height, validTier, batch_time, id]
      );
    }

    if (result.rowCount === 0) {
      throw new Error("User not found or update failed");
    }

    res.json({ message: "User updated successfully" });
  } catch (err) {
    console.error("Update User Error:", err);
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

// ADMIN: Delete User (Permanent)
app.delete("/admin/users/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self (Admin)
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }

    // Delete related data first (Manual cascade if FK not set to CASCADE)
    await pool.query("DELETE FROM attendance WHERE user_id=$1", [id]);
    await pool.query("DELETE FROM streaks WHERE user_id=$1", [id]);
    await pool.query("DELETE FROM weight_logs WHERE user_id=$1", [id]);
    await pool.query("DELETE FROM feedback WHERE user_id=$1", [id]);

    // Delete User
    const result = await pool.query("DELETE FROM users WHERE id=$1 RETURNING name", [id]);

    if (result.rowCount === 0) return res.sendStatus(404);

    res.json({ message: `Member ${result.rows[0].name} deleted successfully` });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ error: "Failed to delete user. Ensure all related records are cleared." });
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
    initPool();
    // pool is imported from db.js, initPool sets it.
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
      // Ensure role is admin AND reset password to known default (useful for initial setup debugging)
      await pool.query("UPDATE users SET role='admin', password=$1 WHERE email=$2", [adminHash, adminEmail]);
      console.log("👑 Admin user verified & password sync");
    }

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
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
    if (!process.env.RESEND_API_KEY) {
      console.warn("⚠️ Resend not configured. Skipping expiry emails.");
      return;
    }


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
            <a href="https://www.saiaerobics.in"
   style="background: #6200ea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
   Renew Now
</a>
            <p style="margin-top: 20px; color: #666;">Keep pushing! 💪<br>Sai Aerobics Team</p>
        </div>
    `;

  try {
    await sendEmail({ to: email, subject, html });
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

// ==========================================
// WEIGHT LOGGING ROUTES
// ==========================================

// WEIGHT: Get Logs
app.get("/weight", authenticate, async (req, res) => {
  try {
    // Get last 30 logs
    const weightRes = await pool.query(
      "SELECT weight, log_date as date FROM weight_logs WHERE user_id=$1 ORDER BY log_date DESC LIMIT 30",
      [req.user.id]
    );
    res.json(weightRes.rows);
  } catch (err) {
    console.error("Fetch Weight Error:", err);
    res.status(500).json({ error: "Failed to fetch weight logs" });
  }
});

// WEIGHT: Add Log
app.post("/weight", authenticate, async (req, res) => {
  try {
    const { weight, date } = req.body;

    // Validate
    if (!weight || isNaN(weight) || weight < 20 || weight > 300) {
      return res.status(400).json({ error: "Invalid weight. Must be between 20 and 300 kg." });
    }

    await pool.query(
      "INSERT INTO weight_logs (user_id, weight, log_date) VALUES ($1, $2, $3)",
      [req.user.id, weight, date || new Date()]
    );

    // Update streak if needed (simple check)
    const today = new Date().toISOString().split("T")[0];
    await updateStreak(req.user.id, today);

    res.json({ message: "Weight logged successfully" });
  } catch (err) {
    console.error("Log Weight Error:", err);
    res.status(500).json({ error: "Failed to log weight" });
  }
});


// ==========================================
// PAYMENT ROUTES (Razorpay)
// ==========================================

// PAYMENT: Create Order
app.post("/payment/order", authenticate, async (req, res) => {
  try {
    const { amount, currency = "INR" } = req.body; // Amount in INR

    if (!amount) return res.status(400).json({ error: "Amount is required" });

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Convert to paisa (integer)
      currency,
      receipt: `receipt_${Date.now()}_${req.user.id}`
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error("Razorpay Order Error:", err);
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

// PAYMENT: Verify Payment
app.post("/payment/verify", authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Payment successful

      // Calculate new expiry date based on planType
      // planType: 'monthly' | 'quarterly' | 'yearly'

      let info = await pool.query("SELECT membership_end, tier FROM users WHERE id=$1", [req.user.id]);
      let currentEnd = info.rows[0].membership_end ? new Date(info.rows[0].membership_end) : new Date();
      if (currentEnd < new Date()) currentEnd = new Date(); // If expired, start from now

      let monthsToAdd = 1;
      if (planType === 'quarterly') monthsToAdd = 3;
      if (planType === 'yearly') monthsToAdd = 12;

      currentEnd.setMonth(currentEnd.getMonth() + monthsToAdd);

      await pool.query(
        "UPDATE users SET payment_status='PAID', payment_id=$1, payment_date=NOW(), membership_end=$2, active=true WHERE id=$3",
        [razorpay_payment_id, currentEnd, req.user.id]
      );

      res.json({ success: true, message: "Payment verified & Membership Updated!" });
    } else {
      res.status(400).json({ success: false, error: "Invalid signature" });
    }
  } catch (err) {
    console.error("Payment Verify Error:", err);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

// --- GLOBAL ERROR HANDLING MIDDLEWARE (OWASP: Proper Error Handling) ---
app.use((err, req, res, next) => {
  // Log error for internal monitoring
  console.error("🔥 Global Error:", err.stack); // Log stack internally

  // Determine error status and message
  const statusCode = err.isOperational ? err.statusCode : 500;
  const message = process.env.NODE_ENV === "production"
    ? "Something went wrong! Please try again later."
    : err.message; // Don't leak details in production

  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
    // Only show stack trace in development
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
});

startServer();