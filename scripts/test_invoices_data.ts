import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });


async function test() {
  const { getSchoolInvoices } = await import('../src/services/invoiceService');
  const schoolId = 'b70261ef-37f1-46c8-a148-2c496a9d33a8';
  console.log("Fetching school invoices for school:", schoolId);
  const res = await getSchoolInvoices(schoolId, {
    academic_year_id: 'a0171c28-e12c-4485-ac27-e0b010607e1f',
  });
  console.log("Error:", res.error);
  console.log("Total Count:", res.totalCount, "Total Pages:", res.totalPages, "Current Page:", res.currentPage);
  console.log("Invoices returned:", res.invoices.length);
  console.log("Metrics:", res.metrics);
  if (res.invoices.length > 0) {
    console.log("Sample Invoice 0:", JSON.stringify(res.invoices[0], null, 2));
  }
}

test();
