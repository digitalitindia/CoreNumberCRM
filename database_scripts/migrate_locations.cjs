const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Migrating location data...');
  
  // 1. Update known cities
  await supabase.from('crm_settings').update({ setting_type: 'city_Gujarat' }).eq('setting_value', 'Surat');
  await supabase.from('crm_settings').update({ setting_type: 'city_Gujarat' }).eq('setting_value', 'Ahmedabad');
  await supabase.from('crm_settings').update({ setting_type: 'city_Madhya Pradesh' }).eq('setting_value', 'Indore');
  await supabase.from('crm_settings').update({ setting_type: 'city_Madhya Pradesh' }).eq('setting_value', 'Bhopal');
  
  // 2. Add some other major cities for Gujarat
  const gujaratCities = ['Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh'];
  for (const city of gujaratCities) {
    await supabase.from('crm_settings').upsert({ setting_type: 'city_Gujarat', setting_value: city }, { onConflict: 'setting_type, setting_value', ignoreDuplicates: true });
  }

  // 3. Add towns for Ahmedabad
  const ahmedabadTowns = ['Bopal', 'Vastrapur', 'Satellite', 'Navrangpura', 'Thaltej', 'Maninagar', 'Prahlad Nagar'];
  for (const town of ahmedabadTowns) {
    await supabase.from('crm_settings').upsert({ setting_type: 'town_Ahmedabad', setting_value: town }, { onConflict: 'setting_type, setting_value', ignoreDuplicates: true });
  }

  // 4. Add towns for Surat
  const suratTowns = ['Adajan', 'Vesu', 'Piplod', 'Varachha', 'Katargam', 'Udhna', 'Athwalines'];
  for (const town of suratTowns) {
    await supabase.from('crm_settings').upsert({ setting_type: 'town_Surat', setting_value: town }, { onConflict: 'setting_type, setting_value', ignoreDuplicates: true });
  }

  console.log('Migration complete!');
}

migrate();
