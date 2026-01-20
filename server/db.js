import pkg from "pg";
const { Pool } = pkg;

export let pool;

export function initPool() {
  const isProd = process.env.NODE_ENV === "production";
  const connectionString = process.env.DATABASE_URL;

  console.log(`Initializing database connection (${isProd ? "PROD" : "DEV"})...`);

  pool = new Pool({
    connectionString,
    ssl: isProd ? { rejectUnauthorized: false } : false
  });

  pool.on('error', (err) => {
    console.error("Pool error:", err.message);
  });

  return pool;
}

export async function testDB() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ DB query successful");

    // Auto-migration (safe to run multiple times)
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_start DATE DEFAULT CURRENT_DATE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR DEFAULT 'silver';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS batch_time VARCHAR DEFAULT 'Morning';

      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      );
    `);
    console.log("✅ DB Schema verified");
  } catch (err) {
    console.error("❌ DB query error:", err.message);
    throw err;
  }
}
