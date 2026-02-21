export const INDIAN_STATES = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "25", name: "Daman & Diu" },
  { code: "26", name: "Dadra & Nagar Haveli" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh (Old)" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
] as const;

export const GST_RATES = [0, 5, 12, 18, 28] as const;

export const UNITS = [
  "Nos", "Kg", "Gm", "Ltr", "Mtr", "Cm", "Sq.Ft", "Sq.Mtr",
  "Pcs", "Box", "Bag", "Set", "Pair", "Dozen", "Quintal", "Ton",
  "Hrs", "Days", "Months",
] as const;

export function validateGSTIN(gstin: string): boolean {
  const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return pattern.test(gstin);
}

export function getStateFromGSTIN(gstin: string) {
  if (gstin.length < 2) return null;
  const code = gstin.substring(0, 2);
  return INDIAN_STATES.find(s => s.code === code) || null;
}

export function getCurrentFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(2)}`;
  }
  return `${year - 1}-${year.toString().slice(2)}`;
}

export function numberToWordsINR(num: number): string {
  if (num === 0) return "Zero Rupees Only";
  
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertGroup(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convertGroup(n % 100) : "");
  }

  const rupees = Math.floor(Math.abs(num));
  const paise = Math.round((Math.abs(num) - rupees) * 100);

  let result = "";
  if (rupees >= 10000000) {
    result += convertGroup(Math.floor(rupees / 10000000)) + " Crore ";
    const remaining = rupees % 10000000;
    if (remaining >= 100000) result += convertGroup(Math.floor(remaining / 100000)) + " Lakh ";
    const rem2 = remaining % 100000;
    if (rem2 >= 1000) result += convertGroup(Math.floor(rem2 / 1000)) + " Thousand ";
    const rem3 = rem2 % 1000;
    if (rem3 > 0) result += convertGroup(rem3);
  } else if (rupees >= 100000) {
    result += convertGroup(Math.floor(rupees / 100000)) + " Lakh ";
    const remaining = rupees % 100000;
    if (remaining >= 1000) result += convertGroup(Math.floor(remaining / 1000)) + " Thousand ";
    const rem = remaining % 1000;
    if (rem > 0) result += convertGroup(rem);
  } else if (rupees >= 1000) {
    result += convertGroup(Math.floor(rupees / 1000)) + " Thousand ";
    const rem = rupees % 1000;
    if (rem > 0) result += convertGroup(rem);
  } else {
    result = convertGroup(rupees);
  }

  result = result.trim() + " Rupees";
  if (paise > 0) {
    result += " and " + convertGroup(paise) + " Paise";
  }
  result += " Only";
  return result;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
