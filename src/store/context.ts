import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Team / member viewing context chosen in the top bar. Empty = everything the user may see. */
interface ContextState { teamId: string; ownerId: string; label: string; set: (c: { teamId?: string; ownerId?: string; label: string }) => void; clear: () => void }
export const useViewContext = create<ContextState>()(persist((set) => ({
  teamId: '', ownerId: '', label: '',
  set: (c) => set({ teamId: c.teamId ?? '', ownerId: c.ownerId ?? '', label: c.label }),
  clear: () => set({ teamId: '', ownerId: '', label: '' }),
}), { name: 'lead-crm-context' }));
