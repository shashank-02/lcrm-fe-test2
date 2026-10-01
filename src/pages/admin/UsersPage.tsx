import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search, UserX, UserCheck, Pencil, ShieldCheck } from 'lucide-react';
import { Avatar, Badge, Button, Empty, Field, Input, Modal, Pagination, PillSelect, Select, Spinner, Toggle } from '@/components/ui';
import { api, errorDetails, errorMessage, qs } from '@/lib/api';
import { fmtRelative, ROLE_LABEL } from '@/lib/utils';
import { useBootstrap, useInvalidateBootstrap } from '@/store/bootstrap';
import type { ApiList, PermissionTemplate, User } from '@/types';

const ROLES = ['admin', 'branch_manager', 'team_lead', 'agent'] as const;
const empty = { name: '', email: '', phone: '', username: '', password: '', role: 'agent' as string, teamId: '', permissionTemplateId: '', mustChangePassword: false, twoFactorEnabled: false, employeeId: '', designation: '' };

export default function UsersPage() {
  const { boot } = useBootstrap(); const invBoot = useInvalidateBootstrap();
  const [search, setSearch] = useState(''); const [role, setRole] = useState(''); const [teamId, setTeam] = useState(''); const [active, setActive] = useState('true'); const [page, setPage] = useState(1);
  const params = { search, role, teamId, isActive: active, page, limit: 25 };
  const q = useQuery({ queryKey: ['users', params], queryFn: async () => (await api.get<ApiList<User>>(`/users${qs(params)}`)).data, placeholderData: (p) => p });
  const tpls = useQuery({ queryKey: ['permission-templates'], queryFn: async () => (await api.get<{ data: PermissionTemplate[] }>('/permission-templates')).data.data });
  const [editing, setEditing] = useState<User | null | 'new'>(null); const [deact, setDeact] = useState<User | null>(null);
  const done = () => { q.refetch(); invBoot(); };
  const activate = useMutation({ mutationFn: (id: string) => api.post(`/users/${id}/activate`), onSuccess: () => { toast.success('User reactivated'); done(); }, onError: (e) => toast.error(errorMessage(e)) });
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3"><div><h2 className="text-[16px] font-semibold">Users</h2><p className="text-[13px] text-ink-3 mt-0.5">Create accounts, set roles and teams, and control what each person can do.</p></div><Button variant="primary" size="sm" onClick={() => setEditing('new')}><Plus size={14} /> New user</Button></div>
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" /><Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, email, phone" className="pl-8 w-[240px] h-8 text-[13px]" /></div>
        <PillSelect label="Role" value={role} onChange={(v) => { setRole(v); setPage(1); }} options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
        <PillSelect label="Team" value={teamId} onChange={(v) => { setTeam(v); setPage(1); }} options={boot.teams.map((t) => ({ value: t.id, label: t.name }))} />
        <PillSelect label="Status" value={active} onChange={(v) => { setActive(v); setPage(1); }} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Deactivated' }]} />
      </div>
      <div className="card overflow-auto">
        {q.isLoading ? <div className="py-10 flex justify-center"><Spinner /></div> : !q.data?.data.length ? <Empty title="No users match" /> : (
          <table className="w-full"><thead><tr>{['User', 'Role', 'Team', 'Permissions', 'Last login', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{q.data.data.map((u) => (
              <tr key={u.id} className="hover:bg-surface-2/60">
                <td className="td"><span className="flex items-center gap-2.5"><Avatar name={u.name} color={u.avatarColor} src={u.avatarUrl} /><span><span className="block font-medium">{u.name}{u.twoFactorEnabled && <ShieldCheck size={13} className="inline ml-1.5 text-success" aria-label="2FA enabled" />}</span><span className="block text-[12px] text-ink-3">{u.email} · {u.phone} · @{u.username}</span></span></span></td>
                <td className="td"><Badge>{ROLE_LABEL[u.role ?? '']}</Badge></td>
                <td className="td text-ink-2">{boot.teams.find((t) => t.id === u.teamId)?.name ?? '—'}</td>
                <td className="td text-ink-2">{u.role === 'admin' ? 'Everything' : tpls.data?.find((t) => t.id === u.permissionTemplateId)?.name ?? <span className="text-ink-3">Role default</span>}</td>
                <td className="td text-ink-2">{u.lastLoginAt ? fmtRelative(u.lastLoginAt) : 'Never'}</td>
                <td className="td"><span className="inline-flex gap-0.5 justify-end w-full"><Button size="icon" variant="ghost" title="Edit" onClick={() => setEditing(u)}><Pencil size={14} /></Button>{u.isActive ? <Button size="icon" variant="ghost" title="Deactivate" className="text-ink-3 hover:text-danger" onClick={() => setDeact(u)}><UserX size={14} /></Button> : <Button size="icon" variant="ghost" title="Reactivate" className="text-success" onClick={() => activate.mutate(u.id)}><UserCheck size={14} /></Button>}</span></td>
              </tr>))}</tbody></table>)}
        <div className="px-3 py-2 border-t border-line"><Pagination page={page} totalPages={q.data?.meta.totalPages ?? 1} total={q.data?.meta.total ?? 0} limit={25} onPage={setPage} onLimit={() => undefined} sizes={[25]} /></div>
      </div>
      <UserModal user={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} onSaved={done} templates={tpls.data ?? []} />
      <DeactivateModal user={deact} onClose={() => setDeact(null)} onDone={done} />
    </div>
  );
}

function UserModal({ user, open, onClose, onSaved, templates }: { user: User | null; open: boolean; onClose: () => void; onSaved: () => void; templates: PermissionTemplate[] }) {
  const { boot } = useBootstrap();
  const [v, setV] = useState({ ...empty }); const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => { if (open) { setErrors({}); setV(user ? { name: user.name, email: user.email ?? '', phone: user.phone, username: user.username, password: '', role: user.role ?? 'agent', teamId: user.teamId ?? '', permissionTemplateId: user.permissionTemplateId ?? '', mustChangePassword: user.mustChangePassword, twoFactorEnabled: !!user.twoFactorEnabled, employeeId: user.employeeId ?? '', designation: user.designation ?? '' } : { ...empty, twoFactorEnabled: !!boot.org?.settings.twoFactorDefault }); } }, [open, user]);
  const set = (k: keyof typeof empty, val: unknown) => setV((s) => ({ ...s, [k]: val }));
  const save = useMutation({
    mutationFn: () => { const body: Record<string, unknown> = { ...v, teamId: v.teamId || null, permissionTemplateId: v.permissionTemplateId || null }; if (!v.password) delete body.password; return user ? api.patch(`/users/${user.id}`, body) : api.post('/users', body); },
    onSuccess: () => { toast.success(user ? 'User updated' : 'User created'); onSaved(); onClose(); },
    onError: (e) => { const d = errorDetails(e) as { path: string; message: string }[] | undefined; if (Array.isArray(d)) setErrors(Object.fromEntries(d.map((x) => [x.path.replace('body.', ''), x.message]))); toast.error(errorMessage(e)); },
  });
  const roleTpls = templates.filter((t) => t.role === v.role);
  return (
    <Modal open={open} onClose={onClose} title={user ? `Edit ${user.name}` : 'New user'} width="max-w-lg" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>{user ? 'Save changes' : 'Create user'}</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Full name" required error={errors.name}><Input value={v.name} onChange={(e) => set('name', e.target.value)} autoFocus /></Field>
        <Field label="Username" required error={errors.username} hint="Used to sign in"><Input value={v.username} onChange={(e) => set('username', e.target.value)} /></Field>
        <Field label="Email" required error={errors.email}><Input type="email" value={v.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Phone" required error={errors.phone}><Input inputMode="tel" value={v.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Employee ID"><Input value={v.employeeId} onChange={(e) => set('employeeId', e.target.value)} /></Field>
        <Field label="Designation"><Input value={v.designation} onChange={(e) => set('designation', e.target.value)} /></Field>
        <Field label={user ? 'New password (optional)' : 'Company password'} required={!user} error={errors.password} hint="Min 8 characters. Users sign in with the password you set here."><Input type="password" value={v.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" /></Field>
        <Field label="Role" required><Select value={v.role} onChange={(e) => { set('role', e.target.value); set('permissionTemplateId', ''); }}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select></Field>
        <Field label="Team" hint={v.role === 'branch_manager' ? 'Managers are linked from the team itself' : undefined}><Select value={v.teamId} onChange={(e) => set('teamId', e.target.value)} disabled={v.role === 'admin' || v.role === 'branch_manager'}><option value="">No team</option>{boot.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
        <Field label="Permission template" hint={v.role === 'admin' ? 'Admins can do everything' : 'Empty = the default template for this role'}><Select value={v.permissionTemplateId} onChange={(e) => set('permissionTemplateId', e.target.value)} disabled={v.role === 'admin'}><option value="">Role default</option>{roleTpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
        <div className="sm:col-span-2 pt-1 space-y-2"><Toggle checked={v.twoFactorEnabled} onChange={(x) => set('twoFactorEnabled', x)} label={<span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-success" /> Two-factor authentication — email a one-time code after the password</span>} /></div>
      </div>
    </Modal>
  );
}

function DeactivateModal({ user, onClose, onDone }: { user: User | null; onClose: () => void; onDone: () => void }) {
  const { boot } = useBootstrap();
  const [info, setInfo] = useState<{ leadCount: number } | null>(null); const [reassignTo, setTo] = useState('');
  useEffect(() => { setInfo(null); setTo(''); if (user) api.get(`/users/${user.id}`).then((r) => setInfo({ leadCount: r.data.data.leadCount ?? 0 })).catch(() => setInfo({ leadCount: 0 })); }, [user]);
  const m = useMutation({ mutationFn: () => api.post(`/users/${user!.id}/deactivate`, { reassignTo: reassignTo || undefined, force: !reassignTo }), onSuccess: (r) => { toast.success(`Deactivated${r.data.data.reassigned ? `, ${r.data.data.reassigned} leads reassigned` : ''}`); onDone(); onClose(); }, onError: (e) => toast.error(errorMessage(e)) });
  if (!user) return null;
  return (
    <Modal open onClose={onClose} title={`Deactivate ${user.name}?`} width="max-w-md" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" loading={m.isPending} onClick={() => m.mutate()}>Deactivate</Button></>}>
      <div className="space-y-3 text-[13.5px] text-ink-2">
        <p>They will be signed out immediately and can no longer log in. Their history stays intact and the account can be reactivated later.</p>
        {info === null ? <Spinner /> : info.leadCount > 0 ? <Field label={`${user.name} owns ${info.leadCount} lead(s). Hand them to:`}><Select value={reassignTo} onChange={(e) => setTo(e.target.value)}><option value="">Leave unassigned (assignment rules may pick them up)</option>{boot.users.filter((u) => u.id !== user.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field> : <p className="text-ink-3">This user owns no leads.</p>}
      </div>
    </Modal>
  );
}
