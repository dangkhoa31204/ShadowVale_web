import { useTranslation } from '../preferences/preferencesContext';
import { useId, useState } from 'react';
import { parseNumericInput, sliderBounds, sliderValue, type NumericRules } from './numericRules';

interface NumericControlProps extends NumericRules {
  label: string;
  value: number | null;
  unit?: string;
  disabled?: boolean;
  serverError?: string;
  onChange: (value: number | null) => void;
  onError: (message: string) => void;
}

export function NumericControl({ label, value, unit, disabled, serverError, onChange, onError, ...rules }: NumericControlProps) {
  const t = useTranslation();
  const id = useId();
  const [edit, setEdit] = useState({ value, text: value === null ? '' : String(value), error: '' });
  if (edit.value !== value) setEdit({ value, text: value === null ? '' : String(value), error: '' });
  const range = sliderBounds(value, rules);
  function input(text: string) {
    const parsed = parseNumericInput(text, rules);
    const error = parsed.valid ? '' : parsed.error;
    setEdit({ value: parsed.valid ? parsed.value : value, text, error });
    onError(error);
    if (parsed.valid) onChange(parsed.value);
  }
  const error = edit.error || serverError;
  return <div className={'sv-numeric-control' + (error ? ' has-error' : '')}>
    <div className="sv-numeric-heading"><label htmlFor={id}>{t(label)}</label>{unit && <span>{t(unit)}</span>}</div>
    <div className="sv-numeric-inputs">
      <input className="sv-range" type="range" aria-label={t(label) + ' ' + t('slider')} min={range.min} max={range.max} step={range.step} value={value ?? range.min} disabled={disabled}
        aria-valuetext={value === null ? t('Not set') : `${value}${unit ? ' ' + t(unit) : ''}`} onChange={e => input(String(sliderValue(e.target.value, range.step)))} />
      <input id={id} className="sv-numeric-value" type="text" inputMode={range.step < 1 ? 'decimal' : 'numeric'} value={edit.text} disabled={disabled}
        aria-invalid={!!error} aria-describedby={id + '-help'} placeholder={rules.nullable ? t("Not set") : t('Value')} onChange={e => input(e.target.value)} />
    </div>
    <div id={id + '-help'} className="sv-numeric-help">{error ? <span role="alert">{error}</span> : <><span>{range.min}</span><span>{value === null ? t('Optional · not set') : range.max}</span></>}</div>
  </div>;
}
