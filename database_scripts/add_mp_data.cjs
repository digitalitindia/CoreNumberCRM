const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addMPData() {
  console.log('Adding Madhya Pradesh data...');
  
  // Add major cities for Madhya Pradesh
  const mpCities = ['Indore', 'Bhopal', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Rewa', 'Satna'];
  for (const city of mpCities) {
    await supabase.from('crm_settings').upsert({ setting_type: 'city_Madhya Pradesh', setting_value: city }, { onConflict: 'setting_type, setting_value', ignoreDuplicates: true });
  }

  // Add towns for Indore
  const indoreTowns = ['Vijay Nagar', 'Palasia', 'Bhawarkua', 'Rajwada', 'Annapurna', 'Mahalakshmi Nagar', 'Bengali Square'];
  for (const town of indoreTowns) {
    await supabase.from('crm_settings').upsert({ setting_type: 'town_Indore', setting_value: town }, { onConflict: 'setting_type, setting_value', ignoreDuplicates: true });
  }

  // Add towns for Bhopal
  const bhopalTowns = ['MP Nagar', 'Arera Colony', 'Bairagarh', 'Kolar Road', 'Awadhpuri', 'Indrapuri', 'TT Nagar'];
  for (const town of bhopalTowns) {
    await supabase.from('crm_settings').upsert({ setting_type: 'town_Bhopal', setting_value: town }, { onConflict: 'setting_type, setting_value', ignoreDuplicates: true });
  }

  console.log('Madhya Pradesh data added successfully!');
}

addMPData();
