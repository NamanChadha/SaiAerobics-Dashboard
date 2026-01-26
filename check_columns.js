import { initPool } from "./server/db.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "server/.env") });

async function check() {
    const pool = initPool();
    console.log("🔍 Inspecting 'users' table columns...");

    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        console.table(res.rows);
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit();
}
check();
