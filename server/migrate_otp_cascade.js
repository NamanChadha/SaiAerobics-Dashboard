import { initPool } from "./db.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

async function migrate() {
    console.log("🛠 Starting OTP & Cascade Migration...");
    const pool = initPool();

    try {
        // 1. Add OTP columns
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS otp VARCHAR(6),
            ADD COLUMN IF NOT EXISTS otp_expires TIMESTAMP;
        `);
        console.log("✅ Added 'otp' and 'otp_expires' columns.");

        // 2. Drop and Recreaté Foreign Keys with CASCADE
        const tables = ["nutrition_plans", "attendance", "feedback", "streaks", "weight_logs"];

        for (const table of tables) {
            // Drop existing constraint (assuming default naming or checking if exists is hard, 
            // but usually valid to try dropping the most common name or just recreating if we knew the name.
            // Since we don't know exact constraint name, we'll look it up.)

            const constraints = await pool.query(`
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = $1 AND constraint_type = 'FOREIGN KEY';
            `, [table]);

            for (const row of constraints.rows) {
                // Check if this FK points to users(id) - simplistic check
                // For safety, we DROP any FK on these tables and re-add user_id FK.
                // Assuming standard "user_id" column.
                // A better approach: Just ADD CASCADE if not present? Postgres doesn't support ALTER CONSTRAINT easily.
                // We must DROP and ADD.

                await pool.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`);
            }

            // Re-add FK with CASCADE
            await pool.query(`
                ALTER TABLE ${table} 
                ADD CONSTRAINT fk_${table}_user 
                FOREIGN KEY (user_id) 
                REFERENCES users(id) 
                ON DELETE CASCADE;
            `);
            console.log(`✅ Updated ${table} to ON DELETE CASCADE.`);
        }

    } catch (e) {
        console.error("❌ Migration Failed:", e);
    }
    process.exit();
}
migrate();
