const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://inxxlsfnhvriwogxocmz.supabase.co', 'sb_publishable_Cixyl5fSlKJWA2jNPjJuhA_hHbwM15x');

async function analyze() {
  const { data, error } = await supabase.from('contacts').select('*');
  if (error) { console.error(error); return; }
  
  console.log(`Total records: ${data.length}`);
  
  let nullNames = 0;
  let emptyNames = 0;
  let totalStatusBytes = 0;
  let totalCategoryBytes = 0;
  
  if (data.length > 0) {
    console.log("Sample record:", data[0]);
  }

  for (const row of data) {
    if (row.person_name === null) nullNames++;
    else if (row.person_name === '') emptyNames++;
    
    if (row.status) totalStatusBytes += row.status.length;
    if (row.category) totalCategoryBytes += row.category.length;
  }
  
  console.log(`Null person_names: ${nullNames}`);
  console.log(`Empty person_names (''): ${emptyNames}`);
  console.log(`Average status length: ${totalStatusBytes / data.length}`);
  console.log(`Average category length: ${totalCategoryBytes / data.length}`);
}

analyze();
