/**
 * Finnish national reference number (viitenumero).
 *
 * Banks validate this with the 7-3-1 check digit:
 * multiply the base digits from right to left by 7, 3, 1, 7, 3, 1…
 * then check digit = (10 - (sum mod 10)) mod 10.
 *
 * Example: base 123456 → weighted sum 89 → check digit 1 → 1234561.
 */

/** Check digit for a base that contains digits only. */
export function finnishReferenceCheckDigit(baseDigits: string): number {
  const weights = [7, 3, 1];
  let sum = 0;

  for (let index = 0; index < baseDigits.length; index += 1) {
    const digit = Number(baseDigits[baseDigits.length - 1 - index]);
    sum += digit * weights[index % 3];
  }

  return (10 - (sum % 10)) % 10;
}

/** Base digits plus the check digit. No spaces. */
export function finnishReference(baseDigits: string): string {
  return `${baseDigits}${finnishReferenceCheckDigit(baseDigits)}`;
}

/**
 * True when `value` is 4–20 digits and the last digit is the correct
 * 7-3-1 check digit. Spaces are ignored so "123 45672" is accepted.
 */
export function isValidFinnishReference(value: string): boolean {
  const digits = value.replace(/\s/g, "");
  if (!/^\d{4,20}$/.test(digits)) {
    return false;
  }

  const base = digits.slice(0, -1);
  return finnishReference(base) === digits;
}

/** Groups of five from the right, which is how a viite is printed. */
export function formatReferenceNumber(value: string): string {
  const digits = value.replace(/\s/g, "");
  const groups: string[] = [];

  for (let index = digits.length; index > 0; index -= 5) {
    groups.unshift(digits.slice(Math.max(0, index - 5), index));
  }

  return groups.join(" ");
}
