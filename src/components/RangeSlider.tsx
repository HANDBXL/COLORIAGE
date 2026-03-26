import React from 'react';

interface RangeSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  unit: string;
  ariaLabel?: string;
}

export const RangeSlider: React.FC<RangeSliderProps> = React.memo(({
  label, value, onChange, min, max, unit, ariaLabel,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '65px', flexShrink: 0 }}>
      {label}
    </span>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ flex: 1 }}
      aria-label={ariaLabel || label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
    />
    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '32px', textAlign: 'right' }}>
      {value}{unit}
    </span>
  </div>
));
