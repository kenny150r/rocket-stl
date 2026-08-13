import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  disabled?: boolean;
  invalid?: boolean;
};

function formatDisplay(value: number): string {
  if (!Number.isFinite(value)) return '';
  return String(value);
}

function parseDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === '' || t === '-' || t === '.' || t === '-.') return null;
  if (/[eE][+-]?$/.test(t) || t.endsWith('.')) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function NumberField({
  label,
  value,
  onChange,
  step = 0.01,
  min,
  max,
  unit,
  disabled,
  invalid,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function commit(n: number, immediate: boolean, clampNow: boolean) {
    let x = n;
    if (clampNow) {
      if (min !== undefined) x = Math.max(min, x);
      if (max !== undefined) x = Math.min(max, x);
    }
    if (immediate) {
      window.clearTimeout(timer.current);
      onChange(x);
      return;
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onChange(x), 250);
  }

  return (
    <label className={`field${invalid ? ' invalid' : ''}${disabled ? ' disabled' : ''}`}>
      <span>{label}</span>
      <span className="field-input">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={focused ? draft : formatDisplay(value)}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onFocus={() => {
            setFocused(true);
            setDraft(formatDisplay(value));
          }}
          onChange={(e) => {
            const t = e.target.value;
            setDraft(t);
            const n = parseDraft(t);
            if (n !== null) commit(n, false, false);
          }}
          onBlur={() => {
            setFocused(false);
            const n = parseDraft(draft);
            if (n !== null) commit(n, true, true);
            else window.clearTimeout(timer.current);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
              return;
            }
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
            e.preventDefault();
            const base = parseDraft(draft) ?? value;
            const dir = e.key === 'ArrowUp' ? 1 : -1;
            const next = base + dir * step;
            setDraft(formatDisplay(next));
            commit(next, true, true);
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
  invalid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  invalid?: boolean;
}) {
  return (
    <label className={`field${invalid ? ' invalid' : ''}`}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined}>
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
  badge,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  badge?: ReactNode;
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
            {badge}
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
