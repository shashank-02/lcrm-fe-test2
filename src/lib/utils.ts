import { clsx, type ClassValue } from 'clsx';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export const cn = (...i: ClassValue[]) => clsx(i);
export const DASH = '—';

/** Display format from the spec: YYYY-MM-DD HH:MM AM/PM */
export const fmtDateTime = (v?: string | Date | null) => (v ? dayjs(v).format('YYYY-MM-DD hh:mm A') : DASH);
export const fmtDate = (v?: string | Date | null) => (v ? dayjs(v).format('YYYY-MM-DD') : DASH);
export const fmtRelative = (v?: string | Date | null) => (v ? dayjs(v).fromNow() : DASH);
export const toInputDateTime = (v?: string | Date | null) => (v ? dayjs(v).format('YYYY-MM-DDTHH:mm') : '');
export const toInputDate = (v?: string | Date | null) => (v ? dayjs(v).format('YYYY-MM-DD') : '');
export const isOverdue = (v?: string | null) => !!v && dayjs(v).isBefore(dayjs(), 'day');
export const isToday = (v?: string | null) => !!v && dayjs(v).isSame(dayjs(), 'day');

export const fmtCurrency = (n: unknown, currency = 'INR') => (n === null || n === undefined || n === '' ? DASH : new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(n)));
export const fmtNumber = (n: unknown) => (n === null || n === undefined || n === '' ? DASH : new Intl.NumberFormat('en-IN').format(Number(n)));
export const fmtBytes = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`);
export const initials = (name?: string) => (name ?? '?').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
export const orDash = (v: unknown) => (v === null || v === undefined || v === '' ? DASH : String(v));
export const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Stable readable text colour for a hex background. */
export function onColor(hex?: string) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return '#fff';
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? '#14213D' : '#fff';
}
export const ROLE_LABEL: Record<string, string> = { admin: 'Admin', branch_manager: 'Branch Manager', team_lead: 'Team Lead', agent: 'Calling Agent' };
