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
CREATE TABLE IF NOT EXISTS automations (
  id SERIAL PRIMARY KEY,
  name VARCHAR DEFAULT 'lead_qualification',
  is_active BOOLEAN DEFAULT false,
  config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default config if not exists
INSERT INTO automations (name, is_active, config)
SELECT 'lead_qualification', false, '{
  "questions": [
    "¿Qué servicio estás buscando principalmente?",
    "¿Cuál es tu presupuesto estimado?",
    "¿Para cuándo planeas iniciar?"
  ],
  "welcomeMessage": "¡Hola! Soy el asistente virtual de Mabō OS. Para ayudarte mejor, ¿podrías responder unas preguntas rápidas?",
  "completionMessage": "¡Excelente! He recibido tus datos. En breve un asesor especializado se pondrá en contacto contigo."
}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM automations WHERE name = 'lead_qualification');
`;

async function run() {
    try {
        await client.connect();
        await client.query(sql);
        console.log('✅ Tabla automations creada con configuración por defecto.');
    } catch (err) {
        console.error('❌ Error creando tabla automations:', err);
    } finally {
        await client.end();
    }
}

run();
