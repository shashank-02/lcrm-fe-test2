import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Plus, RefreshCw, Trash2, Pencil, Save, ShieldCheck, Search } from 'lucide-react';
import { Badge, Button, Empty, Field, Input, Modal, Select, Spinner, Toggle, Pagination, PillSelect } from '@/components/ui';
import { api, errorMessage, qs } from '@/lib/api';
import { fmtDateTime, ROLE_LABEL } from '@/lib/utils';
import { useBootstrap, useInvalidateBootstrap } from '@/store/bootstrap';
import { ConfigCrudPage, CrudFormModal } from './ConfigCrudPage';
import { fieldsSpec } from './configSpecs';
import type { CrudSpec } from './ConfigCrudPage';
import type { ApiList, AuditLogItem, Bootstrap, FbEvent, FieldDef, ListView, PrioritizationRule, ViewGroup, LeadColumnCfg, ColumnGroupCfg } from '@/types';
import PermissionsPage from './PermissionsPage';

const SYSTEM_COLUMNS: { key: string; label: string }[] = [{ key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'stage', label: 'Stage' }, { key: 'status', label: 'Status' }, { key: 'owner', label: 'Owner' }, { key: 'source', label: 'Source' }, { key: 'city', label: 'City' }, { key: 'priority', label: 'Priority' }, { key: 'nextFollowUpAt', label: 'Next follow-up' }, { key: 'lastContactedAt', label: 'Last contacted' }, { key: 'assignedAt', label: 'Assigned' }, { key: 'remarks', label: 'Remarks' }, { key: 'createdAt', label: 'Created' }];
export const allColumns = (boot: Bootstrap) => [...SYSTEM_COLUMNS, ...boot.fields.map((f) => ({ key: `custom.${f.key}`, label: f.label }))];

function useSaveSettings() {
  const inv = useInvalidateBootstrap();
  return useMutation({ mutationFn: (settings: Record<string, unknown>) => api.patch('/organisation', { settings }), onSuccess: () => { toast.success('Saved'); inv(); }, onError: (e) => toast.error(errorMessage(e)) });
}

// ---------- Lead Settings → Create Layout ----------
export function LayoutPage() {
  const { boot } = useBootstrap(); const inv = useInvalidateBootstrap();
  const q = useQuery({ queryKey: ['config', '/config/fields'], queryFn: async () => (await api.get<{ data: FieldDef[] }>('/config/fields?includeInactive=true')).data.data });
  const [editing, setEditing] = useState<FieldDef | null | 'new'>(null); const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null);
  const spec = fieldsSpec(boot);
  const sections = useMemo(() => { const m = new Map<string, FieldDef[]>(); (q.data ?? []).forEach((f) => m.set(`${f.tab} · ${f.section}`, [...(m.get(`${f.tab} · ${f.section}`) ?? []), f])); return Array.from(m.entries()); }, [q.data]);
  const patch = useMutation({ mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.patch(`/config/fields/${id}`, body), onSuccess: () => { q.refetch(); inv(); }, onError: (e) => toast.error(errorMessage(e)) });
  const reorder = useMutation({ mutationFn: (ids: string[]) => api.post('/config/fields/reorder', { ids }), onSuccess: () => { q.refetch(); inv(); } });
  const rename = useMutation({ mutationFn: async () => { const fields = (q.data ?? []).filter((f) => `${f.tab} · ${f.section}` === renaming!.from); for (const f of fields) await api.patch(`/config/fields/${f.id}`, { section: renaming!.to }); }, onSuccess: () => { toast.success('Section renamed'); setRenaming(null); q.refetch(); inv(); }, onError: (e) => toast.error(errorMessage(e)) });
  const move = (list: FieldDef[], i: number, dir: -1 | 1) => { const all = (q.data ?? []).map((f) => f.id); const a = all.indexOf(list[i].id), b = all.indexOf(list[i + dir]?.id); if (a < 0 || b < 0) return; [all[a], all[b]] = [all[b], all[a]]; reorder.mutate(all); };
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3"><div><h2 className="text-[16px] font-semibold">Create Layout</h2><p className="text-[13px] text-ink-3 mt-0.5">Fields on the lead page, grouped by tab and section. Toggle visibility, required and read-only; reorder within a section. Changes apply to the lead page immediately.</p></div><Button size="sm" variant="primary" onClick={() => setEditing('new')}><Plus size={14} /> Add field</Button></div>
      {q.isLoading ? <Spinner /> : !sections.length ? <Empty title="No fields yet" action={<Button size="sm" variant="primary" onClick={() => setEditing('new')}>Add the first field</Button>} /> : sections.map(([name, fields]) => (
        <section key={name} className="card mb-3 overflow-hidden">
          <header className="flex items-center gap-2 px-3 py-2 bg-surface-2/60 border-b border-line"><h3 className="text-[13px] font-semibold flex-1">{name}</h3><span className="text-[12px] text-ink-3">{fields.length} field(s)</span><Button size="sm" variant="ghost" onClick={() => setRenaming({ from: name, to: fields[0].section })}><Pencil size={13} /> Rename section</Button></header>
          <table className="w-full"><thead><tr><th className="th w-16"></th><th className="th">Field</th><th className="th">Type</th><th className="th">Visible</th><th className="th">Required</th><th className="th">Read-only</th><th className="th">Create form</th><th className="th">List</th><th className="th w-20"></th></tr></thead>
            <tbody>{fields.map((f, i) => <tr key={f.id} className={!f.isActive ? 'opacity-50' : ''}>
              <td className="td"><span className="inline-flex items-center"><GripVertical size={13} className="text-ink-3" /><button className="p-0.5 text-ink-3 hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => move(fields, i, -1)}><ArrowUp size={13} /></button><button className="p-0.5 text-ink-3 hover:text-ink disabled:opacity-30" disabled={i === fields.length - 1} onClick={() => move(fields, i, 1)}><ArrowDown size={13} /></button></span></td>
              <td className="td"><span className="font-medium">{f.label}</span><span className="text-ink-3 text-[12px] ml-1.5">{f.key}</span></td><td className="td text-ink-2">{f.type}</td>
              <td className="td"><Toggle checked={f.isActive} onChange={(v) => patch.mutate({ id: f.id, body: { isActive: v } })} /></td><td className="td"><Toggle checked={f.required} onChange={(v) => patch.mutate({ id: f.id, body: { required: v } })} /></td><td className="td"><Toggle checked={!!f.readOnly} onChange={(v) => patch.mutate({ id: f.id, body: { readOnly: v } })} /></td><td className="td"><Toggle checked={f.showInCreate} onChange={(v) => patch.mutate({ id: f.id, body: { showInCreate: v } })} /></td><td className="td"><Toggle checked={f.showInList} onChange={(v) => patch.mutate({ id: f.id, body: { showInList: v } })} /></td>
              <td className="td"><Button size="icon" variant="ghost" onClick={() => setEditing(f)}><Pencil size={14} /></Button></td></tr>)}</tbody></table>
        </section>))}
      <CrudFormModal spec={spec} row={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} onSaved={() => { q.refetch(); inv(); }} />
      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename section" width="max-w-sm" footer={<><Button onClick={() => setRenaming(null)}>Cancel</Button><Button variant="primary" loading={rename.isPending} disabled={!renaming?.to.trim()} onClick={() => rename.mutate()}>Rename</Button></>}><Field label="Section name"><Input value={renaming?.to ?? ''} onChange={(e) => setRenaming((r) => r && { ...r, to: e.target.value })} autoFocus /></Field></Modal>
    </div>
  );
}

// ---------- Lead Settings → Columns ----------
export function ColumnsPage() {
  const { boot } = useBootstrap(); const save = useSaveSettings();
  const all = allColumns(boot);
  const [cols, setCols] = useState<LeadColumnCfg[]>([]);
  useEffect(() => { const cfg = boot.org?.settings.leadColumns ?? []; const merged: LeadColumnCfg[] = all.map((c, i) => { const ex = cfg.find((x) => x.key === c.key); return ex ? { ...ex, label: ex.label || c.label } : { key: c.key, label: c.label, visible: ['name', 'phone', 'stage', 'status', 'owner', 'source', 'nextFollowUpAt', 'lastContactedAt', 'createdAt'].includes(c.key), order: 100 + i }; }); setCols(merged.sort((a, b) => a.order - b.order)); }, [boot.org, boot.fields]); // eslint-disable-line react-hooks/exhaustive-deps
  const move = (i: number, d: -1 | 1) => setCols((c) => { const n = [...c]; const j = i + d; if (j < 0 || j >= n.length) return c; [n[i], n[j]] = [n[j], n[i]]; return n.map((x, k) => ({ ...x, order: k })); });
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3"><div><h2 className="text-[16px] font-semibold">Columns</h2><p className="text-[13px] text-ink-3 mt-0.5">Default columns of the lead list, their order and display names. Users can still customise their own view; “Reset to default” brings them back here.</p></div><Button size="sm" variant="primary" loading={save.isPending} onClick={() => save.mutate({ leadColumns: cols.map((c, i) => ({ ...c, order: i })) })}><Save size={14} /> Save columns</Button></div>
      <div className="card overflow-auto"><table className="w-full"><thead><tr><th className="th w-20">Order</th><th className="th">Column</th><th className="th">Display name</th><th className="th w-28">Visible</th></tr></thead>
        <tbody>{cols.map((c, i) => <tr key={c.key} className={!c.visible ? 'opacity-60' : ''}><td className="td"><span className="inline-flex"><button className="p-0.5 text-ink-3 hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={13} /></button><button className="p-0.5 text-ink-3 hover:text-ink disabled:opacity-30" disabled={i === cols.length - 1} onClick={() => move(i, 1)}><ArrowDown size={13} /></button></span></td><td className="td text-ink-2"><code className="text-[12px]">{c.key}</code></td><td className="td"><Input sm value={c.label} onChange={(e) => setCols((cs) => cs.map((x) => (x.key === c.key ? { ...x, label: e.target.value } : x)))} /></td><td className="td"><button className="inline-flex items-center gap-1.5 text-[13px]" onClick={() => setCols((cs) => cs.map((x) => (x.key === c.key ? { ...x, visible: !x.visible } : x)))}>{c.visible ? <Eye size={14} className="text-primary" /> : <EyeOff size={14} className="text-ink-3" />} {c.visible ? 'Shown' : 'Hidden'}</button></td></tr>)}</tbody></table></div>
    </div>
  );
}

// ---------- Lead Settings → Column groups ----------
export function ColumnGroupsPage() {
  const { boot } = useBootstrap(); const save = useSaveSettings();
  const all = allColumns(boot);
  const [groups, setGroups] = useState<ColumnGroupCfg[]>([]);
  useEffect(() => { setGroups([...(boot.org?.settings.columnGroups ?? [])].sort((a, b) => a.order - b.order)); }, [boot.org]);
  const upd = (i: number, p: Partial<ColumnGroupCfg>) => setGroups((g) => g.map((x, k) => (k === i ? { ...x, ...p } : x)));
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3"><div><h2 className="text-[16px] font-semibold">Column groups</h2><p className="text-[13px] text-ink-3 mt-0.5">Group related columns (e.g. Customer information, Employment, Loan) so they appear together in the column picker.</p></div><span className="flex gap-2"><Button size="sm" onClick={() => setGroups((g) => [...g, { name: 'New group', columns: [], order: g.length }])}><Plus size={14} /> Add group</Button><Button size="sm" variant="primary" loading={save.isPending} onClick={() => save.mutate({ columnGroups: groups.map((g, i) => ({ ...g, order: i })) })}><Save size={14} /> Save groups</Button></span></div>
      {!groups.length ? <Empty title="No column groups" hint="Add a group, name it and tick the columns that belong to it." /> : <div className="grid md:grid-cols-2 gap-3">{groups.map((g, i) => (
        <div key={i} className="card p-3"><div className="flex items-center gap-2 mb-2"><Input sm value={g.name} onChange={(e) => upd(i, { name: e.target.value })} className="font-medium" /><Button size="icon" variant="ghost" disabled={i === 0} onClick={() => setGroups((gs) => { const n = [...gs]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })}><ArrowUp size={13} /></Button><Button size="icon" variant="ghost" disabled={i === groups.length - 1} onClick={() => setGroups((gs) => { const n = [...gs]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n; })}><ArrowDown size={13} /></Button><Button size="icon" variant="ghost" className="text-ink-3 hover:text-danger" onClick={() => setGroups((gs) => gs.filter((_, k) => k !== i))}><Trash2 size={13} /></Button></div>
          <div className="flex flex-wrap gap-1.5">{all.map((c) => { const on = g.columns.includes(c.key); return <button key={c.key} type="button" className={`pill ${on ? 'border-primary text-primary bg-primary-soft' : ''}`} onClick={() => upd(i, { columns: on ? g.columns.filter((x) => x !== c.key) : [...g.columns, c.key] })}>{c.label}</button>; })}</div></div>))}</div>}
    </div>
  );
}

// ---------- Views → View tabs / groups ----------
export const viewTabsSpec = (boot: Bootstrap): CrudSpec<ListView> => ({
  title: 'View tabs', entity: 'View tab', endpoint: '/config/views', reorderable: true, description: 'Tabs on the lead list. Built-in tabs can be renamed, restricted to roles/teams, grouped or deactivated; custom tabs combine a base tab with fixed filters.',
  columns: [{ key: 'name', label: 'Tab', render: (v) => <span className="font-medium">{v.name}{v.isDefault && <Badge className="ml-2">Default</Badge>}{v.isSystem && <Badge className="ml-1" soft color="#6B7280">built-in</Badge>}</span> }, { key: 'baseTab', label: 'Based on' }, { key: 'filters', label: 'Filters', render: (v) => Object.entries(v.filters ?? {}).filter(([, x]) => x).map(([k, x]) => `${k}=${String(x)}`).join(', ') || '—' }, { key: 'roles', label: 'Roles', render: (v) => (v.roles.length ? v.roles.map((r) => ROLE_LABEL[r]).join(', ') : 'All') }, { key: 'group', label: 'Group', render: (v) => boot.viewGroups.find((g) => g.id === v.groupId)?.name ?? '—' }, { key: 'isActive', label: 'Active', render: (v) => (v.isActive ? 'Yes' : 'No') }],
  fields: [
    { key: 'name', label: 'Tab name', type: 'text', required: true }, { key: 'baseTab', label: 'Based on', type: 'select', required: true, options: ['all', 'contacted_today', 'assigned_today', 'created_today', 'followup_today', 'overdue', 'unassigned', 'today_list', 'custom'].map((k) => ({ value: k, label: k })) },
    { key: 'stageId', label: 'Filter: stage', type: 'select', options: boot.stages.map((s) => ({ value: s.id, label: s.name })) }, { key: 'statusId', label: 'Filter: status', type: 'select', options: boot.statuses.map((s) => ({ value: s.id, label: s.name })) }, { key: 'sourceId', label: 'Filter: source', type: 'select', options: boot.sources.map((s) => ({ value: s.id, label: s.name })) },
    { key: 'groupId', label: 'View group', type: 'select', options: boot.viewGroups.map((g) => ({ value: g.id, label: g.name })) },
    { key: 'roles', label: 'Visible to roles (empty = all)', type: 'multiselect', options: (['admin', 'branch_manager', 'team_lead', 'agent'] as const).map((r) => ({ value: r, label: ROLE_LABEL[r] })) },
    { key: 'teamIds', label: 'Visible to teams (empty = all)', type: 'multiselect', options: boot.teams.map((t) => ({ value: t.id, label: t.name })) },
    { key: 'isDefault', label: 'Default tab', type: 'boolean' }, { key: 'isActive', label: 'Active', type: 'boolean' },
  ],
  defaults: { baseTab: 'all', isActive: true, roles: [], teamIds: [] },
  toForm: (v) => ({ ...v, stageId: (v.filters as Record<string, string>)?.stageId ?? '', statusId: (v.filters as Record<string, string>)?.statusId ?? '', sourceId: (v.filters as Record<string, string>)?.sourceId ?? '', groupId: v.groupId ?? '' }),
  toPayload: (v) => { const { stageId, statusId, sourceId, ...rest } = v; return { ...rest, groupId: v.groupId || null, filters: { ...(stageId ? { stageId } : {}), ...(statusId ? { statusId } : {}), ...(sourceId ? { sourceId } : {}) } }; },
  canDelete: (v) => !v.isSystem,
});
export const viewGroupsSpec = (): CrudSpec<ViewGroup> => ({ title: 'View groups', entity: 'View group', endpoint: '/config/view-groups', reorderable: true, description: 'Organise tabs into groups such as “My leads” and “Team leads”.', columns: [{ key: 'name', label: 'Group' }], fields: [{ key: 'name', label: 'Name', type: 'text', required: true }] });

// ---------- Prioritisation ----------
export function PrioritizationPage() {
  const { boot } = useBootstrap();
  const spec: CrudSpec<PrioritizationRule> = {
    title: 'Prioritisation', entity: 'Rule', endpoint: '/config/prioritization', reorderable: true, description: 'Each matching rule adds points to a lead\'s priority (0–100). Sort the lead list by Priority to work the most valuable leads first.',
    columns: [{ key: 'name', label: 'Rule' }, { key: 'cond', label: 'Condition', render: (r) => `${r.factor}${r.fieldKey ? `.${r.fieldKey}` : ''} ${r.operator} ${Array.isArray(r.value) ? (r.value as unknown[]).join('/') : String(r.value ?? '')}` }, { key: 'points', label: 'Points', render: (r) => <span className={r.points >= 0 ? 'text-success font-medium' : 'text-danger font-medium'}>{r.points > 0 ? `+${r.points}` : r.points}</span> }, { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? 'Yes' : 'No') }],
    fields: [
      { key: 'name', label: 'Rule name', type: 'text', required: true }, { key: 'points', label: 'Points (−100…100)', type: 'number', required: true },
      { key: 'factor', label: 'Factor', type: 'select', required: true, options: [['qualityScore', 'Quality / engagement score'], ['contactCount', 'Number of contacts'], ['nextFollowUpAt', 'Follow-up date'], ['stage', 'Lead stage'], ['status', 'Lead status'], ['source', 'Source'], ['leadAgeDays', 'Age of lead (days)'], ['customField', 'Custom field (amount, product type…)']].map(([v, l]) => ({ value: v, label: l })) },
      { key: 'fieldKey', label: 'Custom field', type: 'select', options: boot.fields.map((f) => ({ value: f.key, label: f.label })), showIf: (v) => v.factor === 'customField' },
      { key: 'operator', label: 'Operator', type: 'select', required: true, options: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'exists', 'overdue', 'due_today'].map((o) => ({ value: o, label: o })) },
      { key: 'value', label: 'Value', type: 'select', options: boot.stages.map((s) => ({ value: s.id, label: s.name })), showIf: (v) => v.factor === 'stage' },
      { key: 'value', label: 'Value', type: 'select', options: boot.statuses.map((s) => ({ value: s.id, label: s.name })), showIf: (v) => v.factor === 'status' },
      { key: 'value', label: 'Value', type: 'select', options: boot.sources.map((s) => ({ value: s.id, label: s.name })), showIf: (v) => v.factor === 'source' },
      { key: 'value', label: 'Value (number, text or comma list for “in”)', type: 'text', showIf: (v) => !['stage', 'status', 'source'].includes(String(v.factor)) && !['exists', 'overdue', 'due_today'].includes(String(v.operator)) },
      { key: 'isActive', label: 'Active', type: 'boolean' },
    ],
    defaults: { points: 10, factor: 'qualityScore', operator: 'gte', isActive: true },
    toPayload: (v) => { let value: unknown = v.value; if (typeof value === 'string' && v.operator === 'in') value = value.split(',').map((s) => s.trim()).filter(Boolean); else if (typeof value === 'string' && value !== '' && !Number.isNaN(Number(value)) && !['stage', 'status', 'source'].includes(String(v.factor))) value = Number(value); return { ...v, value: value ?? null }; },
  };
  const recompute = useMutation({ mutationFn: () => api.post<{ data: { updated: number } }>('/config/prioritization/recompute'), onSuccess: (r) => toast.success(`Priority recomputed for ${r.data.data.updated} leads`), onError: (e) => toast.error(errorMessage(e)) });
  return <div><div className="flex justify-end mb-2"><Button size="sm" loading={recompute.isPending} onClick={() => recompute.mutate()}><RefreshCw size={14} /> Recompute all leads</Button></div><ConfigCrudPage spec={spec} /></div>;
}

// ---------- FB conversion events ----------
export const fbEventsSpec = (boot: Bootstrap): CrudSpec<FbEvent> => ({
  title: 'FB conversion events', entity: 'Conversion event', endpoint: '/config/fb-events', description: 'Map lead events to Meta Conversions API events. The access token is stored encrypted and never shown again.',
  columns: [{ key: 'name', label: 'Mapping' }, { key: 'trigger', label: 'When', render: (e) => `${e.trigger}${e.stageId ? ` → ${boot.stages.find((s) => s.id === e.stageId)?.name ?? '?'}` : ''}${e.statusId ? ` → ${boot.statuses.find((s) => s.id === e.statusId)?.name ?? '?'}` : ''}` }, { key: 'eventName', label: 'Meta event' }, { key: 'pixelId', label: 'Pixel', render: (e) => <span>{e.pixelId || '—'} {e.hasAccessToken ? <Badge color="#1B8A5A" soft>token set</Badge> : <Badge color="#C23B3B" soft>no token</Badge>}</span> }, { key: 'stats', label: 'Fired', render: (e) => <span>{e.firedCount}{e.lastError && <span className="block text-[11px] text-danger">{e.lastError}</span>}</span> }, { key: 'isActive', label: 'Active', render: (e) => (e.isActive ? 'Yes' : 'No') }],
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true }, { key: 'trigger', label: 'Trigger', type: 'select', required: true, options: [['lead_created', 'Lead created'], ['stage_changed', 'Stage changed'], ['status_changed', 'Status changed'], ['lead_won', 'Lead won / disbursed']].map(([v, l]) => ({ value: v, label: l })) },
    { key: 'stageId', label: 'Only for stage', type: 'select', options: boot.stages.map((s) => ({ value: s.id, label: s.name })), showIf: (v) => v.trigger === 'stage_changed' }, { key: 'statusId', label: 'Only for status', type: 'select', options: boot.statuses.map((s) => ({ value: s.id, label: s.name })), showIf: (v) => v.trigger === 'status_changed' },
    { key: 'sourceIds', label: 'Only for sources (empty = all)', type: 'multiselect', options: boot.sources.map((s) => ({ value: s.id, label: s.name })) },
    { key: 'eventName', label: 'Meta event name', type: 'text', required: true, placeholder: 'Lead, CompleteRegistration, Purchase…' }, { key: 'pixelId', label: 'Pixel ID', type: 'text' }, { key: 'accessToken', label: 'Access token (leave blank to keep)', type: 'text' }, { key: 'testEventCode', label: 'Test event code', type: 'text' }, { key: 'isActive', label: 'Active', type: 'boolean' },
  ],
  defaults: { trigger: 'lead_created', eventName: 'Lead', isActive: true, sourceIds: [] },
  toForm: (e) => ({ ...e, stageId: e.stageId ?? '', statusId: e.statusId ?? '', accessToken: '' }),
  toPayload: (v) => ({ ...v, stageId: v.stageId || null, statusId: v.statusId || null }),
});

// ---------- Feature permissions (matrix + lead-page settings) ----------
export function FeaturePermissionsPage() {
  const { boot } = useBootstrap(); const save = useSaveSettings();
  const s = boot.org?.settings;
  return (
    <div className="space-y-6">
      <section className="card p-4">
        <h2 className="text-[16px] font-semibold inline-flex items-center gap-2"><ShieldCheck size={16} className="text-primary" /> Lead page settings</h2>
        <p className="text-[13px] text-ink-3 mt-0.5 mb-3">Global, admin-only switches enforced by the API and applied to every user.</p>
        <div className="space-y-3">
          <Toggle checked={s?.showLeadStageBar !== false} onChange={(v) => save.mutate({ showLeadStageBar: v })} label={<span><span className="font-medium">Show Lead Status Bar</span> <span className="text-ink-3">— the stage chevron bar on the lead page (Lead → Prospect → … → Approved). Hiding it does not change any lead data.</span></span>} />
          <Toggle checked={!!s?.duplicatePhoneCheck} onChange={(v) => save.mutate({ duplicatePhoneCheck: v })} label={<span><span className="font-medium">Duplicate phone warning</span> <span className="text-ink-3">when creating leads</span></span>} />
          <div className="flex items-center gap-3 text-[13.5px]"><span className="font-medium">Top-up reminder after</span><Input sm type="number" min={1} max={36} className="w-20" defaultValue={s?.topUpReminderMonths ?? 3} onBlur={(e) => { const n = Number(e.target.value); if (n && n !== s?.topUpReminderMonths) save.mutate({ topUpReminderMonths: n }); }} /><span className="text-ink-3">months from disbursement</span></div>
        </div>
      </section>
      <PermissionsPage />
    </div>
  );
}

// ---------- Audit log ----------
export function AuditLogPage() {
  const { boot } = useBootstrap();
  const [entity, setEntity] = useState(''); const [userId, setUserId] = useState(''); const [action, setAction] = useState(''); const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['audit', { entity, userId, action, page }], queryFn: async () => (await api.get<ApiList<AuditLogItem>>(`/audit-logs${qs({ entity, userId, action, page, limit: 50 })}`)).data, placeholderData: (p) => p });
  const [open, setOpen] = useState<AuditLogItem | null>(null);
  return (
    <div>
      <div className="mb-3"><h2 className="text-[16px] font-semibold">Audit log</h2><p className="text-[13px] text-ink-3 mt-0.5">Who changed what and when — permissions, users, teams, documents, training, settings, automations.</p></div>
      <div className="flex flex-wrap gap-2 mb-3"><div className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" /><Input value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} placeholder="Action prefix e.g. document." className="pl-8 h-8 w-[220px] text-[13px]" /></div><PillSelect label="Entity" value={entity} onChange={(v) => { setEntity(v); setPage(1); }} options={['User', 'Team', 'PermissionTemplate', 'Organisation', 'Document', 'DocFolder', 'Training', 'FbConversionEvent', 'Lead'].map((e) => ({ value: e, label: e }))} /><PillSelect label="User" value={userId} onChange={(v) => { setUserId(v); setPage(1); }} options={boot.users.map((u) => ({ value: u.id, label: u.name }))} /></div>
      <div className="card overflow-x-auto">{q.isLoading ? <Spinner /> : !q.data?.data.length ? <Empty title="No audit entries" /> : (
        <table className="w-full min-w-[760px]"><thead><tr><th className="th">When</th><th className="th">User</th><th className="th">Action</th><th className="th">Summary</th><th className="th">IP</th><th className="th"></th></tr></thead>
          <tbody>{q.data.data.map((a) => <tr key={a.id} className="hover:bg-surface-2/60"><td className="td tabular-nums text-ink-2">{fmtDateTime(a.createdAt)}</td><td className="td">{a.user?.name ?? 'System'}</td><td className="td"><code className="text-[12px]">{a.action}</code></td><td className="td whitespace-normal max-w-[380px]">{a.summary}</td><td className="td text-ink-3 text-[12px]">{a.ip}</td><td className="td">{(a.before != null || a.after != null) ? <Button size="sm" variant="ghost" onClick={() => setOpen(a)}>Diff</Button> : null}</td></tr>)}</tbody></table>)}
        <div className="px-3 py-2 border-t border-line"><Pagination page={page} totalPages={q.data?.meta.totalPages ?? 1} total={q.data?.meta.total ?? 0} limit={50} onPage={setPage} onLimit={() => undefined} sizes={[50]} /></div></div>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.summary ?? 'Change'} width="max-w-3xl" footer={<Button onClick={() => setOpen(null)}>Close</Button>}><div className="grid md:grid-cols-2 gap-3 text-[12px]"><div><p className="font-semibold mb-1">Before</p><pre className="bg-surface-2 rounded-md p-2 overflow-auto max-h-80">{JSON.stringify(open?.before, null, 2) ?? '—'}</pre></div><div><p className="font-semibold mb-1">After</p><pre className="bg-surface-2 rounded-md p-2 overflow-auto max-h-80">{JSON.stringify(open?.after, null, 2) ?? '—'}</pre></div></div></Modal>
    </div>
  );
}

/** Small helper used by Project Admin → Members to pick a team template (rendered in TeamsPage via boot). */
export function useTemplatesList() { return useQuery({ queryKey: ['permission-templates'], queryFn: async () => (await api.get<{ data: { id: string; name: string; role: string }[] }>('/permission-templates')).data.data }); }
export { Select };
