import { useState, type ReactNode } from 'react';

type Props = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  disabled?: boolean;
};

export function NumberField({ label, value, onChange, step = 0.01, min, max, unit, disabled }: Props) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="field-input">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            if (Number.isFinite(n)) onChange(n);
          }}
        />
        {unit ? <em>{unit}</em> : null}
      </span>
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}

export function Section({
  title,
  children,
  actions,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const shown = !collapsible || open;
  return (
    <section className="panel-section">
      <header>
        {collapsible ? (
          <button type="button" className="section-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <span className="chevron" aria-hidden>
              {open ? '▾' : '▸'}
            </span>
            <h2>{title}</h2>
          </button>
        ) : (
          <h2>{title}</h2>
        )}
        {shown ? actions : null}
      </header>
      {shown ? children : null}
    </section>
  );
}
