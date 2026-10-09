import { useId, useState } from 'react';
import { parseNumericInput, sliderBounds, sliderValue, type NumericRules } from './numericRules';

interface NumericControlProps extends NumericRules {
  label: string;
  value: number | null;
  unit?: string;
  disabled?: boolean;
  onChange: (value: number | null) => void;
  onError: (message: string) => void;
}

export function NumericControl({ label, value, unit, disabled, onChange, onError, ...rules }: NumericControlProps) {
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
  return <div className={'sv-numeric-control' + (edit.error ? ' has-error' : '')}>
    <div className="sv-numeric-heading"><label htmlFor={id}>{label}</label>{unit && <span>{unit}</span>}</div>
    <div className="sv-numeric-inputs">
      <input className="sv-range" type="range" aria-label={label + ' slider'} min={range.min} max={range.max} step={range.step} value={value ?? range.min} disabled={disabled}
        aria-valuetext={value === null ? 'Not set' : `${value}${unit ? ' ' + unit : ''}`} onChange={e => input(String(sliderValue(e.target.value, range.step)))} />
      <input id={id} className="sv-numeric-value" type="text" inputMode={range.step < 1 ? 'decimal' : 'numeric'} value={edit.text} disabled={disabled}
        aria-invalid={!!edit.error} aria-describedby={id + '-help'} placeholder={rules.nullable ? 'Not set' : 'Value'} onChange={e => input(e.target.value)} />
    </div>
    <div id={id + '-help'} className="sv-numeric-help">{edit.error ? <span role="alert">{edit.error}</span> : <><span>{range.min}</span><span>{value === null ? 'Optional · not set' : range.max}</span></>}</div>
  </div>;
}
