import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, CheckCircle2, Clock, ExternalLink, FileText, GraduationCap, Link2, Pencil, PlayCircle, Plus, Search, Sparkles, Trash2, Upload, Users, Video, LayoutList, ListChecks } from 'lucide-react';
import { Badge, Button, Confirm, Empty, Field, Input, Modal, PageHeader, PillSelect, Select, Spinner, Tabs, Textarea, Toggle } from '@/components/ui';
import { api, apiUrl, downloadFile, errorMessage, qs } from '@/lib/api';
import { cn, fmtBytes, fmtDate, fmtDateTime } from '@/lib/utils';
import { useBootstrap } from '@/store/bootstrap';
import { useCan } from '@/store/auth';
import { AudiencePicker, audienceLabel, emptyAudience } from '@/components/AudiencePicker';
import { ConfigCrudPage } from './admin/ConfigCrudPage';
import type { Audience, TrainingCategory, TrainingItem, TrainingProgressRow, TrainingType } from '@/types';

const TYPE_LABEL: Record<TrainingType, string> = { video_upload: 'Video', video_link: 'Video link', external_link: 'External link', document: 'Document', tutorial: 'Tutorial' };
const TYPE_ICON: Record<TrainingType, React.ElementType> = { video_upload: Video, video_link: PlayCircle, external_link: Link2, document: FileText, tutorial: BookOpen };
const fmtDur = (s: number) => (s ? `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '');

/** YouTube / Vimeo → embeddable URL; anything else opens in a new tab. */
export function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (/(^|\.)youtube\.com$/.test(u.hostname)) { const id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop(); return id ? `https://www.youtube-nocookie.com/embed/${id}` : null; }
    if (u.hostname === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (/(^|\.)vimeo\.com$/.test(u.hostname)) { const id = u.pathname.split('/').filter(Boolean).pop(); return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null; }
    if (/\.(mp4|webm)(\?|$)/i.test(u.pathname)) return url;
  } catch { /* invalid */ }
  return null;
}

export default function TrainingPage() {
  const can = useCan(); const manage = can('training.manage');
  const [mode, setMode] = useState<'hub' | 'manage' | 'categories'>('hub');
  return (
    <div>
      <PageHeader title="Training Hub" subtitle="Tutorials and learning material for the team." actions={manage && <Tabs tabs={[{ key: 'hub', label: 'Hub' }, { key: 'manage', label: 'Manage' }, { key: 'categories', label: 'Categories' }]} value={mode} onChange={setMode} className="border-0 [&_button]:h-8" />} />
      {mode === 'hub' && <Hub />}
      {mode === 'manage' && manage && <ManageTraining />}
      {mode === 'categories' && manage && <ConfigCrudPage spec={{ title: 'Training categories', entity: 'Category', endpoint: '/training/categories', reorderable: true, columns: [{ key: 'name', label: 'Category' }, { key: 'isActive', label: 'Active', render: (c: TrainingCategory) => (c.isActive ? 'Yes' : 'No') }], fields: [{ key: 'name', label: 'Name', type: 'text', required: true }, { key: 'isActive', label: 'Active', type: 'boolean' }], defaults: { isActive: true } }} />}
    </div>
  );
}

function Hub() {
  const [search, setSearch] = useState(''); const [cat, setCat] = useState(''); const [type, setType] = useState('');
  const cats = useQuery({ queryKey: ['training-cats'], queryFn: async () => (await api.get<{ data: TrainingCategory[] }>('/training/categories')).data.data });
  const q = useQuery({ queryKey: ['trainings', { search, cat, type }], queryFn: async () => (await api.get<{ data: TrainingItem[] }>(`/training${qs({ search, categoryId: cat, type })}`)).data.data, placeholderData: (p) => p });
  const [open, setOpen] = useState<TrainingItem | null>(null);
  const grouped = useMemo(() => { const m = new Map<string, TrainingItem[]>(); (q.data ?? []).forEach((t) => m.set(t.category || 'Other', [...(m.get(t.category || 'Other') ?? []), t])); return Array.from(m.entries()); }, [q.data]);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative w-full sm:w-[280px]"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, description" className="pl-8 h-9 text-[13px]" /></div>
        <PillSelect label="Category" value={cat} onChange={setCat} options={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        <PillSelect label="Type" value={type} onChange={setType} options={Object.entries(TYPE_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
      </div>
      {q.isLoading ? <div className="py-12 flex justify-center"><Spinner /></div> : !q.data?.length ? <Empty title="No training yet" icon={<GraduationCap size={28} />} hint="Training added by your admin will appear here." /> : grouped.map(([name, items]) => (
        <section key={name} className="mb-6"><h2 className="text-[14px] font-semibold mb-2 text-ink-2">{name} <span className="text-ink-3 font-normal">· {items.length}</span></h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">{items.map((t) => <TrainingCard key={t.id} t={t} onOpen={() => setOpen(t)} />)}</div></section>))}
      <TrainingViewer item={open} onClose={() => { setOpen(null); q.refetch(); }} />
    </div>
  );
}

function TrainingCard({ t, onOpen }: { t: TrainingItem; onOpen: () => void }) {
  const Icon = TYPE_ICON[t.type]; const p = t.progress;
  return (
    <button onClick={onOpen} className="card p-4 text-left hover:border-primary transition-colors flex flex-col gap-2 group">
      <div className="flex items-start justify-between gap-2"><span className="h-9 w-9 rounded-md bg-primary-soft text-primary grid place-items-center shrink-0"><Icon size={18} /></span><span className="flex gap-1">{t.isNew && <Badge color="#1B8A5A">🆕 New</Badge>}{p?.status === 'completed' && <Badge color="#1B8A5A" soft><CheckCircle2 size={11} className="mr-1" /> Completed</Badge>}</span></div>
      <h3 className="font-semibold text-[14.5px] leading-5 group-hover:text-primary">{t.title}</h3>
      {t.description && <p className="text-[12.5px] text-ink-2 line-clamp-2">{t.description}</p>}
      <div className="mt-auto pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3"><span>{TYPE_LABEL[t.type]}</span>{t.durationSec > 0 && <span className="inline-flex items-center gap-1"><Clock size={11} /> {fmtDur(t.durationSec)}</span>}<span>{fmtDate(t.createdAt)}</span>{t.addedBy && <span>by {t.addedBy}</span>}</div>
      {p && p.status === 'in_progress' && p.progressPct > 0 && <div className="h-1.5 rounded bg-surface-2 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${p.progressPct}%` }} /></div>}
      <span className="text-[13px] font-medium text-primary inline-flex items-center gap-1">{t.type.startsWith('video') ? <><PlayCircle size={14} /> Watch training</> : t.type === 'external_link' ? <><ExternalLink size={14} /> Open training</> : <><BookOpen size={14} /> View training</>}</span>
    </button>
  );
}

/** Details + player. Saves video progress every 10 s and marks completion. */
function TrainingViewer({ item, onClose }: { item: TrainingItem | null; onClose: () => void }) {
  const q = useQuery({ queryKey: ['training', item?.id], queryFn: async () => (await api.get<{ data: TrainingItem }>(`/training/${item!.id}`)).data.data, enabled: !!item, staleTime: 0 });
  const videoRef = useRef<HTMLVideoElement>(null); const lastSave = useRef(0);
  const save = useMutation({ mutationFn: (b: { positionSec?: number; durationSec?: number; completed?: boolean }) => api.post(`/training/${item!.id}/progress`, b) });
  useEffect(() => { if (q.data && q.data.type !== 'video_upload' && !q.data.progress) save.mutate({ completed: q.data.type === 'external_link' ? false : true }); }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!item) return null;
  const t = q.data; const Icon = TYPE_ICON[item.type];
  const src = t?.viewUrl && t.viewToken ? `${apiUrl(t.viewUrl)}?token=${encodeURIComponent(t.viewToken)}` : '';
  const emb = t?.type === 'video_link' ? embedUrl(t.url) : null;
  const onTime = () => { const v = videoRef.current; if (!v || !t) return; if (Date.now() - lastSave.current > 10_000) { lastSave.current = Date.now(); save.mutate({ positionSec: Math.floor(v.currentTime), durationSec: Math.floor(v.duration || t.durationSec) }); } };
  return (
    <Modal open onClose={onClose} title={<span className="inline-flex items-center gap-2"><Icon size={18} className="text-primary" /> {item.title}</span>} description={<span>{TYPE_LABEL[item.type]}{t?.category && ` · ${t.category}`} · added by {t?.addedBy ?? item.addedBy} on {fmtDate(item.createdAt)}</span>} width="max-w-4xl"
      footer={<>{t?.canDownload && <Button className="mr-auto" onClick={() => downloadFile(`/training/${item.id}/view?token=${t.viewToken}`, t.fileName).catch((e) => toast.error(errorMessage(e)))}>Download</Button>}{t && t.progress?.status !== 'completed' && t.type !== 'external_link' && <Button onClick={() => save.mutate({ completed: true }, { onSuccess: () => { toast.success('Marked as completed'); onClose(); } })}><CheckCircle2 size={14} /> Mark completed</Button>}<Button onClick={onClose}>Close</Button></>}>
      {q.isLoading || !t ? <div className="py-12 flex justify-center"><Spinner /></div> : (
        <div className="space-y-4">
          {t.description && <p className="text-[13.5px] text-ink-2 whitespace-pre-wrap">{t.description}</p>}
          {t.type === 'video_upload' && <video ref={videoRef} src={src} controls controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} className="w-full max-h-[60vh] rounded-md bg-black" onTimeUpdate={onTime} onLoadedMetadata={() => { if (videoRef.current && t.progress?.positionSec && t.progress.status !== 'completed') videoRef.current.currentTime = t.progress.positionSec; }} onEnded={() => save.mutate({ completed: true }, { onSuccess: () => toast.success('Training completed') })} />}
          {t.type === 'video_link' && (emb ? <iframe title={t.title} src={emb} className="w-full aspect-video rounded-md bg-black" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /> : <a className="card p-4 flex items-center gap-3 hover:border-primary" href={t.url} target="_blank" rel="noreferrer" onClick={() => save.mutate({ completed: true })}><ExternalLink size={18} className="text-primary" /><span><span className="block font-medium">Open training video</span><span className="block text-[12px] text-ink-3 break-all">{t.url}</span></span></a>)}
          {t.type === 'external_link' && <a className="card p-4 flex items-center gap-3 hover:border-primary" href={t.url} target="_blank" rel="noreferrer" onClick={() => save.mutate({ completed: true })}><ExternalLink size={18} className="text-primary" /><span><span className="block font-medium">Open training resource</span><span className="block text-[12px] text-ink-3 break-all">{t.url}</span></span></a>}
          {t.type === 'document' && (t.mimeType === 'application/pdf' || t.mimeType.startsWith('image/') || t.mimeType.startsWith('text/') ? (t.mimeType.startsWith('image/') ? <img src={src} alt={t.title} className="max-h-[65vh] mx-auto rounded-md" /> : <iframe title={t.title} src={`${src}#toolbar=0`} sandbox="" className="w-full h-[65vh] rounded-md bg-white" />) : <div className="card p-6 text-center"><FileText size={32} className="mx-auto text-ink-3 mb-2" /><p className="font-medium">{t.fileName} · {fmtBytes(t.size)}</p><p className="text-[13px] text-ink-3 mt-1">This file type cannot be previewed in the browser.{t.canDownload ? ' Use Download.' : ''}</p></div>)}
          {t.type === 'tutorial' && <article className="prose-sm max-w-none text-[14px] leading-relaxed whitespace-pre-wrap">{t.content}</article>}
        </div>)}
    </Modal>
  );
}

// ---------- Admin management ----------
function ManageTraining() {
  const { boot } = useBootstrap();
  const q = useQuery({ queryKey: ['trainings-admin'], queryFn: async () => (await api.get<{ data: TrainingItem[] }>('/training?includeInactive=true')).data.data });
  const overview = useQuery({ queryKey: ['training-overview'], queryFn: async () => (await api.get<{ data: Record<string, number> }>('/training/overview')).data.data });
  const [editing, setEditing] = useState<TrainingItem | null | 'new'>(null); const [del, setDel] = useState<TrainingItem | null>(null); const [progressOf, setProgressOf] = useState<TrainingItem | null>(null);
  const refetch = () => { q.refetch(); overview.refetch(); };
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/training/${id}`), onSuccess: () => { toast.success('Training deleted successfully.'); setDel(null); refetch(); }, onError: (e) => toast.error(errorMessage(e)) });
  const toggle = useMutation({ mutationFn: (t: TrainingItem) => api.patch(`/training/${t.id}`, { isActive: !t.isActive }), onSuccess: () => { toast.success('Training updated successfully.'); refetch(); }, onError: (e) => toast.error(errorMessage(e)) });
  const o = overview.data;
  return (
    <div className="space-y-4">
      {o && <div className="card grid grid-cols-2 md:grid-cols-6 divide-x divide-y md:divide-y-0 divide-line overflow-hidden">{[['Total training', o.total], ['Active', o.active], ['Inactive', o.inactive], ['Users', o.users], ['Completed', o.completed], ['Pending', o.pending]].map(([l, v]) => <div key={String(l)} className="p-3"><p className="text-[22px] font-semibold tabular-nums">{v}</p><p className="text-[12px] text-ink-3">{l}</p></div>)}</div>}
      <div className="flex justify-end"><Button variant="primary" size="sm" onClick={() => setEditing('new')}><Plus size={14} /> Add training</Button></div>
      <div className="card overflow-x-auto">{q.isLoading ? <Spinner /> : !q.data?.length ? <Empty title="No training added yet" /> : (
        <table className="w-full min-w-[800px]"><thead><tr>{['Training', 'Type', 'Category', 'Visibility', 'Status', 'Actions'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{q.data.map((t) => <tr key={t.id} className={cn('hover:bg-surface-2/60', !t.isActive && 'opacity-60')}><td className="td"><p className="font-medium">{t.title}{t.isNew && <Badge color="#1B8A5A" className="ml-2">New</Badge>}</p><p className="text-[12px] text-ink-3 truncate max-w-[320px]">{t.description}</p></td><td className="td">{TYPE_LABEL[t.type]}</td><td className="td">{t.category || '—'}</td><td className="td text-ink-2 max-w-[220px] truncate">{audienceLabel(t.audience, boot.teams, boot.users)}</td><td className="td"><Badge color={t.isActive ? '#1B8A5A' : '#6B7280'}>{t.isActive ? 'Active' : 'Inactive'}</Badge></td>
            <td className="td"><span className="inline-flex gap-0.5"><Button size="icon" variant="ghost" title="Completion" onClick={() => setProgressOf(t)}><Users size={14} /></Button><Button size="icon" variant="ghost" title="Edit" onClick={() => setEditing(t)}><Pencil size={14} /></Button><Button size="icon" variant="ghost" title={t.isActive ? 'Deactivate' : 'Activate'} onClick={() => toggle.mutate(t)}>{t.isActive ? <ListChecks size={14} /> : <LayoutList size={14} />}</Button><Button size="icon" variant="ghost" className="text-ink-3 hover:text-danger" title="Delete" onClick={() => setDel(t)}><Trash2 size={14} /></Button></span></td></tr>)}</tbody></table>)}</div>
      <TrainingForm item={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} onSaved={refetch} />
      <ProgressModal item={progressOf} onClose={() => setProgressOf(null)} />
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del.id)} loading={remove.isPending} danger title={`Delete "${del?.title}"?`} body="The training and everyone's progress on it are removed." confirmLabel="Delete" />
    </div>
  );
}

function TrainingForm({ item, open, onClose, onSaved }: { item: TrainingItem | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const { boot } = useBootstrap(); const fileRef = useRef<HTMLInputElement>(null);
  const cats = useQuery({ queryKey: ['training-cats'], queryFn: async () => (await api.get<{ data: TrainingCategory[] }>('/training/categories')).data.data });
  const [v, setV] = useState({ title: '', description: '', type: 'video_link' as TrainingType, categoryId: '', url: '', content: '', durationMin: '', isActive: true, isNew: false, allowDownload: false }); const [aud, setAud] = useState<Audience>(emptyAudience()); const [file, setFile] = useState<File | null>(null);
  useEffect(() => { if (open) { setV({ title: item?.title ?? '', description: item?.description ?? '', type: item?.type ?? 'video_link', categoryId: item?.categoryId ?? '', url: item?.url ?? '', content: item?.content ?? '', durationMin: item?.durationSec ? String(Math.round(item.durationSec / 60)) : '', isActive: item?.isActive ?? true, isNew: item?.isNew ?? false, allowDownload: item?.allowDownload ?? false }); setAud(item?.audience ?? emptyAudience()); setFile(null); } }, [open, item]);
  const set = (p: Partial<typeof v>) => setV((s) => ({ ...s, ...p }));
  const needsFile = v.type === 'video_upload' || v.type === 'document';
  const save = useMutation({
    mutationFn: async () => {
      if (!v.title.trim()) throw new Error('Training title is required');
      if ((v.type === 'video_link' || v.type === 'external_link') && !/^https?:\/\//.test(v.url)) throw new Error(v.type === 'video_link' ? 'Enter a valid video URL' : 'Enter a valid URL');
      if (v.type === 'tutorial' && !v.content.trim()) throw new Error('Add the tutorial content');
      if (needsFile && !item && !file) throw new Error('Upload the training file');
      const fd = new FormData(); Object.entries({ title: v.title, description: v.description, type: v.type, categoryId: v.categoryId, url: v.url, content: v.content, durationSec: v.durationMin ? String(Number(v.durationMin) * 60) : '0', isActive: String(v.isActive), isNew: String(v.isNew), allowDownload: String(v.allowDownload) }).forEach(([k, val]) => fd.append(k, val)); fd.append('audience', JSON.stringify(aud)); if (file) fd.append('file', file);
      return item ? api.patch(`/training/${item.id}`, fd) : api.post('/training', fd);
    },
    onSuccess: () => { toast.success(item ? 'Training updated successfully.' : 'Training added successfully.'); onSaved(); onClose(); }, onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Modal open={open} onClose={onClose} title={item ? 'Edit training' : 'Add training'} width="max-w-2xl" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}><Upload size={14} /> {item ? 'Save changes' : 'Publish training'}</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Training title" required className="sm:col-span-2"><Input value={v.title} onChange={(e) => set({ title: e.target.value })} autoFocus placeholder="How to Create a Lead" /></Field>
        <Field label="Description" className="sm:col-span-2"><Textarea value={v.description} onChange={(e) => set({ description: e.target.value })} className="min-h-[64px]" placeholder="Learn how to create and assign a new Lead in the application." /></Field>
        <Field label="Training type" required><Select value={v.type} disabled={!!item} onChange={(e) => set({ type: e.target.value as TrainingType })}>{Object.entries(TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{k === 'video_upload' ? 'Video upload' : l}</option>)}</Select></Field>
        <Field label="Category"><Select value={v.categoryId} onChange={(e) => set({ categoryId: e.target.value })}><option value="">—</option>{(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        {(v.type === 'video_link' || v.type === 'external_link') && <Field label={v.type === 'video_link' ? 'Training video URL' : 'URL'} required className="sm:col-span-2" hint={v.type === 'video_link' ? 'YouTube and Vimeo play inside the app; other links open in a new tab.' : undefined}><Input value={v.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://" /></Field>}
        {needsFile && <Field label={v.type === 'video_upload' ? 'Upload video (MP4 / WebM)' : 'Upload document (PDF, DOCX, PPTX…)'} required={!item} className="sm:col-span-2" hint={v.type === 'video_upload' ? `Up to ${boot.org?.settings.training?.maxVideoSizeMb ?? 500} MB` : `Up to ${boot.org?.settings.files?.maxSizeMb ?? 25} MB`}><input ref={fileRef} type="file" className="hidden" accept={v.type === 'video_upload' ? 'video/mp4,video/webm,.mov' : '.pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg'} onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><Button onClick={() => fileRef.current?.click()} className="w-full justify-start"><Upload size={14} /> {file ? `${file.name} (${fmtBytes(file.size)})` : item?.fileName ? `Keep ${item.fileName} (choose to replace)` : 'Choose file'}</Button></Field>}
        {v.type === 'tutorial' && <Field label="Tutorial content" required className="sm:col-span-2" hint="Plain text — steps, instructions, tips."><Textarea value={v.content} onChange={(e) => set({ content: e.target.value })} className="min-h-[160px] font-mono text-[13px]" /></Field>}
        {(v.type === 'video_upload' || v.type === 'video_link') && <Field label="Duration (minutes)"><Input type="number" min={0} value={v.durationMin} onChange={(e) => set({ durationMin: e.target.value })} /></Field>}
        <div className="sm:col-span-2 space-y-2 pt-1"><Toggle checked={v.isActive} onChange={(x) => set({ isActive: x })} label="Active (visible to users)" /><Toggle checked={v.isNew} onChange={(x) => set({ isNew: x })} label={<span className="inline-flex items-center gap-1"><Sparkles size={13} className="text-success" /> Show a “New” indicator</span>} />{v.type === 'document' && <Toggle checked={v.allowDownload} onChange={(x) => set({ allowDownload: x })} label="Allow download for users with the download permission" />}</div>
        <div className="sm:col-span-2 border-t border-line pt-3"><AudiencePicker value={aud} onChange={setAud} /></div>
      </div>
    </Modal>
  );
}

function ProgressModal({ item, onClose }: { item: TrainingItem | null; onClose: () => void }) {
  const q = useQuery({ queryKey: ['training-progress', item?.id], queryFn: async () => (await api.get<{ data: TrainingProgressRow[] }>(`/training/${item!.id}/progress`)).data.data, enabled: !!item });
  if (!item) return null;
  return (
    <Modal open onClose={onClose} title={`Completion · ${item.title}`} width="max-w-md" footer={<Button onClick={onClose}>Close</Button>}>
      {q.isLoading ? <Spinner /> : !q.data?.length ? <p className="text-[13px] text-ink-3">Nobody has opened this training yet.</p> : <ul className="divide-y divide-line">{q.data.map((r) => <li key={r.id} className="flex items-center gap-2 py-2 text-[13px]"><span className="font-medium flex-1">{r.user?.name ?? 'User'}</span><Badge color={r.status === 'completed' ? '#1B8A5A' : r.status === 'in_progress' ? '#B7791F' : '#6B7280'}>{r.status.replace('_', ' ')}</Badge><span className="tabular-nums text-ink-3 w-12 text-right">{r.progressPct}%</span><span className="text-ink-3 text-[12px] w-32 text-right">{fmtDateTime(r.completedAt ?? r.lastViewedAt)}</span></li>)}</ul>}
    </Modal>
  );
}
