import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Bootstrap } from '@/types';

const EMPTY: Bootstrap = { org: null, stages: [], statuses: [], sources: [], fields: [], templates: [], directives: [], views: [], viewGroups: [], users: [], teams: [], permissionCatalogue: {}, roles: { admin: 'Admin', branch_manager: 'Branch Manager', team_lead: 'Team Lead', agent: 'Calling Agent' } };

/** Org configuration loaded once after login; refetched when admins change settings. */
export function useBootstrap() {
  const q = useQuery({ queryKey: ['bootstrap'], queryFn: async () => (await api.get<{ data: Bootstrap }>('/bootstrap')).data.data, staleTime: 5 * 60_000 });
  return { ...q, boot: q.data ?? EMPTY };
}
export function useInvalidateBootstrap() { const qc = useQueryClient(); return () => qc.invalidateQueries({ queryKey: ['bootstrap'] }); }
