import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2, X, Check } from 'lucide-react';
import { cn, initials, onColor } from '@/lib/utils';

// ---------- Button ----------
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'navy';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: 'sm' | 'md' | 'icon'; loading?: boolean }
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ variant = 'secondary', size = 'md', loading, className, children, disabled, ...rest }, ref) => (
  <button ref={ref} disabled={disabled || loading} className={cn(
    'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors whitespace-nowrap disabled:opacity-55 disabled:cursor-not-allowed',
    size === 'sm' ? 'h-8 px-2.5 text-[13px]' : size === 'icon' ? 'h-8 w-8' : 'h-9 px-3.5 text-[13.5px]',
    variant === 'primary' && 'bg-primary text-white hover:bg-primary-hover',
    variant === 'secondary' && 'bg-surface border border-line text-ink hover:bg-surface-2',
    variant === 'ghost' && 'text-ink-2 hover:bg-surface-2 hover:text-ink',
    variant === 'danger' && 'bg-danger text-white hover:opacity-90',
    variant === 'navy' && 'bg-navy text-white hover:opacity-90',
    className)} {...rest}>
    {loading ? <Loader2 size={15} className="animate-spin" /> : null}{children}
  </button>
));
Button.displayName = 'Button';

// ---------- Inputs ----------
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { sm?: boolean }>(({ className, sm, ...rest }, ref) => <input ref={ref} className={cn('input', sm && 'input-sm', className)} {...rest} />);
Input.displayName = 'Input';
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...rest }, ref) => <textarea ref={ref} className={cn('input h-auto min-h-[84px] py-2 resize-y', className)} {...rest} />);
Textarea.displayName = 'Textarea';
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { sm?: boolean }>(({ className, sm, children, ...rest }, ref) => (
  <div className="relative">
    <select ref={ref} className={cn('input appearance-none pr-8 cursor-pointer', sm && 'input-sm', className)} {...rest}>{children}</select>
    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
  </div>
));
Select.displayName = 'Select';

export function Field({ label, error, hint, required, children, className }: { label?: string; error?: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}{required && <span className="text-danger ml-0.5">*</span>}</label>}
      {children}
      {error ? <p className="mt-1 text-[12px] text-danger">{error}</p> : hint ? <p className="mt-1 text-[12px] text-ink-3">{hint}</p> : null}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, disabled, indeterminate, className }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean; indeterminate?: boolean; className?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label className={cn('inline-flex items-center gap-2 cursor-pointer select-none text-[13px]', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <span className="relative inline-flex">
        <input ref={ref} type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className={cn('h-[18px] w-[18px] rounded-[4px] border-[1.5px] border-ink-2 bg-surface flex items-center justify-center transition-colors shadow-[inset_0_0_0_1px_rgba(255,255,255,.6)] dark:shadow-none peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--ring)]', (checked || indeterminate) && 'bg-primary border-primary shadow-none')}>
          {indeterminate ? <span className="h-[2px] w-2.5 bg-white rounded" /> : checked ? <Check size={13} strokeWidth={3.5} className="text-white" aria-hidden /> : null}
        </span>
      </span>
      {label}
    </label>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn('inline-flex items-center gap-2 cursor-pointer select-none text-[13px]', disabled && 'opacity-50')}>
      <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className={cn('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-ink-3/50')}>
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </button>
      {label}
    </label>
  );
}

// ---------- Badge / Avatar ----------
export function Badge({ color, children, className, soft }: { color?: string; children: ReactNode; className?: string; soft?: boolean }) {
  const style = color ? (soft ? { backgroundColor: `${color}22`, color, borderColor: `${color}55` } : { backgroundColor: color, color: onColor(color), borderColor: color }) : undefined;
  return <span style={style} className={cn('inline-flex items-center h-[22px] px-2 rounded-md border text-[12px] font-medium whitespace-nowrap', !color && 'bg-surface-2 text-ink-2 border-line', className)}>{children}</span>;
}
export function Avatar({ name, color, size = 28, className, src }: { name?: string; color?: string; size?: number; className?: string; src?: string | null }) {
  if (src) return <img src={src} alt={name ?? ''} title={name} width={size} height={size} style={{ width: size, height: size }} className={cn('rounded-full object-cover shrink-0 bg-surface-2', className)} />;
  return <span title={name} style={{ width: size, height: size, backgroundColor: color || 'var(--navy)', fontSize: Math.max(10, size * 0.38) }} className={cn('inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0', className)}>{initials(name)}</span>;
}

// ---------- Spinner / Empty ----------
export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn('animate-spin text-ink-3', className)} size={18} />;
export function Empty({ title, hint, action, icon }: { title: string; hint?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {icon && <div className="text-ink-3 mb-3">{icon}</div>}
      <p className="text-[15px] font-medium">{title}</p>
      {hint && <p className="text-[13px] text-ink-3 mt-1 max-w-sm">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg', description }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-[#14213D]/45 dark:bg-black/60" onClick={onClose} />
      <div className={cn('relative card shadow-pop w-full my-auto', width)}>
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-line">
          <div><h2 className="text-[16px] font-semibold leading-6">{title}</h2>{description && <p className="text-[13px] text-ink-3 mt-0.5">{description}</p>}</div>
          <button onClick={onClose} className="text-ink-3 hover:text-ink -mr-1 p-1 rounded" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto scroll-thin">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line flex justify-end gap-2 bg-surface-2/60 rounded-b-lg">{footer}</div>}
      </div>
    </div>, document.body);
}

export function Confirm({ open, onClose, onConfirm, title, body, confirmLabel = 'Confirm', danger, loading }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body?: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md" footer={<><Button onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button></>}>
      <div className="text-[13.5px] text-ink-2">{body}</div>
    </Modal>
  );
}

// ---------- Menu (dropdown) ----------
export function Menu({ trigger, children, align = 'left', className }: { trigger: (open: boolean) => ReactNode; children: ReactNode | ((close: () => void) => ReactNode); align?: 'left' | 'right'; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const close = () => setOpen(false);
  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      {open && <div className={cn('menu', align === 'right' && 'right-0')}>{typeof children === 'function' ? children(close) : children}</div>}
    </div>
  );
}

// ---------- Tabs ----------
export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { key: T; label: ReactNode; count?: number }[]; value: T; onChange: (k: T) => void; className?: string }) {
  return (
    <div className={cn('flex gap-1 border-b border-line overflow-x-auto scroll-hidden', className)} role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)} className={cn('relative px-3 h-9 text-[13.5px] whitespace-nowrap transition-colors -mb-px border-b-2', value === t.key ? 'text-primary border-primary font-medium' : 'text-ink-2 border-transparent hover:text-ink')}>
          {t.label}{t.count !== undefined && <span className={cn('ml-1.5 text-[11.5px] px-1.5 rounded-md', value === t.key ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-ink-3')}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------- Page header ----------
export function PageHeader({ title, subtitle, actions, crumbs }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; crumbs?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>{crumbs && <div className="text-[12.5px] text-ink-3 mb-1">{crumbs}</div>}<h1 className="text-[20px] font-semibold leading-7">{title}</h1>{subtitle && <p className="text-[13px] text-ink-3 mt-0.5">{subtitle}</p>}</div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

// ---------- Pagination ----------
export function Pagination({ page, totalPages, total, limit, onPage, onLimit, sizes = [25, 100] }: { page: number; totalPages: number; total: number; limit: number; onPage: (p: number) => void; onLimit: (l: number) => void; sizes?: number[] }) {
  const from = total ? (page - 1) * limit + 1 : 0, to = Math.min(total, page * limit);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-ink-2">
      <div className="flex items-center gap-2">Rows per page
        <select value={limit} onChange={(e) => onLimit(Number(e.target.value))} className="input input-sm w-auto pr-6">{sizes.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <span className="text-ink-3">{from}–{to} of {total}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <span className="px-2">Page {page} of {Math.max(1, totalPages)}</span>
        <Button size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

/** Pill-style select used in list filters. */
export function PillSelect({ label, value, onChange, options, sm }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; sm?: boolean }) {
  return (
    <label className={cn('pill pl-2 pr-1 cursor-pointer', value && 'border-primary text-primary bg-primary-soft')}>
      <span className="text-ink-3">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cn('bg-transparent border-0 outline-none cursor-pointer text-ink max-w-[140px]', sm && 'text-[12.5px]')}>
        <option value="">All</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

// ---------- Drawer (right-side panel) ----------
export function Drawer({ open, onClose, title, description, children, footer, width = 'max-w-xl' }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-[#14213D]/45 dark:bg-black/60" onClick={onClose} />
      <div className={cn('relative h-full w-full bg-surface border-l border-line shadow-pop flex flex-col', width)}>
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-line">
          <div><h2 className="text-[17px] font-semibold leading-6">{title}</h2>{description && <p className="text-[13px] text-ink-3 mt-0.5">{description}</p>}</div>
          <button onClick={onClose} className="text-ink-3 hover:text-ink -mr-1 p-1 rounded" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line flex justify-end gap-2 bg-surface-2/60">{footer}</div>}
      </div>
    </div>, document.body);
}
