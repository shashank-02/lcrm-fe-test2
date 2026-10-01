import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Plus, Star, Trash2 } from 'lucide-react';
import { Badge, Button, Checkbox, Confirm, Field, Input, Modal, Select, Spinner, Textarea } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { cn, ROLE_LABEL } from '@/lib/utils';
import { useBootstrap } from '@/store/bootstrap';
import type { PermissionTemplate } from '@/types';

/** Permission matrix editor: rows = permissions grouped, columns = templates. */
export default function PermissionsPage() {
  const { boot } = useBootstrap();
  const q = useQuery({ queryKey: ['permission-templates'], queryFn: async () => (await api.get<{ data: PermissionTemplate[] }>('/permission-templates')).data.data });
  const [role, setRole] = useState<string>('agent');
  const tpls = useMemo(() => (q.data ?? []).filter((t) => t.role === role), [q.data, role]);
  const [draft, setDraft] = useState<Record<string, Set<string>>>({});
  useEffect(() => { const d: Record<string, Set<string>> = {}; (q.data ?? []).forEach((t) => { d[t.id] = new Set(t.permissions); }); setDraft(d); }, [q.data]);
  const dirty = (t: PermissionTemplate) => { const s = draft[t.id]; if (!s) return false; return s.size !== t.permissions.length || t.permissions.some((p) => !s.has(p)); };
  const save = useMutation({ mutationFn: (t: PermissionTemplate) => api.patch(`/permission-templates/${t.id}`, { permissions: Array.from(draft[t.id]) }), onSuccess: () => { toast.success('Permissions saved — users get them on their next request'); q.refetch(); }, onError: (e) => toast.error(errorMessage(e)) });
  const setDefault = useMutation({ mutationFn: (t: PermissionTemplate) => api.patch(`/permission-templates/${t.id}`, { isDefault: true }), onSuccess: () => q.refetch(), onError: (e) => toast.error(errorMessage(e)) });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/permission-templates/${id}`), onSuccess: () => { toast.success('Template deleted'); setDel(null); q.refetch(); }, onError: (e) => toast.error(errorMessage(e)) });
  const [creating, setCreating] = useState(false); const [clone, setClone] = useState<PermissionTemplate | null>(null); const [del, setDel] = useState<PermissionTemplate | null>(null);
  const toggle = (id: string, key: string, on: boolean) => setDraft((d) => { const s = new Set(d[id]); on ? s.add(key) : s.delete(key); return { ...d, [id]: s }; });
  const toggleGroup = (id: string, keys: string[], on: boolean) => setDraft((d) => { const s = new Set(d[id]); keys.forEach((k) => (on ? s.add(k) : s.delete(k))); return { ...d, [id]: s }; });
  const groups = Object.entries(boot.permissionCatalogue);
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3"><div><h2 className="text-[16px] font-semibold">Permission templates</h2><p className="text-[13px] text-ink-3 mt-0.5">Each role has a default template. Create variants (e.g. "Senior agent") and attach them to specific users. Admins always have every permission.</p></div><Button variant="primary" size="sm" onClick={() => setCreating(true)}><Plus size={14} /> New template</Button></div>
      <div className="flex gap-1 mb-3">{(['agent', 'team_lead', 'branch_manager'] as const).map((r) => <button key={r} onClick={() => setRole(r)} className={cn('pill', role === r && 'border-primary text-primary bg-primary-soft')}>{ROLE_LABEL[r]} <span className="text-ink-3">{(q.data ?? []).filter((t) => t.role === r).length}</span></button>)}</div>
      {q.isLoading ? <Spinner /> : (
        <div className="card overflow-auto">
          <table className="w-full">
            <thead><tr><th className="th min-w-[260px]">Permission</th>{tpls.map((t) => (
              <th key={t.id} className="th min-w-[170px] align-top">
                <div className="flex items-center gap-1.5">{t.isDefault && <Star size={12} className="text-warning fill-warning" />}<span className="font-semibold">{t.name}</span></div>
                <p className="text-[11px] text-ink-3 font-normal mt-0.5">{t.userCount ?? 0} user(s){t.isSystem ? ' · system' : ''}</p>
                <div className="flex gap-1 mt-1.5">{dirty(t) && <Button size="sm" variant="primary" loading={save.isPending} onClick={() => save.mutate(t)}>Save</Button>}{!t.isDefault && <Button size="sm" variant="ghost" title="Make default for role" onClick={() => setDefault.mutate(t)}><Star size={13} /></Button>}<Button size="sm" variant="ghost" title="Clone" onClick={() => setClone(t)}><Copy size={13} /></Button>{!t.isSystem && <Button size="sm" variant="ghost" className="text-ink-3 hover:text-danger" title="Delete" onClick={() => setDel(t)}><Trash2 size={13} /></Button>}</div>
              </th>))}</tr></thead>
            <tbody>{groups.map(([group, perms]) => { const keys = Object.keys(perms); return (
              <GroupRows key={group} group={group} perms={perms} tpls={tpls} draft={draft} keys={keys} toggle={toggle} toggleGroup={toggleGroup} />); })}</tbody>
          </table>
          {!tpls.length && <p className="p-6 text-center text-[13px] text-ink-3">No templates for this role yet.</p>}
        </div>)}
      <TemplateModal open={creating || !!clone} onClose={() => { setCreating(false); setClone(null); }} clone={clone} role={role} onSaved={() => q.refetch()} />
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del.id)} loading={remove.isPending} danger title={`Delete "${del?.name}"?`} body="Users on this template must be moved to another template first." confirmLabel="Delete" />
    </div>
  );
}

function GroupRows({ group, perms, tpls, draft, keys, toggle, toggleGroup }: { group: string; perms: Record<string, string>; tpls: PermissionTemplate[]; draft: Record<string, Set<string>>; keys: string[]; toggle: (id: string, k: string, on: boolean) => void; toggleGroup: (id: string, keys: string[], on: boolean) => void }) {
  return (<>
    <tr className="bg-surface-2/60"><td className="td font-semibold text-[12.5px] text-ink-2">{group}</td>{tpls.map((t) => { const s = draft[t.id] ?? new Set(); const all = keys.every((k) => s.has(k)); const some = keys.some((k) => s.has(k)); return <td key={t.id} className="td"><Checkbox checked={all} indeterminate={!all && some} onChange={(on) => toggleGroup(t.id, keys, on)} label={<span className="text-[12px] text-ink-3">all</span>} /></td>; })}</tr>
    {Object.entries(perms).map(([key, label]) => <tr key={key} className="hover:bg-surface-2/40"><td className="td"><span>{label}</span><span className="block text-[11px] text-ink-3 font-mono">{key}</span></td>{tpls.map((t) => <td key={t.id} className="td"><Checkbox checked={draft[t.id]?.has(key) ?? false} onChange={(on) => toggle(t.id, key, on)} /></td>)}</tr>)}
  </>);
}

function TemplateModal({ open, onClose, clone, role, onSaved }: { open: boolean; onClose: () => void; clone: PermissionTemplate | null; role: string; onSaved: () => void }) {
  const [name, setName] = useState(''); const [desc, setDesc] = useState(''); const [r, setR] = useState(role);
  useEffect(() => { if (open) { setName(clone ? `${clone.name} (copy)` : ''); setDesc(clone?.description ?? ''); setR(clone?.role ?? role); } }, [open, clone, role]);
  const m = useMutation({ mutationFn: (): Promise<unknown> => clone ? api.post(`/permission-templates/${clone.id}/clone`, { name }) : api.post('/permission-templates', { name, role: r, description: desc, permissions: [] }), onSuccess: () => { toast.success('Template created'); onSaved(); onClose(); }, onError: (e) => toast.error(errorMessage(e)) });
  return (
    <Modal open={open} onClose={onClose} title={clone ? `Clone "${clone.name}"` : 'New permission template'} width="max-w-sm" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim()} loading={m.isPending} onClick={() => m.mutate()}>Create</Button></>}>
      <div className="space-y-3">
        <Field label="Name" required><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Senior agent" /></Field>
        {!clone && <><Field label="Role" required><Select value={r} onChange={(e) => setR(e.target.value)}>{(['agent', 'team_lead', 'branch_manager'] as const).map((x) => <option key={x} value={x}>{ROLE_LABEL[x]}</option>)}</Select></Field><Field label="Description"><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-[56px]" /></Field><p className="text-[12.5px] text-ink-3">The template starts empty — tick permissions in the matrix, then Save.</p></>}
        {clone && <p className="text-[12.5px] text-ink-3">Copies all {clone.permissions.length} permissions from <Badge>{clone.name}</Badge>.</p>}
      </div>
    </Modal>
  );
}
