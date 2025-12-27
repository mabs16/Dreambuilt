const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function registerAdvisor() {
    const phone = '529842073085'; // Sin el símbolo +
    const name = 'Usuario Real';

    console.log(`Registrando asesor: ${name} (${phone})...`);

    const { data, error } = await supabase
        .from('advisors')
        .insert([
            { name, phone, score: 0 }
        ])
        .select();

    if (error) {
        console.error('Error al registrar:', error.message);
    } else {
        console.log('¡Asesor registrado con éxito!', data);
    }
}

registerAdvisor();
