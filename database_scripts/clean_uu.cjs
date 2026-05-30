const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://inxxlsfnhvriwogxocmz.supabase.co', 'sb_publishable_Cixyl5fSlKJWA2jNPjJuhA_hHbwM15x');

async function cleanUU() {
  console.log('Fetching contacts to clean up UU- strings...');
  const { data, error } = await supabase.from('contacts').select('*');
  if (error) { console.error(error); return; }
  
  let count = 0;
  for (const contact of data) {
    let updateNeeded = false;
    let newPerson = contact.person_name;
    let newBusiness = contact.business_name;
    
    if (contact.person_name && contact.person_name.startsWith('UU-')) {
      newPerson = '';
      updateNeeded = true;
    }
    if (contact.business_name && contact.business_name.startsWith('UB-')) {
      newBusiness = '';
      updateNeeded = true;
    }
    
    if (updateNeeded) {
      const { error: upErr } = await supabase.from('contacts').update({ person_name: newPerson, business_name: newBusiness }).eq('id', contact.id);
      if (upErr) {
        console.error('Failed to update', contact.id, upErr);
      } else {
        console.log(`Cleaned ${contact.id}`);
        count++;
      }
    }
  }
  console.log(`Successfully cleaned ${count} records, saving DB space!`);
}

cleanUU();
