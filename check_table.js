import { initPool } from "./server/db.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "server/.env") }); // Adjust path to server/.env

async function check() {
    const pool = initPool();
    console.log("🔍 Checking DB...");

    try {
        const users = await pool.query("SELECT id, email, name FROM users");
        console.log("Users:", users.rows);

        const att = await pool.query("SELECT * FROM attendance");
        console.log("Attendance Logs:", att.rows);

        const logs = await pool.query("SELECT * FROM weight_logs");
        console.log("Weight Logs:", logs.rows);

    } catch (e) {
        console.error("Error:", e);
    }
    process.exit();
}
check();
