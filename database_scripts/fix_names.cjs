const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://inxxlsfnhvriwogxocmz.supabase.co', 'sb_publishable_Cixyl5fSlKJWA2jNPjJuhA_hHbwM15x');

async function fixNames() {
  console.log('Fetching contacts...');
  const { data, error } = await supabase.from('contacts').select('*');
  if (error) { console.error(error); return; }
  
  let count = 0;
  for (const contact of data) {
    if (contact.person_name && contact.person_name.startsWith('UU-') && contact.person_name.length < 9) {
      const uniqueId = Math.floor(10000 + Math.random() * 90000);
      const newPerson = `UU-${uniqueId}`;
      const newBusiness = (contact.business_name && contact.business_name.startsWith('UB-')) ? `UB-${uniqueId}` : contact.business_name;
      
      const { error: upErr } = await supabase.from('contacts').update({ person_name: newPerson, business_name: newBusiness }).eq('id', contact.id);
      if (upErr) {
        console.error('Failed to update', contact.id, upErr);
      } else {
        console.log(`Updated ${contact.person_name} -> ${newPerson}`);
        count++;
      }
    }
  }
  console.log(`Successfully fixed ${count} records.`);
}

fixNames();
