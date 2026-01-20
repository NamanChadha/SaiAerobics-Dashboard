import dotenv from "dotenv";
dotenv.config();

console.log("RAW DATABASE_URL:", process.env.DATABASE_URL);
console.log("TYPE:", typeof process.env.DATABASE_URL);

import { pool } from "./db.js";

pool.query("SELECT 1")
  .then(() => console.log("PostgreSQL connected ✅"))
  .catch(err => console.error("PostgreSQL error ❌", err.message));
