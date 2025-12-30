// Direct API test for Gemini
require('dotenv').config({ path: '.env' });

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key:', apiKey ? apiKey.substring(0, 15) + '...' : 'NOT FOUND');

async function testDirect() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const body = {
        contents: [{
            parts: [{ text: "Hola, responde con un saludo breve." }]
        }]
    };

    console.log('Testing URL:', url.replace(apiKey, 'API_KEY'));

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        console.log('Status:', response.status, response.statusText);
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

testDirect();
