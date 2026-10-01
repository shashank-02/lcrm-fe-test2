import { Input, Select, Textarea, Toggle } from '@/components/ui';
import { fmtCurrency, fmtDate, fmtDateTime, fmtNumber, orDash, toInputDate, toInputDateTime } from '@/lib/utils';
import type { FieldDef } from '@/types';

/** Input for a custom field, driven entirely by the admin's FieldDefinition. */
export function DynamicInput({ def, value, onChange, sm }: { def: FieldDef; value: unknown; onChange: (v: unknown) => void; sm?: boolean }) {
  const v = value ?? '';
  switch (def.type) {
    case 'textarea': return <Textarea value={String(v)} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case 'number': case 'currency': case 'percent': return <Input sm={sm} type="number" step="any" inputMode="decimal" value={v === null ? '' : String(v)} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />;
    case 'date': return <Input sm={sm} type="date" value={toInputDate(v as string)} onChange={(e) => onChange(e.target.value || null)} />;
    case 'datetime': return <Input sm={sm} type="datetime-local" value={toInputDateTime(v as string)} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} />;
    case 'select': return <Select sm={sm} value={String(v)} onChange={(e) => onChange(e.target.value || null)}><option value="">{def.placeholder || 'Select…'}</option>{def.options.map((o) => <option key={o} value={o}>{o}</option>)}</Select>;
    case 'multiselect': {
      const arr = Array.isArray(v) ? (v as string[]) : [];
      return <div className="flex flex-wrap gap-1.5 pt-1">{def.options.map((o) => { const on = arr.includes(o); return <button type="button" key={o} onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])} className={`pill ${on ? 'border-primary text-primary bg-primary-soft' : ''}`}>{o}</button>; })}</div>;
    }
    case 'boolean': return <div className="pt-1.5"><Toggle checked={!!v} onChange={onChange} label={v ? 'Yes' : 'No'} /></div>;
    case 'phone': return <Input sm={sm} type="tel" inputMode="tel" value={String(v)} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case 'email': return <Input sm={sm} type="email" value={String(v)} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case 'url': return <Input sm={sm} type="url" value={String(v)} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />;
    default: return <Input sm={sm} value={String(v)} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
}

/** Read-only rendering of a custom field value. */
export function fieldValue(def: FieldDef | undefined, value: unknown, currency = 'INR'): string {
  if (value === null || value === undefined || value === '') return '—';
  switch (def?.type) {
    case 'currency': return fmtCurrency(value, currency);
    case 'percent': return `${fmtNumber(value)}%`;
    case 'number': return fmtNumber(value);
    case 'date': return fmtDate(value as string);
    case 'datetime': return fmtDateTime(value as string);
    case 'boolean': return value ? 'Yes' : 'No';
    case 'multiselect': return Array.isArray(value) ? (value as string[]).join(', ') || '—' : String(value);
    default: return orDash(value);
  }
}
