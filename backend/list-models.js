// List available models
require('dotenv').config({ path: '.env' });

const apiKey = process.env.GEMINI_API_KEY;

async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        console.log('Status:', response.status);
        const data = await response.json();

        if (data.models) {
            console.log('\nAvailable models:');
            data.models.forEach(m => {
                console.log(`- ${m.name} (${m.displayName})`);
            });
        } else {
            console.log('Response:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

listModels();
