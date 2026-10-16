import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
const schoolId = 'b70261ef-37f1-46c8-a148-2c496a9d33a8';

async function audit() {
  console.log('--- AUDITING SUPABASE FOR INVOICES ---');
  const { data: years, error: yErr } = await supabase.from('academic_years').select('*').eq('school_id', schoolId);
  console.log('Academic Years:', years, yErr);

  const { data: terms, error: tErr } = await supabase.from('fee_terms').select('*').eq('school_id', schoolId);
  console.log('Fee Terms count:', terms?.length, terms?.map(t => ({ id: t.id, name: t.name, due_date: t.due_date, ay: t.academic_year_id })));

  const { count: duesCount, data: dues, error: dErr } = await supabase.from('student_dues').select('*', { count: 'exact' }).eq('school_id', schoolId).limit(5);
  console.log('Total Dues in DB:', duesCount, dErr);
  console.log('Sample Dues:', dues);

  const { count: receiptsCount, data: receipts } = await supabase.from('fee_receipts').select('*', { count: 'exact' }).eq('school_id', schoolId).limit(5);
  console.log('Total Receipts in DB:', receiptsCount, receipts);

  const { data: enrollments } = await supabase.from('student_enrollments').select('id, student_id, class_id, section_id, academic_year_id, status').eq('school_id', schoolId);
  console.log('Total Enrollments:', enrollments?.length);

  const { data: classes } = await supabase.from('classes').select('id, name').eq('school_id', schoolId);
  console.log('Classes:', classes);
}

audit().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
