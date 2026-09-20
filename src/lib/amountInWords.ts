/**
 * Indian amount-in-words utility (Phase 3a)
 *
 * Converts an integer paise amount to Indian-English words.
 * Handles:
 *   - Crore, Lakh, Thousand, Hundred system
 *   - Paise fraction
 *   - Up to 99,99,99,999 Rupees (practically unlimited for school fees)
 *
 * Usage:
 *   amountInWords(100000)  → "One Thousand Rupees Only"
 *   amountInWords(150)     → "One Rupee and Fifty Paise Only"
 *   amountInWords(10005000000) → "One Crore Five Thousand Rupees Only"
 */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty",
  "Sixty", "Seventy", "Eighty", "Ninety",
];

function wordsUnder100(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return TENS[tens] + (ones > 0 ? " " + ONES[ones] : "");
}

function wordsUnder1000(n: number): string {
  if (n === 0) return "";
  if (n < 100) return wordsUnder100(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return ONES[hundreds] + " Hundred" + (rest > 0 ? " " + wordsUnder100(rest) : "");
}

/**
 * Converts an integer number of paise to Indian-English words.
 * @param totalPaise - Integer paise amount (must be >= 0)
 */
export function amountInWords(totalPaise: number): string {
  if (!Number.isInteger(totalPaise) || totalPaise < 0) {
    throw new Error(`amountInWords: invalid paise value: ${totalPaise}`);
  }
  if (totalPaise === 0) return "Zero Rupees Only";

  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;

  const parts: string[] = [];

  if (rupees > 0) {
    const rupeesWords = rupeesToWords(rupees);
    parts.push(rupeesWords + (rupees === 1 ? " Rupee" : " Rupees"));
  }

  if (paise > 0) {
    const paiseWords = wordsUnder100(paise);
    parts.push(paiseWords + (paise === 1 ? " Paisa" : " Paise"));
  }

  return parts.join(" and ") + " Only";
}

function rupeesToWords(n: number): string {
  if (n === 0) return "";

  const crore = Math.floor(n / 10_000_000);
  const lakh  = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1_000);
  const rest  = n % 1_000;

  const segments: string[] = [];

  if (crore > 0) segments.push(wordsUnder1000(crore) + " Crore");
  if (lakh > 0)  segments.push(wordsUnder100(lakh) + " Lakh");
  if (thousand > 0) segments.push(wordsUnder1000(thousand) + " Thousand");
  if (rest > 0)  segments.push(wordsUnder1000(rest));

  return segments.join(" ");
}

/**
 * Format paise as ₹ rupee string for display.
 * e.g. 50000 → "₹500.00"
 */
export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return "₹" + rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format paise as Indian number string (no decimal if no paise).
 * e.g. 50000 → "₹500", 50050 → "₹500.50"
 */
export function formatPaiseCompact(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const p = paise % 100;
  const rupeePart = rupees.toLocaleString("en-IN");
  if (p === 0) return "₹" + rupeePart;
  return "₹" + rupeePart + "." + p.toString().padStart(2, "0");
}

