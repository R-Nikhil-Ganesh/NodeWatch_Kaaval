/**
 * Kaaval_Backend/db/index.js
 *
 * Identical pool module to backend_web/db/index.js.
 * Both backends share the same DATABASE_URL and therefore the same
 * PostgreSQL database instance.
 */

'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

const query = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
