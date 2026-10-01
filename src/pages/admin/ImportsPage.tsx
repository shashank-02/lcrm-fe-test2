import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, RefreshCw, Upload } from 'lucide-react';
import { Badge, Button, Checkbox, Empty, Field, Modal, Select, Spinner, Tabs } from '@/components/ui';
import { api, downloadFile, errorMessage } from '@/lib/api';
import { cn, fmtDateTime } from '@/lib/utils';
import { useBootstrap } from '@/store/bootstrap';
import type { ImportJob } from '@/types';

interface Preview { headers: string[]; sample: Record<string, string>[]; suggestedMapping: Record<string, string> }
interface Targets { system: { key: string; label: string; type: string }[]; custom: { key: string; label: string; type: string }[] }
const STATUS_COLOR: Record<string, string> = { pending: '#9CA3AF', processing: '#185FA5', completed: '#1B8A5A', failed: '#C23B3B' };

export default function ImportsPage() {
  const [tab, setTab] = useState<'new' | 'history'>('new');
  const [viewJob, setViewJob] = useState<string | null>(null);
  return (
    <div>
      <h2 className="text-[16px] font-semibold mb-3">Bulk import</h2>
      <Tabs tabs={[{ key: 'new', label: 'Import CSV' }, { key: 'history', label: 'Import history' }]} value={tab} onChange={setTab} className="mb-4" />
      {tab === 'new' ? <Wizard onStarted={(id) => { setTab('history'); setViewJob(id); }} /> : <History onView={setViewJob} />}
      <JobModal id={viewJob} onClose={() => setViewJob(null)} />
    </div>
  );
}

function Wizard({ onStarted }: { onStarted: (id: string) => void }) {
  const { boot } = useBootstrap();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState<Preview | null>(null); const [mapping, setMapping] = useState<Record<string, string>>({});
  const [opts, setOpts] = useState({ importType: 'create', stageId: '', statusId: '', sourceId: '', ownerId: '', teamId: '', applyAssignmentRules: true });
  const targets = useQuery({ queryKey: ['import-targets'], queryFn: async () => (await api.get<{ data: Targets }>('/imports/targets')).data.data });
  const doPreview = useMutation({ mutationFn: async (f: File) => { const fd = new FormData(); fd.append('file', f); return (await api.post<{ data: Preview }>('/imports/preview', fd)).data.data; }, onSuccess: (p) => { setPreview(p); setMapping(p.suggestedMapping); }, onError: (e) => { toast.error(errorMessage(e)); setFile(null); } });
  const start = useMutation({ mutationFn: async () => { const fd = new FormData(); fd.append('file', file!); fd.append('mapping', JSON.stringify(mapping)); fd.append('importType', opts.importType); fd.append('applyAssignmentRules', String(opts.applyAssignmentRules)); (['stageId', 'statusId', 'sourceId', 'ownerId', 'teamId'] as const).forEach((k) => { if (opts[k]) fd.append(k, opts[k]); }); return (await api.post<{ data: ImportJob }>('/imports', fd)).data.data; }, onSuccess: (job) => { toast.success('Import started'); onStarted(job.id); }, onError: (e) => toast.error(errorMessage(e)) });
  const pick = (f: File | null) => { setFile(f); setPreview(null); if (f) doPreview.mutate(f); };
  const hasPhone = Object.values(mapping).includes('phone');
  const all = [...(targets.data?.system ?? []), ...(targets.data?.custom ?? [])];
  const used = new Set(Object.values(mapping).filter(Boolean));
  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
      <div className="space-y-4">
        <div className={cn('card p-6 text-center border-dashed', !file && 'hover:border-primary cursor-pointer')} onClick={() => !file && fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0] ?? null); }}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          <FileSpreadsheet size={28} className="mx-auto text-ink-3 mb-2" />
          {file ? <><p className="font-medium">{file.name}</p><p className="text-[12.5px] text-ink-3">{(file.size / 1024).toFixed(1)} KB · {doPreview.isPending ? 'reading…' : `${preview?.headers.length ?? 0} columns`}</p><Button size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); pick(null); }}>Choose another file</Button></> : <><p className="font-medium">Drop a CSV here or click to choose</p><p className="text-[12.5px] text-ink-3 mt-1">First row must be the header. Up to 50,000 rows. Phone is the only required column.</p></>}
        </div>
        {preview && (
          <div className="card overflow-auto">
            <table className="w-full"><thead><tr><th className="th">CSV column</th><th className="th">Sample values</th><th className="th w-[260px]">Import as</th></tr></thead>
              <tbody>{preview.headers.map((h) => (
                <tr key={h} className={cn(!mapping[h] && 'opacity-60')}>
                  <td className="td font-medium">{h}</td>
                  <td className="td text-ink-2"><span className="block max-w-[300px] truncate">{preview.sample.map((r) => r[h]).filter(Boolean).slice(0, 3).join(' · ') || '—'}</span></td>
                  <td className="td"><Select sm value={mapping[h] ?? ''} onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}><option value="">Skip this column</option><optgroup label="Lead fields">{targets.data?.system.map((t) => <option key={t.key} value={t.key} disabled={used.has(t.key) && mapping[h] !== t.key}>{t.label}</option>)}</optgroup>{!!targets.data?.custom.length && <optgroup label="Custom fields">{targets.data.custom.map((t) => <option key={t.key} value={t.key} disabled={used.has(t.key) && mapping[h] !== t.key}>{t.label}</option>)}</optgroup>}</Select></td>
                </tr>))}</tbody></table>
            {!hasPhone && <p className="px-3 py-2 text-[12.5px] text-danger border-t border-line">Map one column to Phone — it identifies each lead.</p>}
          </div>)}
      </div>
      <div className="card p-4 space-y-3 lg:sticky lg:top-[72px]">
        <h3 className="font-semibold text-[14px]">Import options</h3>
        <Field label="If a phone number already exists"><Select value={opts.importType} onChange={(e) => setOpts({ ...opts, importType: e.target.value })}><option value="create">Skip the row and report it</option><option value="upsert">Update the existing lead</option></Select></Field>
        <Field label="Default stage" hint="Used when the CSV has no stage column"><Select value={opts.stageId} onChange={(e) => setOpts({ ...opts, stageId: e.target.value })}><option value="">First stage</option>{boot.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Default source"><Select value={opts.sourceId} onChange={(e) => setOpts({ ...opts, sourceId: e.target.value })}><option value="">—</option>{boot.sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Default status"><Select value={opts.statusId} onChange={(e) => setOpts({ ...opts, statusId: e.target.value })}><option value="">—</option>{boot.statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Assign all to"><Select value={opts.ownerId} onChange={(e) => setOpts({ ...opts, ownerId: e.target.value })}><option value="">Nobody (use rules / leave unassigned)</option>{boot.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
        {boot.teams.length > 0 && !opts.ownerId && <Field label="Put in team (without owner)"><Select value={opts.teamId} onChange={(e) => setOpts({ ...opts, teamId: e.target.value })}><option value="">—</option>{boot.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>}
        <Checkbox checked={opts.applyAssignmentRules} onChange={(v) => setOpts({ ...opts, applyAssignmentRules: v })} label="Run assignment rules for unassigned rows" />
        <Button variant="primary" className="w-full" disabled={!file || !preview || !hasPhone} loading={start.isPending} onClick={() => start.mutate()}><Upload size={15} /> Start import</Button>
        <p className="text-[12px] text-ink-3">Runs in the background. You can keep working and check progress under Import history; rows with problems are listed with the reason and downloadable as CSV.</p>
      </div>
    </div>
  );
}

function History({ onView }: { onView: (id: string) => void }) {
  const q = useQuery({ queryKey: ['imports'], queryFn: async () => (await api.get<{ data: ImportJob[] }>('/imports?limit=50')).data.data, refetchInterval: (query) => (query.state.data?.some((j) => ['pending', 'processing'].includes(j.status)) ? 2000 : false) });
  if (q.isLoading) return <Spinner />;
  if (!q.data?.length) return <Empty title="No imports yet" />;
  return (
    <div className="card overflow-auto">
      <div className="flex justify-end px-3 pt-2"><Button size="sm" variant="ghost" onClick={() => q.refetch()}><RefreshCw size={13} /> Refresh</Button></div>
      <table className="w-full"><thead><tr>{['File', 'Mode', 'Status', 'Rows', 'Created', 'Updated', 'Errors', 'By', 'Started', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody>{q.data.map((j) => (
          <tr key={j.id} className="hover:bg-surface-2/60">
            <td className="td font-medium">{j.fileName}</td><td className="td">{j.importType === 'upsert' ? 'Update existing' : 'Create only'}</td>
            <td className="td"><Badge color={STATUS_COLOR[j.status]}>{j.status}{j.status === 'processing' && ` ${Math.round((j.totals.processed / Math.max(1, j.totals.rows)) * 100)}%`}</Badge></td>
            <td className="td tabular-nums">{j.totals.rows}</td><td className="td tabular-nums text-success">{j.totals.created}</td><td className="td tabular-nums">{j.totals.updated}</td><td className="td tabular-nums"><span className={j.totals.errored ? 'text-danger font-medium' : ''}>{j.totals.errored}</span></td>
            <td className="td text-ink-2">{j.startedBy?.name ?? '—'}</td><td className="td tabular-nums text-ink-2">{fmtDateTime(j.createdAt)}</td>
            <td className="td"><Button size="sm" variant="ghost" onClick={() => onView(j.id)}>Details</Button></td>
          </tr>))}</tbody></table>
    </div>
  );
}

function JobModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const q = useQuery({ queryKey: ['import', id], queryFn: async () => (await api.get<{ data: ImportJob }>(`/imports/${id}`)).data.data, enabled: !!id, refetchInterval: (query) => (query.state.data && ['pending', 'processing'].includes(query.state.data.status) ? 1500 : false) });
  useEffect(() => { if (id) q.refetch(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const j = q.data;
  if (!id) return null;
  const pct = j ? Math.round((j.totals.processed / Math.max(1, j.totals.rows)) * 100) : 0;
  return (
    <Modal open onClose={onClose} title={j?.fileName ?? 'Import'} width="max-w-2xl" footer={<>{!!j?.errorCount && <Button className="mr-auto" onClick={() => downloadFile(`/imports/${id}/errors.csv`, `import-errors.csv`).catch((e) => toast.error(errorMessage(e)))}><Download size={14} /> Error rows (CSV)</Button>}<Button onClick={onClose}>Close</Button></>}>
      {!j ? <Spinner /> : (
        <div className="space-y-4">
          <div><div className="flex justify-between text-[12.5px] mb-1"><span><Badge color={STATUS_COLOR[j.status]}>{j.status}</Badge></span><span className="tabular-nums text-ink-2">{j.totals.processed} / {j.totals.rows} rows</span></div><div className="h-2 rounded bg-surface-2 overflow-hidden"><div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} /></div></div>
          <div className="grid grid-cols-3 gap-3 text-center">{[['Created', j.totals.created, 'text-success'], ['Updated', j.totals.updated, ''], ['Errors', j.totals.errored, j.totals.errored ? 'text-danger' : '']].map(([l, v, c]) => <div key={String(l)} className="card p-3"><p className={`text-[22px] font-semibold tabular-nums ${c}`}>{v}</p><p className="text-[12px] text-ink-3">{l}</p></div>)}</div>
          {j.failureReason && <p className="text-[13px] text-danger">{j.failureReason}</p>}
          {!!j.errors?.length && (<div className="card overflow-auto max-h-64"><table className="w-full"><thead><tr><th className="th">Row</th><th className="th">Problem</th><th className="th">Data</th></tr></thead><tbody>{j.errors.map((e, i) => <tr key={i}><td className="td tabular-nums">{e.row}</td><td className="td text-danger whitespace-normal">{e.message}</td><td className="td text-ink-2"><span className="block max-w-[320px] truncate" title={JSON.stringify(e.data)}>{Object.values(e.data ?? {}).slice(0, 4).join(' · ')}</span></td></tr>)}</tbody></table>{(j.errorCount ?? 0) > j.errors.length && <p className="px-3 py-2 text-[12px] text-ink-3">Showing {j.errors.length} of {j.errorCount}. Download the CSV for all.</p>}</div>)}
        </div>)}
    </Modal>
  );
}
