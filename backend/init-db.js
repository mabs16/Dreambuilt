const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  wa_id VARCHAR,
  "from" VARCHAR NOT NULL,
  "to" VARCHAR NOT NULL,
  body TEXT NOT NULL,
  direction VARCHAR DEFAULT 'inbound',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lead_id INTEGER REFERENCES leads(id)
);
`;

async function run() {
    try {
        await client.connect();
        await client.query(sql);
        console.log('✅ Tabla messages creada o ya existe.');
    } catch (err) {
        console.error('❌ Error creando tabla:', err);
    } finally {
        await client.end();
    }
}

run();
