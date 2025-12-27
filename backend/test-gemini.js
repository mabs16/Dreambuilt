const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env' });

async function test() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('Testing Gemini API...');
    console.log('Key:', apiKey ? apiKey.substring(0, 5) + '...' : 'NONE');

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // Test gemini-3-flash-preview
        console.log('Model: gemini-3-flash-preview');
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        const result = await model.generateContent('Hola, responde con "OK"');
        const text = result.response.text();
        console.log('✅ SUCCESS (3-flash-preview). Response:', text);
    } catch (e) {
        console.error('❌ ERROR Msg:', e.message);
        if (e.response) {
            console.error('HTTP Status:', e.response.status);
            // console.error('Body:', JSON.stringify(e.response, null, 2));
        }

        // FALLBACK TEST
        console.log('\n--- Trying Fallback (gemini-pro) ---');
        try {
            const model2 = genAI.getGenerativeModel({ model: 'gemini-pro' });
            const result2 = await model2.generateContent('Hola');
            console.log('✅ SUCCESS (gemini-pro). Response:', result2.response.text());
        } catch (e2) {
            console.error('❌ Fallback failed too:', e2.message);
        }
    }
}
test();
