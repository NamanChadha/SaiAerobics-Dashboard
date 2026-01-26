import { initPool } from "./db.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

async function migrate() {
    console.log("🛠 Starting Batch & Plan Migration...");
    const pool = initPool();

    try {
        // 1. Add batch_time column
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS batch_time VARCHAR(50);
        `);
        console.log("✅ Added 'batch_time' column.");

        // 2. Add plan column (if missing)
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS plan VARCHAR(50);
        `);
        console.log("✅ Added 'plan' column.");

        // 3. Migrate tier -> plan (if tier exists and plan is empty)
        // Check if tier column exists first
        const checkTier = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='tier';
        `);

        if (checkTier.rowCount > 0) {
            console.log("🔄 'tier' column found. Migrating data to 'plan'...");
            await pool.query(`
                UPDATE users 
                SET plan = tier 
                WHERE plan IS NULL AND tier IS NOT NULL;
            `);
            console.log("✅ Data migrated from tier to plan.");
        }

    } catch (e) {
        console.error("❌ Migration Failed:", e);
    }
    process.exit();
}
migrate();
