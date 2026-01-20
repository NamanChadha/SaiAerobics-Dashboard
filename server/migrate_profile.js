import { initPool } from "./db.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

async function migrate() {
    console.log("🛠 Starting Profile Migration...");
    const pool = initPool();

    try {
        // Add height column if missing
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS height NUMERIC(5,2);
        `);
        console.log("✅ Added 'height' column to users table.");

    } catch (e) {
        console.error("❌ Migration Failed:", e);
    }
    process.exit();
}
migrate();
