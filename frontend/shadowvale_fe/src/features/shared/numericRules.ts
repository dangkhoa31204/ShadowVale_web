export interface NumericRules {
  min?: number;
  max?: number;
  step?: number;
  nullable?: boolean;
  sliderMin?: number;
  sliderMax?: number;
}

export type NumericInputResult = { valid: true; value: number | null } | { valid: false; error: string };

export function numericPrecision(step = 1): number {
  const [fraction, exponent = '0'] = step.toString().toLowerCase().split('e');
  return Math.max(0, (fraction.split('.')[1]?.length ?? 0) - Number(exponent));
}

export function parseNumericInput(text: string, rules: NumericRules): NumericInputResult {
  if (!text.trim()) return rules.nullable ? { valid: true, value: null } : { valid: false, error: 'Enter a value.' };
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text.trim())) return { valid: false, error: 'Enter a valid number.' };
  const value = Number(text);
  if (!Number.isFinite(value)) return { valid: false, error: 'Enter a finite number.' };
  if (rules.min !== undefined && value < rules.min) return { valid: false, error: `Minimum ${rules.min}.` };
  if (rules.max !== undefined && value > rules.max) return { valid: false, error: `Maximum ${rules.max}.` };
  const precision = numericPrecision(rules.step);
  const scaled = value * 10 ** precision;
  if (Math.abs(scaled - Math.round(scaled)) > Math.max(1e-7, Math.abs(scaled) * Number.EPSILON * 4)) {
    return { valid: false, error: precision ? `Use up to ${precision} decimal places.` : 'Use a whole number.' };
  }
  return { valid: true, value };
}

/** Practical slider limits are separate from database limits. A valid typed value expands the slider. */
export function sliderBounds(value: number | null, rules: NumericRules) {
  const step = rules.step ?? 1;
  let min = rules.sliderMin ?? rules.min ?? 0;
  let max = rules.sliderMax ?? Math.max(min + 100, 100);
  if (value !== null && Number.isFinite(value)) { min = Math.min(min, value); max = Math.max(max, value); }
  if (rules.min !== undefined) min = Math.max(min, rules.min);
  if (rules.max !== undefined) max = Math.min(max, rules.max);
  return { min, max: Math.max(min + step, max), step };
}

export function sliderValue(raw: string, step: number) {
  return Number(Number(raw).toFixed(numericPrecision(step)));
}
