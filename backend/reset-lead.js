// Reset lead status to NUEVO
const { DataSource } = require('typeorm');
require('dotenv').config({ path: '.env' });

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
    entities: ['dist/**/*.entity.js'],
    synchronize: false,
});

async function resetLead() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected');

        // Execute raw query to reset the specific test number
        // The number from logs is 5219848066428
        const phone = '5219848066428';

        console.log(`Cleaning data for ${phone}...`);

        // 1. Delete messages (both directions)
        await AppDataSource.query(
            `DELETE FROM messages WHERE "to" = $1 OR "from" = $1`,
            [phone]
        );

        // 2. Delete assignments (linked to lead)
        // Need lead ID first? Or subquery
        await AppDataSource.query(
            `DELETE FROM assignments WHERE lead_id IN (SELECT id FROM leads WHERE phone = $1)`,
            [phone]
        );

        // 3. Delete Lead
        await AppDataSource.query(
            `DELETE FROM leads WHERE phone = $1`,
            [phone]
        );

        // 4. Redis Clear
        const Redis = require('ioredis');
        const redis = new Redis({
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            tls: { rejectUnauthorized: false }
        });

        await redis.del(`bot_history:${phone}`);
        await redis.del(`bot_state:${phone}`);

        console.log(`✅ HARD RESET DONE for ${phone}. Messages, Assignments, Lead, and Redis Cleared.`);

        await AppDataSource.destroy();
        redis.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

resetLead();
