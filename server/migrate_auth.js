import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { pool, initPool } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

async function migrate() {
    try {
        initPool();
        console.log("Adding reset columns...");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP");
        console.log("✅ Columns added.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err.message);
        process.exit(1);
    }
}

migrate();
