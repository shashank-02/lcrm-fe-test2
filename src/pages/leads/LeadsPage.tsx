import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarClock, Columns3, Download, Filter, ListChecks, Mail, MessageCircle, MoreHorizontal, Pencil, Phone, Plus, Search, SlidersHorizontal, Tag, Trash2, Upload, UserPlus, X, Layers, ListTodo } from 'lucide-react';
import { Avatar, Button, Checkbox, Drawer, Empty, Field, Input, Menu, Modal, PageHeader, Pagination, PillSelect, Select, Spinner, Tabs } from '@/components/ui';
import { fieldValue } from '@/components/fields/DynamicField';
import { api, downloadFile, errorMessage, qs } from '@/lib/api';
import { cn, fmtDateTime, isOverdue, isToday, orDash } from '@/lib/utils';
import { useBootstrap } from '@/store/bootstrap';
import { useCan } from '@/store/auth';
import { useViewContext } from '@/store/context';
import type { ApiList, Lead, ListView } from '@/types';
import { AssignModal, StageBadge, StatusBadge, useLeadInvalidate } from './shared';
import { CreateLeadModal } from './CreateLeadModal';

const BUILTIN: Record<string, string> = { contacted_today: 'Contacted Today', assigned_today: 'Assigned Today', all: 'All Leads', created_today: 'Created Today', followup_today: 'Follow-ups Today', overdue: 'Overdue', unassigned: 'Unassigned', today_list: 'Today List' };
const SYSTEM_COLS: { key: string; label: string; sortable?: boolean; always?: boolean; min?: number }[] = [
  { key: 'name', label: 'Name', sortable: true, always: true, min: 160 }, { key: 'phone', label: 'Phone', sortable: true, min: 120 }, { key: 'stage', label: 'Stage', min: 120 }, { key: 'status', label: 'Status', min: 120 },
  { key: 'owner', label: 'Owner', min: 150 }, { key: 'source', label: 'Source', min: 110 }, { key: 'city', label: 'City', min: 110 }, { key: 'priority', label: 'Priority', sortable: true, min: 90 }, { key: 'nextFollowUpAt', label: 'Next follow-up', sortable: true, min: 170 },
  { key: 'lastContactedAt', label: 'Last contacted', sortable: true, min: 170 }, { key: 'assignedAt', label: 'Assigned', sortable: true, min: 170 }, { key: 'remarks', label: 'Remarks', min: 200 }, { key: 'createdAt', label: 'Created', sortable: true, min: 170 }, { key: 'email', label: 'Email', min: 180 },
];
const DEFAULT_COLS = ['name', 'phone', 'stage', 'status', 'owner', 'source', 'nextFollowUpAt', 'lastContactedAt', 'createdAt'];
const COLS_KEY = 'lead-crm-columns-v2';
const FILTER_KEYS = ['ownerId', 'stageId', 'statusId', 'sourceId', 'teamId'] as const;

export default function LeadsPage() {
  const [sp, setSp] = useSearchParams(); const nav = useNavigate();
  const { boot } = useBootstrap(); const can = useCan(); const inv = useLeadInvalidate(); const ctx = useViewContext();
  const get = (k: string, d = '') => sp.get(k) ?? d;
  // Tabs come from Project Administration → Views (system tabs seeded; admins can rename/reorder/restrict). Fallback to built-ins.
  const views: ListView[] = boot.views.length ? boot.views.filter((v) => v.isActive !== false) : Object.entries(BUILTIN).map(([k, name], i) => ({ id: k, name, baseTab: k, columns: [], filters: {}, isDefault: k === 'all', userId: null, roles: [], teamIds: [], groupId: null, isActive: true, isSystem: true, order: i }));
  const defaultView = views.find((v) => v.isDefault) ?? views[0];
  const viewId = get('view', defaultView?.id ?? 'all');
  const view = views.find((v) => v.id === viewId) ?? defaultView;
  const tab = view?.baseTab && view.baseTab !== 'custom' ? view.baseTab : 'all';
  const viewFilters = (view?.filters ?? {}) as Record<string, string>;
  const page = Number(get('page', '1')); const limit = Number(get('limit', String(boot.org?.settings.defaultRowsPerPage ?? 100)));
  const sortBy = get('sortBy', 'createdAt'); const sortDir = get('sortDir', 'desc') as 'asc' | 'desc';
  const filters = { search: get('search'), ownerId: get('ownerId') || ctx.ownerId, stageId: get('stageId'), statusId: get('statusId'), sourceId: get('sourceId'), teamId: get('teamId') || ctx.teamId };
  const customFilters = useMemo(() => Object.fromEntries(Array.from(sp.entries()).filter(([k]) => k.startsWith('custom.'))), [sp]);
  const update = (patch: Record<string, string | undefined>, resetPage = true) => { const n = new URLSearchParams(sp); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); if (resetPage) n.delete('page'); setSp(n, { replace: true }); };
  const [search, setSearch] = useState(filters.search);
  useEffect(() => { setSearch(filters.search); }, [filters.search]);
  useEffect(() => { const t = setTimeout(() => { if (search !== filters.search) update({ search }); }, 350); return () => clearTimeout(t); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const params = { tab, page, limit, sortBy, sortDir, ...viewFilters, ...filters, ...customFilters };
  const list = useQuery({ queryKey: ['leads', params], queryFn: async () => (await api.get<ApiList<Lead>>(`/leads${qs(params)}`)).data, placeholderData: (prev) => prev });
  const countParams = { ...filters, ...customFilters };
  const counts = useQuery({ queryKey: ['lead-counts', countParams], queryFn: async () => (await api.get<{ data: Record<string, number> }>(`/leads/counts${qs(countParams)}`)).data.data, staleTime: 15_000 });

  // Column config: admin defaults (Project Administration → Lead Settings → Columns) unless the user customised.
  const orgCols = boot.org?.settings.leadColumns ?? [];
  const orgVisible = orgCols.length ? [...orgCols].sort((a, b) => a.order - b.order).filter((c) => c.visible).map((c) => c.key) : DEFAULT_COLS;
  const labelOverride = new Map(orgCols.filter((c) => c.label).map((c) => [c.key, c.label]));
  const [cols, setCols] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(COLS_KEY) || 'null') ?? orgVisible; } catch { return orgVisible; } });
  useEffect(() => { localStorage.setItem(COLS_KEY, JSON.stringify(cols)); }, [cols]);
  const listFields = boot.fields.filter((f) => f.showInList);
  const allCols = [...SYSTEM_COLS, ...boot.fields.map((f) => ({ key: `custom.${f.key}`, label: f.label, min: 140 }))].map((c) => ({ ...c, label: labelOverride.get(c.key) || c.label }));
  const groups = boot.org?.settings.columnGroups ?? [];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => { setSelected(new Set()); }, [viewId, page, filters.search, filters.ownerId, filters.stageId, filters.statusId, filters.sourceId, filters.teamId]);
  const rows = list.data?.data ?? [];
  const allSel = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allSel ? new Set() : new Set(rows.map((r) => r.id)));
  const [create, setCreate] = useState(false); const [assign, setAssign] = useState(false); const [filterDrawer, setFilterDrawer] = useState(false);
  const [bulk, setBulk] = useState<null | 'stage' | 'status' | 'source' | 'followup' | 'delete' | 'field'>(null);

  const sortIcon = (k: string) => (sortBy !== k ? <ArrowUpDown size={12} className="text-ink-3" /> : sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />);
  const onSort = (k: string) => update({ sortBy: k, sortDir: sortBy === k && sortDir === 'desc' ? 'asc' : 'desc' });
  const wa = (p: string) => `https://wa.me/${p.length === 10 ? '91' + p : p.replace(/\D/g, '')}`;

  const cell = (l: Lead, key: string) => {
    if (key.startsWith('custom.')) { const k = key.slice(7); return fieldValue(boot.fields.find((f) => f.key === k), l.customFields?.[k], boot.org?.currency); }
    switch (key) {
      case 'name': return <Link to={`/leads/${l.id}`} className="font-medium text-ink hover:text-primary flex items-center gap-2">{l.color && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: l.color }} />}{l.name || <span className="text-ink-3 italic">No name</span>}</Link>;
      case 'phone': return <span className="tabular-nums">{l.phone}</span>;
      case 'stage': return <StageBadge stage={l.stage} />;
      case 'status': return <StatusBadge status={l.status} />;
      case 'owner': return l.owner ? <span className="inline-flex items-center gap-1.5"><Avatar name={l.owner.name} color={l.owner.avatarColor} size={20} />{l.owner.name}</span> : <span className="text-warning">Unassigned</span>;
      case 'source': return orDash(l.source?.name);
      case 'priority': return <span className={cn('tabular-nums font-medium', l.priority >= 70 ? 'text-danger' : l.priority >= 40 ? 'text-warning' : 'text-ink-2')}>{l.priority || '—'}</span>;
      case 'nextFollowUpAt': return l.nextFollowUpAt ? <span className={cn('tabular-nums', isOverdue(l.nextFollowUpAt) && 'text-danger font-medium', isToday(l.nextFollowUpAt) && 'text-primary font-medium')}>{fmtDateTime(l.nextFollowUpAt)}</span> : '—';
      case 'lastContactedAt': case 'assignedAt': case 'createdAt': return <span className="tabular-nums text-ink-2">{fmtDateTime(l[key])}</span>;
      case 'remarks': return <span className="block max-w-[260px] truncate text-ink-2" title={l.remarks}>{orDash(l.remarks)}</span>;
      default: return orDash((l as unknown as Record<string, unknown>)[key]);
    }
  };

  const exportCsv = async () => { try { await downloadFile(`/leads/export${qs({ ...params, ids: selected.size ? Array.from(selected) : undefined })}`, `leads-${new Date().toISOString().slice(0, 10)}.csv`); } catch (e) { toast.error(errorMessage(e)); } };
  const activeFilters = Object.entries({ ...Object.fromEntries(FILTER_KEYS.map((k) => [k, get(k)])), ...customFilters }).filter(([, v]) => v);
  const filterControls = (vertical: boolean) => (<>
    {can('lead.assign', 'report.view_team', 'lead.view_team') && <PillSelect label="Owner" value={get('ownerId')} onChange={(v) => update({ ownerId: v })} options={boot.users.map((u) => ({ value: u.id, label: u.name }))} />}
    <PillSelect label="Stage" value={get('stageId')} onChange={(v) => update({ stageId: v })} options={boot.stages.map((s) => ({ value: s.id, label: s.name }))} />
    <PillSelect label="Status" value={get('statusId')} onChange={(v) => update({ statusId: v })} options={boot.statuses.map((s) => ({ value: s.id, label: s.name }))} />
    <PillSelect label="Source" value={get('sourceId')} onChange={(v) => update({ sourceId: v })} options={boot.sources.map((s) => ({ value: s.id, label: s.name }))} />
    {boot.teams.length > 1 && <PillSelect label="Team" value={get('teamId')} onChange={(v) => update({ teamId: v })} options={boot.teams.map((t) => ({ value: t.id, label: t.name }))} />}
    {listFields.filter((f) => f.type === 'select').map((f) => <PillSelect key={f.key} label={f.label} value={customFilters[`custom.${f.key}`] ?? ''} onChange={(v) => update({ [`custom.${f.key}`]: v })} options={f.options.map((o) => ({ value: o, label: o }))} />)}
    {activeFilters.length > 0 && !vertical && <button className="text-[12.5px] text-ink-3 hover:text-ink inline-flex items-center gap-1 h-7" onClick={() => update(Object.fromEntries(activeFilters.map(([k]) => [k, undefined])))}><X size={13} /> Clear filters</button>}
  </>);

  const bulkActions = [
    { key: 'assign', label: 'Assign', icon: UserPlus, show: can('lead.bulk_assign', 'lead.assign'), run: () => setAssign(true) },
    { key: 'stage', label: 'Update stage', icon: Layers, show: can('lead.bulk_update'), run: () => setBulk('stage') },
    { key: 'status', label: 'Update status', icon: Tag, show: can('lead.bulk_update'), run: () => setBulk('status') },
    { key: 'followup', label: 'Set follow-up', icon: CalendarClock, show: can('lead.bulk_update'), run: () => setBulk('followup') },
    { key: 'source', label: 'Update source', icon: SlidersHorizontal, show: can('lead.bulk_update') && can('lead.update_source'), run: () => setBulk('source') },
    { key: 'field', label: 'Update field', icon: Pencil, show: can('lead.bulk_update'), run: () => setBulk('field') },
    { key: 'today', label: 'Add to Today list', icon: ListTodo, show: true, run: () => todayList.mutate() },
    { key: 'export', label: 'Export selected', icon: Download, show: can('lead.export'), run: exportCsv },
    { key: 'delete', label: 'Delete', icon: Trash2, show: can('lead.bulk_delete'), danger: true, run: () => setBulk('delete') },
  ].filter((a) => a.show);
  const todayList = useMutation({ mutationFn: () => api.post('/leads/bulk', { ids: Array.from(selected), action: 'today_list', payload: { add: true } }), onSuccess: (r) => { toast.success(`Added ${r.data.data.affected} lead(s) to Today list`); inv(); setSelected(new Set()); }, onError: (e) => toast.error(errorMessage(e)) });
  const primary = bulkActions.slice(0, 4), overflow = bulkActions.slice(4);

  return (
    <div className="min-w-0">
      <PageHeader title="Leads" subtitle={`${counts.data?.[tab] ?? counts.data?.all ?? '…'} leads in your view${ctx.label ? ` · ${ctx.label}` : ''}`} actions={<>
        {can('lead.import') && <Button size="sm" onClick={() => nav('/admin/imports')}><Upload size={15} /> <span className="hidden sm:inline">Import</span></Button>}
        {can('lead.export') && <Button size="sm" onClick={exportCsv}><Download size={15} /> <span className="hidden sm:inline">Export</span></Button>}
        {can('lead.create') && <Button size="sm" variant="primary" onClick={() => setCreate(true)}><Plus size={15} /> Create lead</Button>}
      </>} />

      <Tabs value={view?.id ?? 'all'} onChange={(v) => update({ view: v === defaultView?.id ? undefined : v })} tabs={views.map((v) => ({ key: v.id, label: v.name, count: counts.data?.[v.baseTab === 'custom' ? 'all' : v.baseTab] }))} className="mb-3" />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative w-full sm:w-[280px]"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email, remarks" className="pl-8 h-10 sm:h-8 text-[13px]" /></div>
        <div className="hidden md:flex flex-wrap items-center gap-2">{filterControls(false)}</div>
        <div className="flex items-center gap-2 md:ml-auto w-full md:w-auto">
          <Button size="sm" className="md:hidden h-10 flex-1" onClick={() => setFilterDrawer(true)}><Filter size={14} /> Filters{activeFilters.length ? ` (${activeFilters.length})` : ''}</Button>
          <Menu align="right" className="flex-1 md:flex-none" trigger={() => <Button size="sm" className="h-10 md:h-8 w-full"><Columns3 size={14} /> Columns</Button>}>
            <div className="px-3 py-1.5 max-h-72 overflow-y-auto scroll-thin min-w-[220px]">
              {groups.length > 0 ? [...groups].sort((a, b) => a.order - b.order).map((g) => <div key={g.name} className="mb-2"><p className="text-[11px] font-semibold text-ink-3 mb-1">{g.name}</p>{g.columns.map((k) => { const c = allCols.find((x) => x.key === k); return c ? <Checkbox key={k} className="block mb-1" checked={cols.includes(k)} disabled={SYSTEM_COLS.find((s) => s.key === k)?.always} onChange={(v) => setCols((cs) => v ? [...cs, k] : cs.filter((x) => x !== k))} label={c.label} /> : null; })}</div>) : null}
              {(groups.length ? allCols.filter((c) => !groups.some((g) => g.columns.includes(c.key))) : allCols).map((c) => <Checkbox key={c.key} className="block mb-1" checked={cols.includes(c.key)} disabled={SYSTEM_COLS.find((s) => s.key === c.key)?.always} onChange={(v) => setCols((cs) => v ? [...cs, c.key] : cs.filter((x) => x !== c.key))} label={c.label} />)}
            </div>
            <div className="border-t border-line px-3 py-1.5"><button className="text-[12.5px] text-primary" onClick={() => setCols(orgVisible)}>Reset to default</button></div>
          </Menu>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mb-2 card flex items-center gap-1 px-2 h-12 overflow-hidden" role="toolbar" aria-label="Bulk actions">
          <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-primary text-white text-[13px] font-semibold tabular-nums shrink-0"><ListChecks size={14} /> {selected.size} selected</span>
          <span className="w-px h-6 bg-line mx-1 shrink-0" />
          <div className="hidden lg:flex items-center gap-0.5 min-w-0">{primary.map((a, i) => <span key={a.key} className="flex items-center"><button onClick={a.run} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink whitespace-nowrap"><a.icon size={14} />{a.label}</button>{i < primary.length - 1 && <span className="w-px h-4 bg-line" />}</span>)}</div>
          {overflow.length > 0 && <Menu className="hidden lg:block" trigger={() => <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"><MoreHorizontal size={14} /> More</button>}>{(close) => overflow.map((a) => <button key={a.key} className={cn('menu-item', a.danger && 'text-danger')} onClick={() => { close(); a.run(); }}><a.icon size={14} /> {a.label}</button>)}</Menu>}
          <Menu className="lg:hidden" trigger={() => <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] font-medium bg-surface-2 text-ink"><SlidersHorizontal size={14} /> Actions</button>}>{(close) => bulkActions.map((a) => <button key={a.key} className={cn('menu-item', a.danger && 'text-danger')} onClick={() => { close(); a.run(); }}><a.icon size={14} /> {a.label}</button>)}</Menu>
          <button className="ml-auto h-8 w-8 grid place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink shrink-0" onClick={() => setSelected(new Set())} aria-label="Clear selection" title="Clear selection"><X size={15} /></button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-330px)] scroll-thin">
          <table className="border-collapse min-w-full">
            <thead><tr>
              <th className="th sticky-col w-10 !z-20"><Checkbox checked={allSel} indeterminate={!allSel && selected.size > 0} onChange={toggleAll} /></th>
              {cols.map((k, i) => { const c = allCols.find((x) => x.key === k); if (!c) return null; const s = SYSTEM_COLS.find((x) => x.key === k)?.sortable; return <th key={k} style={{ minWidth: c.min ?? 120, left: i === 0 ? 40 : undefined }} className={cn('th', i === 0 && 'sticky-col !z-20', s && 'cursor-pointer hover:text-ink')} onClick={() => s && onSort(k)}><span className="inline-flex items-center gap-1">{c.label}{s && sortIcon(k)}</span></th>; })}
              <th className="th w-24"></th>
            </tr></thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className={cn('hover:bg-surface-2/70 transition-colors', selected.has(l.id) && 'bg-primary-soft/60')}>
                  <td className={cn('td sticky-col', selected.has(l.id) && '!bg-primary-soft')}><Checkbox checked={selected.has(l.id)} onChange={(v) => setSelected((s) => { const n = new Set(s); v ? n.add(l.id) : n.delete(l.id); return n; })} /></td>
                  {cols.map((k, i) => <td key={k} style={{ left: i === 0 ? 40 : undefined }} className={cn('td', i === 0 && 'sticky-col', i === 0 && selected.has(l.id) && '!bg-primary-soft')}>{cell(l, k)}</td>)}
                  <td className="td"><span className="inline-flex gap-1.5 text-ink-3">{can('lead.communicate') && <><a href={`tel:${l.phone}`} title="Call" className="h-7 w-7 grid place-items-center rounded hover:bg-primary-soft hover:text-primary"><Phone size={14} /></a><a href={wa(l.phone)} target="_blank" rel="noreferrer" title="WhatsApp" className="h-7 w-7 grid place-items-center rounded hover:bg-success/10 hover:text-success"><MessageCircle size={14} /></a>{l.email && <a href={`mailto:${l.email}`} title="Email" className="h-7 w-7 grid place-items-center rounded hover:bg-surface-2 hover:text-ink"><Mail size={14} /></a>}</>}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.isLoading && <div className="py-16 flex justify-center"><Spinner /></div>}
          {!list.isLoading && !rows.length && <Empty title={tab === 'all' && !activeFilters.length && !filters.search ? 'No leads yet' : 'No leads match'} hint={tab === 'all' && !activeFilters.length ? 'Create your first lead or import a CSV to get started.' : 'Try another tab or clear the filters.'} action={tab === 'all' && can('lead.create') && !activeFilters.length ? <Button variant="primary" onClick={() => setCreate(true)}><Plus size={15} /> Create lead</Button> : undefined} />}
        </div>
        <div className="px-3 py-2 border-t border-line bg-surface-2/40"><Pagination page={page} totalPages={list.data?.meta.totalPages ?? 1} total={list.data?.meta.total ?? 0} limit={limit} onPage={(p) => update({ page: String(p) }, false)} onLimit={(l) => update({ limit: String(l) })} /></div>
      </div>

      <Drawer open={filterDrawer} onClose={() => setFilterDrawer(false)} title="Filters" description="Narrow the lead list" width="max-w-sm" footer={<><Button onClick={() => { update(Object.fromEntries(activeFilters.map(([k]) => [k, undefined]))); }}>Clear filters</Button><Button variant="primary" onClick={() => setFilterDrawer(false)}>Apply filters</Button></>}>
        <div className="flex flex-col gap-3 [&_.pill]:h-11 [&_.pill]:w-full [&_.pill_select]:flex-1">{filterControls(true)}</div>
      </Drawer>
      <CreateLeadModal open={create} onClose={() => setCreate(false)} />
      <AssignModal open={assign} onClose={() => setAssign(false)} leadIds={Array.from(selected)} onDone={() => setSelected(new Set())} />
      <BulkModal kind={bulk} onClose={() => setBulk(null)} ids={Array.from(selected)} onDone={() => setSelected(new Set())} />
    </div>
  );
}

function BulkModal({ kind, onClose, ids, onDone }: { kind: null | 'stage' | 'status' | 'source' | 'followup' | 'delete' | 'field'; onClose: () => void; ids: string[]; onDone: () => void }) {
  const { boot } = useBootstrap(); const inv = useLeadInvalidate();
  const [value, setValue] = useState(''); const [remarks, setRemarks] = useState(''); const [fieldKey, setFieldKey] = useState('');
  useEffect(() => { setValue(''); setRemarks(''); setFieldKey(''); }, [kind]);
  const m = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = kind === 'stage' ? { stageId: value, remarks } : kind === 'status' ? { statusId: value || null, remarks } : kind === 'source' ? { sourceId: value || null } : kind === 'followup' ? { nextFollowUpAt: value ? new Date(value).toISOString() : null } : kind === 'field' ? { key: fieldKey, value } : {};
      return api.post('/leads/bulk', { ids, action: kind, payload });
    },
    onSuccess: (r) => { const d = r.data.data; toast.success(`${d.affected} of ${d.requested} updated${d.errors?.length ? `; ${d.errors.length} skipped: ${d.errors[0].message}` : ''}`); inv(); onDone(); onClose(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const titles = { stage: 'Update stage', status: 'Update status', source: 'Update source', followup: 'Set follow-up', delete: 'Delete leads', field: 'Update a field' };
  if (!kind) return null;
  const fieldDef = boot.fields.find((f) => `custom.${f.key}` === fieldKey);
  return (
    <Modal open onClose={onClose} title={`${titles[kind]} · ${ids.length} leads`} width="max-w-md" footer={<><Button onClick={onClose}>Cancel</Button><Button variant={kind === 'delete' ? 'danger' : 'primary'} loading={m.isPending} onClick={() => m.mutate()} disabled={kind !== 'delete' && kind !== 'followup' && kind !== 'status' && kind !== 'source' && !value}>{kind === 'delete' ? 'Delete' : 'Apply'}</Button></>}>
      <div className="space-y-3">
        {kind === 'stage' && <><Field label="New stage"><Select value={value} onChange={(e) => setValue(e.target.value)}><option value="">Select…</option>{boot.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field><p className="text-[12.5px] text-ink-3">Stage rules still apply — leads missing mandatory fields will be skipped and reported.</p></>}
        {kind === 'status' && <Field label="New status"><Select value={value} onChange={(e) => setValue(e.target.value)}><option value="">— Clear —</option>{boot.statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>}
        {kind === 'source' && <Field label="New source"><Select value={value} onChange={(e) => setValue(e.target.value)}><option value="">— Clear —</option>{boot.sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>}
        {(kind === 'stage' || kind === 'status') && <Field label="Remark"><Input value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>}
        {kind === 'followup' && <Field label="Next follow-up" hint="Leave empty to reset"><Input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} /></Field>}
        {kind === 'field' && <>
          <Field label="Field"><Select value={fieldKey} onChange={(e) => { setFieldKey(e.target.value); setValue(''); }}><option value="">Select…</option><optgroup label="Lead">{['city', 'state', 'country', 'language', 'remarks'].map((k) => <option key={k} value={k}>{k}</option>)}</optgroup><optgroup label="Custom">{boot.fields.map((f) => <option key={f.key} value={`custom.${f.key}`}>{f.label}</option>)}</optgroup></Select></Field>
          {fieldKey && <Field label="Value">{fieldDef?.type === 'select' ? <Select value={value} onChange={(e) => setValue(e.target.value)}><option value="">Select…</option>{fieldDef.options.map((o) => <option key={o} value={o}>{o}</option>)}</Select> : <Input value={value} onChange={(e) => setValue(e.target.value)} />}</Field>}
        </>}
        {kind === 'delete' && <p className="text-[13.5px] text-ink-2">Leads are soft-deleted and can be restored by an admin. Their history is kept.</p>}
      </div>
    </Modal>
  );
}
