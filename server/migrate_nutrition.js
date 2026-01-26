const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("render") ? { rejectUnauthorized: false } : false
});

async function migrate() {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS nutrition_plans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        goal VARCHAR(100),
        diet_type VARCHAR(50),
        allergies TEXT,
        notes TEXT,
        plan JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
        console.log("✅ nutrition_plans table created");

        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user_id ON nutrition_plans(user_id)
    `);
        console.log("✅ Index created");

        process.exit(0);
    } catch (err) {
        console.error("Migration Error:", err.message);
        process.exit(1);
    }
}

migrate();
