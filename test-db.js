const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    });

    console.log('Intentando conectar con:', {
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD ? '********' : 'FALTA',
        database: process.env.DB_NAME,
    });

    try {
        await client.connect();
        console.log('✅ Conexión exitosa a Supabase.');

        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);

        console.log('Tablas encontradas:');
        res.rows.forEach(row => console.log(`- ${row.table_name}`));

        await client.end();
    } catch (err) {
        console.error('❌ Error de conexión:', err);
    }
}

testConnection();
