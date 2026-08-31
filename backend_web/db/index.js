/**
 * backend_web/db/index.js  (ESM)
 *
 * Central PostgreSQL connection pool.
 * The ONLY place DATABASE_URL is read — change the env var to switch
 * between local, staging, or cloud PostgreSQL without touching any other file.
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/** Execute a parameterised SQL query. */
export const query = (text, params) => pool.query(text, params);

/** Obtain a client for multi-statement transactions. Release in a finally block. */
export const getClient = () => pool.connect();

export default pool;
