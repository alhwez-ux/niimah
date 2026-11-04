export function normalizeDigits(value) {
  let digits = String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/\D/g, '');

  if (digits.length === 9 && digits.startsWith('5')) {
    digits = `0${digits}`;
  }

  return digits.slice(0, 10);
}

export function isSaudiMobile(value) {
  return /^05\d{8}$/.test(value);
}
