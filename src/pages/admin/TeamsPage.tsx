import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { Avatar, Badge, Button, Confirm, Empty, Field, Input, Modal, Select, Spinner, Textarea } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { ROLE_LABEL } from '@/lib/utils';
import { useInvalidateBootstrap } from '@/store/bootstrap';
import type { PermissionTemplate, Team, User } from '@/types';

export default function TeamsPage() {
  const invBoot = useInvalidateBootstrap();
  const q = useQuery({ queryKey: ['teams'], queryFn: async () => (await api.get<{ data: Team[] }>('/teams?includeInactive=true')).data.data });
  const users = useQuery({ queryKey: ['users-all'], queryFn: async () => (await api.get<{ data: User[] }>('/users?limit=200')).data.data });
  const [editing, setEditing] = useState<Team | null | 'new'>(null); const [open, setOpen] = useState<Team | null>(null); const [del, setDel] = useState<Team | null>(null);
  const done = () => { q.refetch(); users.refetch(); invBoot(); };
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/teams/${id}`), onSuccess: () => { toast.success('Team deleted'); setDel(null); done(); }, onError: (e) => toast.error(errorMessage(e)) });
  const managers = (users.data ?? []).filter((u) => u.role === 'branch_manager' || u.role === 'admin'); const tls = (users.data ?? []).filter((u) => u.role === 'team_lead');
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3"><div><h2 className="text-[16px] font-semibold">Teams</h2><p className="text-[13px] text-ink-3 mt-0.5">A team has one manager and one team lead. Managers see every lead in the teams they manage; team leads see their own team.</p></div><Button variant="primary" size="sm" onClick={() => setEditing('new')}><Plus size={14} /> New team</Button></div>
      {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty title="No teams yet" hint="Create a team, then add agents to it from Users or here." action={<Button variant="primary" size="sm" onClick={() => setEditing('new')}>Create team</Button>} /> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{q.data.map((t) => (
          <div key={t.id} className={`card p-4 ${t.isActive ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold text-[15px]">{t.name}</h3>{t.description && <p className="text-[12.5px] text-ink-3 mt-0.5">{t.description}</p>}</div><span className="flex"><Button size="icon" variant="ghost" onClick={() => setEditing(t)}><Pencil size={14} /></Button><Button size="icon" variant="ghost" className="text-ink-3 hover:text-danger" onClick={() => setDel(t)}><Trash2 size={14} /></Button></span></div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]"><div><dt className="text-ink-3 text-[12px]">Manager</dt><dd>{users.data?.find((u) => u.id === t.managerId)?.name ?? '—'}</dd></div><div><dt className="text-ink-3 text-[12px]">Team lead</dt><dd>{users.data?.find((u) => u.id === t.teamLeadId)?.name ?? '—'}</dd></div><div><dt className="text-ink-3 text-[12px]">Members</dt><dd className="tabular-nums">{t.memberCount ?? 0}</dd></div><div><dt className="text-ink-3 text-[12px]">Leads</dt><dd className="tabular-nums">{t.leadCount ?? 0}</dd></div></dl>
            <Button size="sm" className="mt-3 w-full" onClick={() => setOpen(t)}><UserPlus size={14} /> Manage members</Button>
          </div>))}</div>)}
      <TeamModal team={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} onSaved={done} managers={managers} tls={tls} />
      <MembersModal team={open} onClose={() => setOpen(null)} users={users.data ?? []} onChanged={done} />
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del.id)} loading={remove.isPending} danger title={`Delete team "${del?.name}"?`} body="Only empty teams (no members, no leads) can be deleted. Otherwise deactivate it." confirmLabel="Delete" />
    </div>
  );
}

function TeamModal({ team, open, onClose, onSaved, managers, tls }: { team: Team | null; open: boolean; onClose: () => void; onSaved: () => void; managers: User[]; tls: User[] }) {
  const [v, setV] = useState({ name: '', description: '', managerId: '', teamLeadId: '', permissionTemplateId: '', isActive: true });
  const tpls = useQuery({ queryKey: ['permission-templates'], queryFn: async () => (await api.get<{ data: PermissionTemplate[] }>('/permission-templates')).data.data, enabled: open });
  useEffect(() => { if (open) setV({ name: team?.name ?? '', description: team?.description ?? '', managerId: team?.managerId ?? '', teamLeadId: team?.teamLeadId ?? '', permissionTemplateId: team?.permissionTemplateId ?? '', isActive: team?.isActive ?? true }); }, [open, team]);
  const save = useMutation({ mutationFn: () => { const body = { ...v, managerId: v.managerId || null, teamLeadId: v.teamLeadId || null, permissionTemplateId: v.permissionTemplateId || null }; return team ? api.patch(`/teams/${team.id}`, body) : api.post('/teams', body); }, onSuccess: () => { toast.success(team ? 'Team updated' : 'Team created'); onSaved(); onClose(); }, onError: (e) => toast.error(errorMessage(e)) });
  return (
    <Modal open={open} onClose={onClose} title={team ? `Edit ${team.name}` : 'New team'} width="max-w-md" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>{team ? 'Save' : 'Create'}</Button></>}>
      <div className="space-y-3">
        <Field label="Team name" required><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoFocus placeholder="e.g. Bengaluru — Personal Loans" /></Field>
        <Field label="Description"><Textarea value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} className="min-h-[56px]" /></Field>
        <Field label="Branch manager"><Select value={v.managerId} onChange={(e) => setV({ ...v, managerId: e.target.value })}><option value="">—</option>{managers.map((u) => <option key={u.id} value={u.id}>{u.name} ({ROLE_LABEL[u.role ?? '']})</option>)}</Select></Field>
        <Field label="Team lead" hint="Only users with the Team Lead role"><Select value={v.teamLeadId} onChange={(e) => setV({ ...v, teamLeadId: e.target.value })}><option value="">—</option>{tls.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
        <Field label="Team permission template" hint="Applied to members who have no personal template (matched by role)"><Select value={v.permissionTemplateId} onChange={(e) => setV({ ...v, permissionTemplateId: e.target.value })}><option value="">Role defaults</option>{(tpls.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name} · {t.role}</option>)}</Select></Field>
        {team && <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={v.isActive} onChange={(e) => setV({ ...v, isActive: e.target.checked })} /> Active</label>}
      </div>
    </Modal>
  );
}

function MembersModal({ team, onClose, users, onChanged }: { team: Team | null; onClose: () => void; users: User[]; onChanged: () => void }) {
  const [adding, setAdding] = useState('');
  const detail = useQuery({ queryKey: ['team', team?.id], queryFn: async () => (await api.get<{ data: Team }>(`/teams/${team!.id}`)).data.data, enabled: !!team });
  const add = useMutation({ mutationFn: (userId: string) => api.post(`/teams/${team!.id}/members`, { userIds: [userId] }), onSuccess: () => { setAdding(''); detail.refetch(); onChanged(); }, onError: (e) => toast.error(errorMessage(e)) });
  const rem = useMutation({ mutationFn: (userId: string) => api.delete(`/teams/${team!.id}/members/${userId}`), onSuccess: () => { detail.refetch(); onChanged(); }, onError: (e) => toast.error(errorMessage(e)) });
  if (!team) return null;
  const memberIds = new Set((detail.data?.members ?? []).map((m) => m.id));
  const candidates = users.filter((u) => !memberIds.has(u.id) && (u.role === 'agent' || u.role === 'team_lead') && u.isActive);
  return (
    <Modal open onClose={onClose} title={`${team.name} · members`} width="max-w-md" footer={<Button onClick={onClose}>Done</Button>}>
      <div className="flex gap-2 mb-3"><Select value={adding} onChange={(e) => setAdding(e.target.value)}><option value="">Add a member…</option>{candidates.map((u) => <option key={u.id} value={u.id}>{u.name} · {ROLE_LABEL[u.role ?? '']}{u.teamId && u.teamId !== team.id ? ' (moves from another team)' : ''}</option>)}</Select><Button variant="primary" disabled={!adding} loading={add.isPending} onClick={() => add.mutate(adding)}>Add</Button></div>
      {detail.isLoading ? <Spinner /> : !detail.data?.members?.length ? <p className="text-[13px] text-ink-3">No members yet.</p> : <ul className="divide-y divide-line card">{detail.data.members.map((m) => <li key={m.id} className="flex items-center gap-2.5 px-3 py-2"><Avatar name={m.name} color={m.avatarColor} size={26} /><span className="flex-1 min-w-0"><span className="block text-[13.5px] font-medium">{m.name}</span><span className="block text-[12px] text-ink-3">{m.email}</span></span><Badge>{ROLE_LABEL[m.role ?? '']}</Badge><Button size="icon" variant="ghost" className="text-ink-3 hover:text-danger" title="Remove from team" onClick={() => rem.mutate(m.id)}><X size={14} /></Button></li>)}</ul>}
      <p className="text-[12px] text-ink-3 mt-3">Moving a member also moves their leads' team for correct visibility. Members with open leads must be reassigned before removal.</p>
    </Modal>
  );
}
