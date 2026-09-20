/**
 * test-amount-in-words.ts — 30+ test values for Indian amount-in-words
 * Run: npx tsx tests/test-amount-in-words.ts
 */

// Node 24 has native crypto — no polyfill needed.
const store: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() { return Object.keys(store).length; },
  clear: () => { for (const k in store) delete store[k]; },
};

let passed = 0; let failed = 0;
function expect(desc: string, got: string, want: string) {
  if (got === want) { console.log(`  ✓ ${desc}`); passed++; }
  else { console.error(`  ✗ ${desc}\n      got : "${got}"\n      want: "${want}"`); failed++; }
}

async function main() {
  console.log("=".repeat(60));
  console.log("Amount-in-words tests (30+ values)");
  console.log("=".repeat(60));

  const { amountInWords } = await import("../src/lib/amountInWords");

  const cases: [number, string][] = [
    // Zero / paise only
    [0,         "Zero Rupees Only"],
    [1,         "One Paisa Only"],
    [50,        "Fifty Paise Only"],
    [99,        "Ninety Nine Paise Only"],
    [100,       "One Rupee Only"],
    [101,       "One Rupee and One Paisa Only"],
    [150,       "One Rupee and Fifty Paise Only"],
    [199,       "One Rupee and Ninety Nine Paise Only"],

    // Rupees only (no paise)
    [200,       "Two Rupees Only"],
    [1000,      "Ten Rupees Only"],
    [1900,      "Nineteen Rupees Only"],
    [2000,      "Twenty Rupees Only"],
    [5000,      "Fifty Rupees Only"],
    [10000,     "One Hundred Rupees Only"],
    [50000,     "Five Hundred Rupees Only"],
    [100000,    "One Thousand Rupees Only"],
    [500000,    "Five Thousand Rupees Only"],
    [999900,    "Nine Thousand Nine Hundred Ninety Nine Rupees Only"],
    [1000000,   "Ten Thousand Rupees Only"],
    [10000000,  "One Lakh Rupees Only"],
    [50000000,  "Five Lakh Rupees Only"],
    [100000000, "Ten Lakh Rupees Only"],
    [1000000000,"One Crore Rupees Only"],
    [5000000000,"Five Crore Rupees Only"],

    // The spec example: Rs 1,00,05,000 = 100050000 rupees = 10005000000 paise
    [10005000000, "Ten Crore Fifty Thousand Rupees Only"],

    // Mixed rupees + paise
    [100050,    "One Thousand Rupees and Fifty Paise Only"],
    [123456789, "Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees and Eighty Nine Paise Only"],
    [2500099,   "Twenty Five Thousand Rupees and Ninety Nine Paise Only"],
    [11900,     "One Hundred Nineteen Rupees Only"],
    [9090909,   "Ninety Thousand Nine Hundred Nine Rupees and Nine Paise Only"],
    [19191919,  "One Lakh Ninety One Thousand Nine Hundred Nineteen Rupees and Nineteen Paise Only"],

    // Edge numbers
    [1100,      "Eleven Rupees Only"],
    [1200,      "Twelve Rupees Only"],
    [1300,      "Thirteen Rupees Only"],
    [1900,      "Nineteen Rupees Only"],
    [2100,      "Twenty One Rupees Only"],
    [9900,      "Ninety Nine Rupees Only"],
    [10100,     "One Hundred One Rupees Only"],
  ];

  for (const [paise, expected] of cases) {
    try {
      const got = amountInWords(paise);
      expect(`${paise} paise`, got, expected);
    } catch (e: any) {
      console.error(`  ✗ ${paise} paise threw: ${e.message}`);
      failed++;
    }
  }

  // Error cases
  console.log("\n[Error cases]");
  try {
    amountInWords(-1);
    console.error("  ✗ Should throw for negative"); failed++;
  } catch { console.log("  ✓ Throws for negative"); passed++; }

  try {
    amountInWords(1.5);
    console.error("  ✗ Should throw for non-integer"); failed++;
  } catch { console.log("  ✓ Throws for non-integer"); passed++; }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
