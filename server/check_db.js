import { initPool } from "./db.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

async function check() {
    console.log("🔍 Connecting to DB...");
    const pool = initPool();

    try {
        // Wait a bit for connection
        await new Promise(r => setTimeout(r, 1000));

        console.log("\n--- Users Schema ---");
        const userSchema = await pool.query("SELECT * FROM users LIMIT 1");
        if (userSchema.rows.length > 0) {
            console.log("Columns:", Object.keys(userSchema.rows[0]));
        } else {
            console.log("Table empty. Checking info schema...");
            const info = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
            console.log("Columns:", info.rows.map(r => r.column_name));
        }

        console.log("\n--- Attendance ---");
        const att = await pool.query("SELECT * FROM attendance ORDER BY date DESC");
        att.rows.forEach(r => console.log(`User ${r.user_id}: ${r.date} (Raw: ${JSON.stringify(r.date)})`));

        console.log("\n--- Streak ---");
        const streaks = await pool.query("SELECT * FROM streaks");
        console.log(streaks.rows);

        console.log("\n--- Weights Schema ---");
        const schema = await pool.query("SELECT * FROM weight_logs LIMIT 1");
        if (schema.rows.length > 0) {
            console.log("Columns:", Object.keys(schema.rows[0]));
        } else {
            console.log("Table empty. Checking information_schema...");
            const info = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'weight_logs'");
            console.log("Columns:", info.rows.map(r => r.column_name));
        }

    } catch (e) {
        console.error("Error:", e);
    }
    process.exit();
}
check();
