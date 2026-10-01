import { create } from 'zustand';

type Theme = 'light' | 'dark';
const KEY = 'lead-crm-theme';
const initial = (): Theme => { try { const t = localStorage.getItem(KEY) as Theme | null; if (t) return t; } catch { /* ignore */ } return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; };
const apply = (t: Theme) => { document.documentElement.classList.toggle('dark', t === 'dark'); try { localStorage.setItem(KEY, t); } catch { /* ignore */ } };

export const useTheme = create<{ theme: Theme; toggle: () => void; set: (t: Theme) => void }>((set, get) => {
  const t = initial(); apply(t);
  return { theme: t, set: (theme) => { apply(theme); set({ theme }); }, toggle: () => { const n = get().theme === 'dark' ? 'light' : 'dark'; apply(n); set({ theme: n }); } };
});
