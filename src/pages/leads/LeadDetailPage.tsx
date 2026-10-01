import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ChevronDown, Pencil, Trash2, X } from 'lucide-react';
import { Avatar, Badge, Button, Confirm, Empty, Field, Input, Menu, Select, Spinner, Tabs, Textarea } from '@/components/ui';
import { DynamicInput, fieldValue } from '@/components/fields/DynamicField';
import { api, errorMessage } from '@/lib/api';
import { cn, fmtDateTime, isOverdue, isToday, orDash } from '@/lib/utils';
import { useBootstrap } from '@/store/bootstrap';
import { useCan } from '@/store/auth';
import type { FieldDef, Lead, Stage } from '@/types';
import { AssignModal, FollowUpModal, StageModal, StatusBadge, StatusModal, useLeadInvalidate } from './shared';
import { ActivitiesTab, CallsTab, FilesTab, NotesTab, TasksTab } from './LeadDetailTabs';
import { QuickAccessBar, TopUpCard } from './QuickAccess';

const FIXED_TABS = ['Activities', 'Interactions', 'Files', 'Notes', 'Tasks'] as const;

export default function LeadDetailPage() {
  const { id = '' } = useParams(); const nav = useNavigate(); const [sp, setSp] = useSearchParams();
  const [openCall, setOpenCall] = useState(sp.get('call') === '1'); const [openTopUp, setOpenTopUp] = useState(sp.get('topup') === '1');
  useEffect(() => { if (sp.get('call') || sp.get('topup')) { const n = new URLSearchParams(sp); n.delete('call'); n.delete('topup'); setSp(n, { replace: true }); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const { boot } = useBootstrap(); const can = useCan(); const inv = useLeadInvalidate();
  const q = useQuery({ queryKey: ['lead', id], queryFn: async () => (await api.get<{ data: Lead }>(`/leads/${id}`)).data.data, enabled: !!id });
  const lead = q.data;
  const customTabs = useMemo(() => Array.from(new Set(boot.fields.map((f) => f.tab))).filter((t) => t !== 'Basic Info'), [boot.fields]);
  const tabs = ['Basic Info', ...customTabs, ...FIXED_TABS];
  const [tab, setTab] = useState<string>('Basic Info');
  const [toStage, setToStage] = useState<Stage | null>(null); const [assign, setAssign] = useState(false); const [status, setStatus] = useState(false); const [follow, setFollow] = useState(false); const [del, setDel] = useState(false);
  const remove = useMutation({ mutationFn: () => api.delete(`/leads/${id}`), onSuccess: () => { toast.success('Lead deleted'); inv(); nav('/leads'); }, onError: (e) => toast.error(errorMessage(e)) });

  if (q.isLoading) return <div className="py-20 flex justify-center"><Spinner /></div>;
  if (!lead) return <Empty title="Lead not found" hint="It may have been deleted or is outside your visibility." action={<Button onClick={() => nav('/leads')}>Back to leads</Button>} />;
  const counts = lead.counts ?? { notes: 0, files: 0, tasks: 0, calls: 0 };
  const canEdit = lead.canEdit !== false; const showStageBar = boot.org?.settings.showLeadStageBar !== false;
  const tabCount: Record<string, number | undefined> = { Files: counts.files, Notes: counts.notes, Tasks: counts.tasks, Interactions: counts.calls };

  return (
    <div className="pb-24">
      <div className="text-[12.5px] text-ink-3 mb-2"><Link to="/leads" className="hover:text-ink">Leads</Link><span className="mx-1.5">/</span><span className="text-ink-2">{lead.name || lead.phone}</span></div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={lead.name || lead.phone} color={lead.owner?.avatarColor ?? '#1a3a5c'} size={42} />
          <div className="min-w-0"><h1 className="text-[20px] font-semibold leading-7 truncate">{lead.name || <span className="text-ink-3 italic">No name</span>}</h1>
            <p className="text-[13px] text-ink-2 flex flex-wrap items-center gap-x-2"><span className="tabular-nums">{lead.phone}</span>{lead.email && <span>· {lead.email}</span>}<span>·</span><StatusBadge status={lead.status} />{lead.inTodayList && <Badge color="#185FA5" soft>Today list</Badge>}</p></div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!canEdit && <Badge>View only</Badge>}
          {can('lead.update_status') && <Button onClick={() => setStatus(true)}>Update status</Button>}
          <Button onClick={() => setFollow(true)} className={cn(isOverdue(lead.nextFollowUpAt) && 'border-danger text-danger')}>{lead.nextFollowUpAt ? `Follow-up ${isToday(lead.nextFollowUpAt) ? 'today' : fmtDateTime(lead.nextFollowUpAt)}` : 'Schedule follow-up'}</Button>
          {can('lead.assign') && <Button variant="navy" onClick={() => setAssign(true)}>{lead.owner ? `Owner: ${lead.owner.name}` : 'Assign owner'} <ChevronDown size={14} /></Button>}
          {can('lead.delete') && <Menu align="right" trigger={() => <Button size="icon" aria-label="More"><ChevronDown size={15} /></Button>}>{(close) => <button className="menu-item text-danger" onClick={() => { close(); setDel(true); }}><Trash2 size={14} /> Delete lead</button>}</Menu>}
        </div>
      </div>

      {showStageBar && <StageBar stages={boot.stages} currentId={lead.stageId} onPick={(s) => can('lead.update_stage') && setToStage(s)} />}
      <TopUpCard lead={lead} onOpen={() => setOpenTopUp(true)} />

      <div className="grid lg:grid-cols-[300px_1fr] gap-4 mt-4 items-start">
        <LeadCard lead={lead} />
        <div className="card min-w-0">
          <Tabs value={tab} onChange={setTab} tabs={tabs.map((t) => ({ key: t, label: t, count: tabCount[t] }))} className="px-3" />
          <div className="p-4">
            {tab === 'Basic Info' && <DetailsTab lead={lead} fields={boot.fields.filter((f) => f.tab === 'Basic Info')} includeSystem canEdit={canEdit} />}
            {customTabs.includes(tab) && <DetailsTab lead={lead} fields={boot.fields.filter((f) => f.tab === tab)} canEdit={canEdit} />}
            {tab === 'Activities' && <ActivitiesTab lead={lead} />}
            {tab === 'Interactions' && <CallsTab lead={lead} onLogCall={() => setOpenCall(true)} />}
            {tab === 'Files' && <FilesTab lead={lead} />}
            {tab === 'Notes' && <NotesTab lead={lead} />}
            {tab === 'Tasks' && <TasksTab lead={lead} />}
          </div>
        </div>
      </div>

      <QuickAccessBar lead={lead} openCall={openCall} onOpenCall={setOpenCall} openTopUp={openTopUp} onOpenTopUp={setOpenTopUp} />
      <StageModal open={!!toStage} onClose={() => setToStage(null)} lead={lead} toStage={toStage} />
      <AssignModal open={assign} onClose={() => setAssign(false)} leadIds={[lead.id]} current={lead.ownerId} />
      <StatusModal open={status} onClose={() => setStatus(false)} lead={lead} />
      <FollowUpModal open={follow} onClose={() => setFollow(false)} lead={lead} />
      <Confirm open={del} onClose={() => setDel(false)} onConfirm={() => remove.mutate()} loading={remove.isPending} danger title="Delete this lead?" confirmLabel="Delete" body="The lead is hidden from all lists. An admin can restore it later; notes, calls and documents are kept." />
    </div>
  );
}

/** Chevron pipeline bar — the current stage is filled, earlier stages tinted, later ones outlined. */
function StageBar({ stages, currentId, onPick }: { stages: Stage[]; currentId: string | null; onPick: (s: Stage) => void }) {
  const idx = stages.findIndex((s) => s.id === currentId);
  return (
    <div className="flex overflow-x-auto scroll-thin -mx-1 px-1" role="list" aria-label="Pipeline stages">
      {stages.map((s, i) => {
        const state = i === idx ? 'current' : i < idx ? 'done' : 'todo';
        const lostOrWon = s.isWon || s.isLost;
        return (
          <button key={s.id} role="listitem" disabled={s.id === currentId} onClick={() => onPick(s)} title={s.id === currentId ? 'Current stage' : `Move to ${s.name}`}
            className={cn('relative flex-1 min-w-[112px] h-10 text-[12.5px] font-medium transition-colors first:rounded-l-md last:rounded-r-md', i > 0 && '-ml-[10px] pl-5', 'pr-3 disabled:cursor-default',
              state === 'current' ? 'text-white' : state === 'done' ? 'text-ink' : 'text-ink-2 hover:text-ink')}
            style={{ clipPath: i === stages.length - 1 ? undefined : 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)', zIndex: stages.length - i,
              backgroundColor: state === 'current' ? s.color : state === 'done' ? `${s.color}33` : 'var(--surface)', boxShadow: state === 'todo' ? 'inset 0 0 0 1px var(--border)' : undefined,
              borderColor: lostOrWon && state !== 'current' ? s.color : undefined }}>
            {s.name}
          </button>
        );
      })}
    </div>
  );
}

/** Dark navy summary card with Primary / Secondary toggle and quality score. */
function LeadCard({ lead }: { lead: Lead }) {
  const [view, setView] = useState<'primary' | 'secondary'>('primary');
  const rows = view === 'primary'
    ? [['Phone', lead.phone], ['Email', orDash(lead.email)], ['City', orDash(lead.city)], ['Owner', lead.owner?.name ?? 'Unassigned'], ['Team', orDash(lead.team?.name)], ['Source', orDash(lead.source?.name)], ['Stage', orDash(lead.stage?.name)], ['Last contacted', fmtDateTime(lead.lastContactedAt)], ['Created', fmtDateTime(lead.createdAt)]]
    : [['Alt phone', orDash(lead.altPhone)], ['State', orDash(lead.state)], ['Country', orDash(lead.country)], ['Language', orDash(lead.language)], ['Tags', lead.tags?.length ? lead.tags.join(', ') : '—'], ['Created by', lead.creator?.name ?? '—'], ['Assigned at', fmtDateTime(lead.assignedAt)], ['First contacted', fmtDateTime(lead.firstContactedAt)], ['Contacts', String(lead.contactCount)], ['Updated', fmtDateTime(lead.updatedAt)]];
  const score = lead.qualityScore ?? 0; const r = 22, c = 2 * Math.PI * r;
  return (
    <aside className="rounded-lg bg-navy text-white p-4 lg:sticky lg:top-[72px]">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex rounded-md bg-white/10 p-0.5 text-[12px]">{(['primary', 'secondary'] as const).map((v) => <button key={v} onClick={() => setView(v)} className={cn('px-2.5 h-6 rounded', view === v ? 'bg-white text-navy font-medium' : 'text-white/70 hover:text-white')}>{v === 'primary' ? 'Primary' : 'Secondary'}</button>)}</div>
        <div className="relative h-12 w-12" title="Quality score: completeness, engagement and pipeline progress">
          <svg viewBox="0 0 52 52" className="h-12 w-12 -rotate-90"><circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="4" /><circle cx="26" cy="26" r={r} fill="none" stroke={score >= 70 ? '#34B37A' : score >= 40 ? '#D19A3A' : '#E05A5A'} strokeWidth="4" strokeDasharray={c} strokeDashoffset={c - (c * score) / 100} strokeLinecap="round" /></svg>
          <span className="absolute inset-0 grid place-items-center text-[12px] font-semibold tabular-nums">{score}</span>
        </div>
      </div>
      <dl className="space-y-2.5">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3 text-[13px]"><dt className="text-white/55 shrink-0">{k}</dt><dd className="text-right truncate tabular-nums" title={v}>{v}</dd></div>)}</dl>
      {lead.remarks && <div className="mt-4 pt-3 border-t border-white/10"><p className="text-[11.5px] text-white/55 mb-1">Latest remark</p><p className="text-[13px] leading-5 whitespace-pre-wrap">{lead.remarks}</p></div>}
    </aside>
  );
}

const SYSTEM_FIELDS: { key: keyof Lead; label: string; type?: 'text' | 'email' | 'tel' | 'textarea' }[] = [
  { key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone', type: 'tel' }, { key: 'altPhone', label: 'Alternate phone', type: 'tel' }, { key: 'email', label: 'Email', type: 'email' },
  { key: 'city', label: 'City' }, { key: 'state', label: 'State' }, { key: 'country', label: 'Country' }, { key: 'language', label: 'Language' },
];

/** Section-grouped read view with inline editing for system + custom fields. */
function DetailsTab({ lead, fields, includeSystem, canEdit = true }: { lead: Lead; fields: FieldDef[]; includeSystem?: boolean; canEdit?: boolean }) {
  const can = useCan(); const inv = useLeadInvalidate(); const { boot } = useBootstrap();
  const [editing, setEditing] = useState(false); const [sys, setSys] = useState<Partial<Lead>>({}); const [custom, setCustom] = useState<Record<string, unknown>>({}); const [sourceId, setSourceId] = useState(lead.sourceId ?? '');
  const sections = useMemo(() => { const m = new Map<string, FieldDef[]>(); fields.forEach((f) => m.set(f.section, [...(m.get(f.section) ?? []), f])); return Array.from(m.entries()); }, [fields]);
  const start = () => { setSys({}); setCustom({}); setSourceId(lead.sourceId ?? ''); setEditing(true); };
  const save = useMutation({
    mutationFn: () => api.patch(`/leads/${lead.id}`, { ...sys, ...(includeSystem && sourceId !== (lead.sourceId ?? '') ? { sourceId: sourceId || null } : {}), customFields: Object.keys(custom).length ? custom : undefined }),
    onSuccess: () => { toast.success('Saved'); setEditing(false); inv(lead.id); }, onError: (e) => toast.error(errorMessage(e)),
  });
  if (!fields.length && !includeSystem) return <Empty title="No fields in this tab" hint="An admin can add fields under Admin → Lead fields." />;
  const val = (f: FieldDef) => (f.key in custom ? custom[f.key] : lead.customFields?.[f.key]);
  return (
    <div className="space-y-5">
      <div className="flex justify-end -mt-1 -mb-3">{can('lead.edit') && canEdit && (editing ? <span className="flex gap-2"><Button size="sm" onClick={() => setEditing(false)}><X size={14} /> Cancel</Button><Button size="sm" variant="primary" loading={save.isPending} onClick={() => save.mutate()}><Check size={14} /> Save</Button></span> : <Button size="sm" variant="ghost" onClick={start}><Pencil size={14} /> Edit</Button>)}</div>
      {includeSystem && (
        <Section title="Contact">
          {SYSTEM_FIELDS.map((f) => <Row key={f.key} label={f.label}>{editing ? <Input sm value={String(sys[f.key] ?? lead[f.key] ?? '')} type={f.type} onChange={(e) => setSys((s) => ({ ...s, [f.key]: e.target.value }))} /> : <span className={f.type === 'tel' ? 'tabular-nums' : ''}>{orDash(lead[f.key])}</span>}</Row>)}
          <Row label="Source">{editing && can('lead.update_source') ? <Select sm value={sourceId} onChange={(e) => setSourceId(e.target.value)}><option value="">—</option>{boot.sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select> : orDash(lead.source?.name)}</Row>
          <Row label="Remarks" full>{editing ? <Textarea value={String(sys.remarks ?? lead.remarks ?? '')} onChange={(e) => setSys((s) => ({ ...s, remarks: e.target.value }))} className="min-h-[56px]" /> : <span className="whitespace-pre-wrap">{orDash(lead.remarks)}</span>}</Row>
        </Section>)}
      {sections.map(([title, fs]) => <Section key={title} title={title}>{fs.map((f) => <Row key={f.key} label={f.label} full={f.type === 'textarea' || f.type === 'multiselect'}>{editing && !f.readOnly ? <DynamicInput sm def={f} value={val(f)} onChange={(v) => setCustom((c) => ({ ...c, [f.key]: v }))} /> : <span className={['currency', 'number', 'percent', 'date', 'datetime'].includes(f.type) ? 'tabular-nums' : ''}>{fieldValue(f, lead.customFields?.[f.key], boot.org?.currency)}</span>}</Row>)}</Section>)}
    </div>
  );
}
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <section><h3 className="text-[12.5px] font-semibold text-ink-2 pb-1.5 mb-2 border-b border-line">{title}</h3><dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">{children}</dl></section>;
const Row = ({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) => <div className={cn('grid grid-cols-[130px_1fr] gap-2 items-center text-[13.5px]', full && 'sm:col-span-2')}><dt className="text-ink-3">{label}</dt><dd className="min-w-0 truncate">{children}</dd></div>;
