import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkAdvisors() {
  console.log('Connecting to DB...', {
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    db: process.env.DB_NAME,
  });

  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected!');

    const res = await client.query(
      'SELECT id, name, phone, score FROM advisors',
    );
    console.log(`Found ${res.rows.length} advisors:`);
    console.table(res.rows);
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await client.end();
  }
}

void checkAdvisors();
