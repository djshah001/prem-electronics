const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const charValue = (char: string) => (char >= '0' && char <= '9' ? char.charCodeAt(0) - 48 : char.charCodeAt(0) - 55);
const valueChar = (value: number) => (value < 10 ? String(value) : String.fromCharCode(value + 55));

export const normalizeGstin = (value: string) => value.replace(/\s+/g, '').toUpperCase();

export const calculateGstinCheckDigit = (firstFourteen: string): string => {
  if (firstFourteen.length !== 14 || !/^[0-9A-Z]+$/.test(firstFourteen)) return '';
  let factor = 2;
  let sum = 0;
  for (let index = firstFourteen.length - 1; index >= 0; index -= 1) {
    const product = charValue(firstFourteen[index]) * factor;
    sum += Math.floor(product / 36) + (product % 36);
    factor = factor === 2 ? 1 : 2;
  }
  return valueChar((36 - (sum % 36)) % 36);
};

export const isValidGstin = (input: string): boolean => {
  const gstin = normalizeGstin(input);
  return GSTIN_PATTERN.test(gstin) && calculateGstinCheckDigit(gstin.slice(0, 14)) === gstin[14];
};
