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

    // Auto-migration: Create Tables if not exist
    await pool.query(`
      -- Users Table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(200) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(10) DEFAULT 'member',
        active BOOLEAN DEFAULT true,
        membership_start DATE DEFAULT CURRENT_DATE,
        membership_end DATE,
        height NUMERIC(5,2),
        tier VARCHAR(20) DEFAULT 'silver',
        batch_time VARCHAR(20) DEFAULT 'Morning',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reset_token VARCHAR,
        reset_expires TIMESTAMP
      );

      -- Streaks Table
      CREATE TABLE IF NOT EXISTS streaks (
        user_id INTEGER PRIMARY KEY REFERENCES users(id),
        current_streak INTEGER DEFAULT 0,
        last_logged TIMESTAMP
      );

      -- Weight Logs Table
      CREATE TABLE IF NOT EXISTS weight_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        weight NUMERIC(5,2),
        log_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Attendance Table
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      );

      -- Feedback Table
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Alter Tables (for backward compatibility if run on existing DBs)
      ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_start DATE DEFAULT CURRENT_DATE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR DEFAULT 'silver';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS batch_time VARCHAR DEFAULT 'Morning';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'UNPAID';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP;
    `);
    console.log("✅ DB Schema verified");
  } catch (err) {
    console.error("❌ DB query error:", err);
    console.error("Connection String defined:", !!pool.options.connectionString);
    throw err;
  }
}
