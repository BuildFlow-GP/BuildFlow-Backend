// test-db.js
require('dotenv').config(); // Load .env

const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function testConnection() {
  try {
    await client.connect();
    console.log('✅ PostgreSQL connected successfully.');

    // Test access to schema
    const res = await client.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
      [process.env.DB_SCHEMA]
    );

    if (res.rows.length > 0) {
      console.log(`✅ Schema "${process.env.DB_SCHEMA}" exists.`);
    } else {
      console.warn(`⚠️ Schema "${process.env.DB_SCHEMA}" does NOT exist.`);
    }

  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await client.end();
  }
}

testConnection();
