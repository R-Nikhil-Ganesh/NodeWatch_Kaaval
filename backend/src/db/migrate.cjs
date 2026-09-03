'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(`SELECT to_regclass('public.users') AS exists`);
    if (!rows[0].exists) {
      console.log('Applying base schema...');
      const baseSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      await client.query(baseSql);
      console.log('Base schema applied.');
    } else {
      console.log('Base schema already present, skipping.');
    }

    console.log('Applying legal domain extension...');
    const legalSql = fs.readFileSync(path.join(__dirname, 'legal_extension.sql'), 'utf8');
    await client.query(legalSql);
    console.log('Legal domain extension applied.');
  } finally {
    await client.end();
  }
}

main()
  .then(() => console.log('Migration complete.'))
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
