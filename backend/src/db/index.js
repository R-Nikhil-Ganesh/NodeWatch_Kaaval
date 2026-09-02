import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.database.url,
  max: config.database.max,
  idleTimeoutMillis: config.database.idleTimeoutMillis,
  connectionTimeoutMillis: config.database.connectionTimeoutMillis,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

/** Execute a parameterized SQL query */
export const query = (text, params) => pool.query(text, params);

/** Obtain a client for multi-statement atomic transactions */
export const getClient = () => pool.connect();

export default pool;
