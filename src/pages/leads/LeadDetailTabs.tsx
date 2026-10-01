import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlarmClock, Check, Download, FileText, Pencil, PhoneCall, Trash2, Upload, X } from 'lucide-react';
import { Avatar, Badge, Button, Checkbox, Empty, Field, Input, Modal, Select, Spinner, Textarea } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { cn, fmtBytes, fmtDateTime, fmtRelative, orDash } from '@/lib/utils';
import { useBootstrap } from '@/store/bootstrap';
import { useAuth, useCan } from '@/store/auth';
import type { Activity, CallLog, Lead, LeadFile, Note, Task } from '@/types';
import { useLeadInvalidate } from './shared';

const ACT_ICON: Record<string, string> = { created: '✦', assigned: '→', unassigned: '↩', stage_changed: '▲', status_changed: '●', note_added: '✎', call_logged: '☏', call_initiated: '☏', whatsapp_sent: '✉', email_sent: '✉', file_uploaded: '⇧', imported: '⇩', deleted: '✕', restored: '↺', history_erased: '⌫', followup_set: '◷', followup_reset: '◷', task_created: '☐', task_updated: '☑' };

export function ActivitiesTab({ lead }: { lead: Lead }) {
  const q = useQuery({ queryKey: ['lead-activities', lead.id], queryFn: async () => (await api.get<{ data: Activity[] }>(`/leads/${lead.id}/activities`)).data.data });
  if (q.isLoading) return <div className="py-10 flex justify-center"><Spinner /></div>;
  if (!q.data?.length) return <Empty title="No activity yet" hint="Calls, notes, stage changes and assignments will appear here." />;
  return (
    <ol className="relative border-l border-line ml-3 space-y-4 py-2">
      {q.data.map((a) => (
        <li key={a.id} className="pl-5 relative">
          <span className="absolute -left-[9px] top-0.5 h-4 w-4 rounded-full bg-surface border border-line grid place-items-center text-[9px] text-ink-2">{ACT_ICON[a.type] ?? '•'}</span>
          <p className="text-[13.5px] leading-5">{a.description}</p>
          <p className="text-[12px] text-ink-3 mt-0.5">{a.user?.name ?? 'System'} · <span title={fmtDateTime(a.createdAt)}>{fmtRelative(a.createdAt)}</span> · {a.type.replace(/_/g, ' ')}</p>
        </li>
      ))}
    </ol>
  );
}

export function NotesTab({ lead }: { lead: Lead }) {
  const can = useCan(); const inv = useLeadInvalidate();
  const q = useQuery({ queryKey: ['lead-notes', lead.id], queryFn: async () => (await api.get<{ data: Note[] }>(`/leads/${lead.id}/notes`)).data.data });
  const [body, setBody] = useState(''); const [editing, setEditing] = useState<string | null>(null); const [editBody, setEditBody] = useState('');
  const add = useMutation({ mutationFn: () => api.post(`/leads/${lead.id}/notes`, { body }), onSuccess: () => { setBody(''); q.refetch(); inv(lead.id); toast.success('Note added'); }, onError: (e) => toast.error(errorMessage(e)) });
  const edit = useMutation({ mutationFn: (id: string) => api.patch(`/leads/${lead.id}/notes/${id}`, { body: editBody }), onSuccess: () => { setEditing(null); q.refetch(); }, onError: (e) => toast.error(errorMessage(e)) });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/leads/${lead.id}/notes/${id}`), onSuccess: () => { q.refetch(); inv(lead.id); }, onError: (e) => toast.error(errorMessage(e)) });
  return (
    <div className="space-y-4">
      {can('note.create') && <div className="flex gap-2 items-start"><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note — it also becomes the lead's latest remark" className="min-h-[64px]" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && body.trim()) add.mutate(); }} /><Button variant="primary" disabled={!body.trim()} loading={add.isPending} onClick={() => add.mutate()}>Add</Button></div>}
      {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty title="No notes" /> : q.data.map((n) => (
        <div key={n.id} className="card p-3">
          <div className="flex items-center gap-2 text-[12px] text-ink-3 mb-1.5"><Avatar name={n.createdBy?.name} color={n.createdBy?.avatarColor} size={20} /><span className="text-ink-2 font-medium">{n.createdBy?.name ?? 'Unknown'}</span><span title={fmtDateTime(n.createdAt)}>{fmtRelative(n.createdAt)}</span>
            {n.remindAt && <span className="inline-flex items-center gap-1 text-warning" title={fmtDateTime(n.remindAt)}><AlarmClock size={11} /> reminder</span>}
            <span className="ml-auto flex gap-2">{can('note.edit') && <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => { setEditing(n.id); setEditBody(n.body); }}><Pencil size={12} /> Edit</button>}{can('note.delete') && <button className="inline-flex items-center gap-1 hover:text-danger" onClick={() => del.mutate(n.id)}><Trash2 size={12} /> Delete</button>}</span></div>
          {editing === n.id ? <div className="flex gap-2"><Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} className="min-h-[56px]" /><div className="flex flex-col gap-1"><Button size="icon" variant="primary" onClick={() => edit.mutate(n.id)}><Check size={14} /></Button><Button size="icon" onClick={() => setEditing(null)}><X size={14} /></Button></div></div> : <p className="text-[13.5px] whitespace-pre-wrap">{n.body}</p>}
        </div>
      ))}
    </div>
  );
}

export function TasksTab({ lead }: { lead: Lead }) {
  const can = useCan(); const { boot } = useBootstrap(); const inv = useLeadInvalidate();
  const q = useQuery({ queryKey: ['lead-tasks', lead.id], queryFn: async () => (await api.get<{ data: Task[] }>(`/leads/${lead.id}/tasks`)).data.data });
  const [open, setOpen] = useState(false); const [title, setTitle] = useState(''); const [due, setDue] = useState(''); const [assignee, setAssignee] = useState(lead.ownerId ?? '');
  const add = useMutation({ mutationFn: () => api.post(`/leads/${lead.id}/tasks`, { title, dueAt: due ? new Date(due).toISOString() : null, assigneeId: assignee || null }), onSuccess: () => { setOpen(false); setTitle(''); setDue(''); q.refetch(); inv(lead.id); }, onError: (e) => toast.error(errorMessage(e)) });
  const upd = useMutation({ mutationFn: ({ id, status }: { id: string; status: Task['status'] }) => api.patch(`/leads/${lead.id}/tasks/${id}`, { status }), onSuccess: () => { q.refetch(); inv(lead.id); }, onError: (e) => toast.error(errorMessage(e)) });
  return (
    <div className="space-y-3">
      {can('task.create') && <Button size="sm" variant="primary" onClick={() => setOpen(true)}>New task</Button>}
      {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty title="No tasks" hint="Tasks are reminders for the owner — document pickup, KYC, follow-up calls." /> : (
        <ul className="divide-y divide-line card">{q.data.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-3 py-2">
            <Checkbox checked={t.status === 'done'} disabled={!can('task.edit')} onChange={(v) => upd.mutate({ id: t.id, status: v ? 'done' : 'open' })} />
            <div className="min-w-0 flex-1"><p className={cn('text-[13.5px]', t.status !== 'open' && 'line-through text-ink-3')}>{t.title}</p><p className="text-[12px] text-ink-3">{t.assignee?.name ?? 'Unassigned'}{t.dueAt && ` · due ${fmtDateTime(t.dueAt)}`}</p></div>
            {t.status === 'open' && can('task.edit') && <button className="text-[12px] text-ink-3 hover:text-danger" onClick={() => upd.mutate({ id: t.id, status: 'cancelled' })}>Cancel</button>}
            {t.status !== 'open' && <Badge>{t.status}</Badge>}
          </li>))}</ul>)}
      <Modal open={open} onClose={() => setOpen(false)} title="New task" width="max-w-sm" footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" disabled={!title.trim()} loading={add.isPending} onClick={() => add.mutate()}>Create</Button></>}>
        <div className="space-y-3"><Field label="Title" required><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field><Field label="Due"><Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></Field><Field label="Assignee"><Select value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Lead owner</option>{boot.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field></div>
      </Modal>
    </div>
  );
}

export function CallsTab({ lead, onLogCall }: { lead: Lead; onLogCall: () => void }) {
  const can = useCan();
  const q = useQuery({ queryKey: ['lead-calls', lead.id], queryFn: async () => (await api.get<{ data: CallLog[] }>(`/leads/${lead.id}/calls`)).data.data });
  const CS: Record<string, string> = { connected: 'Connected', not_connected: 'Not connected', busy: 'Busy', no_answer: 'No answer', switched_off: 'Switched off', wrong_number: 'Wrong number', voicemail: 'Voicemail' };
  return (
    <div className="space-y-3">
      {can('call.create') && <Button size="sm" variant="primary" onClick={onLogCall}><PhoneCall size={14} /> Log a call</Button>}
      {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty title="No calls logged" hint="Log each call with its outcome — it updates the lead status and contact stats." /> : (
        <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">When</th><th className="th">Type</th><th className="th">Call status</th><th className="th">Outcome</th><th className="th">Sub-status</th><th className="th">Notes</th><th className="th">Duration</th><th className="th">Follow-up</th><th className="th">By</th></tr></thead>
          <tbody>{q.data.map((c) => <tr key={c.id}><td className="td tabular-nums">{fmtDateTime(c.createdAt)}</td><td className="td">{c.direction === 'inbound' ? 'Incoming' : 'Outgoing'}</td><td className="td">{c.callStatus ? CS[c.callStatus] ?? c.callStatus : '—'}</td><td className="td">{c.outcomeStatus ? <Badge color={c.outcomeStatus.color}>{c.outcomeStatus.name}</Badge> : orDash(c.outcome)}</td><td className="td">{orDash(c.subStatus)}</td><td className="td whitespace-normal max-w-[320px]">{orDash(c.notes)}</td><td className="td tabular-nums">{c.durationSec ? `${Math.round(c.durationSec / 60)} min` : '—'}</td><td className="td tabular-nums">{fmtDateTime(c.followUpAt)}</td><td className="td">{c.createdBy?.name ?? '—'}</td></tr>)}</tbody></table></div>)}
    </div>
  );
}

const CATEGORIES = ['KYC', 'Income proof', 'Bank statement', 'Property', 'Application form', 'Sanction letter', 'Other'];
export function FilesTab({ lead }: { lead: Lead }) {
  const can = useCan(); const me = useAuth((s) => s.user)!; const inv = useLeadInvalidate();
  const q = useQuery({ queryKey: ['lead-files', lead.id], queryFn: async () => (await api.get<{ data: LeadFile[] }>(`/leads/${lead.id}/files`)).data.data });
  const inputRef = useRef<HTMLInputElement>(null); const [file, setFile] = useState<File | null>(null); const [title, setTitle] = useState(''); const [category, setCategory] = useState('KYC'); const [progress, setProgress] = useState<string | null>(null);
  useEffect(() => { if (file && !title) setTitle(file.name.replace(/\.[^.]+$/, '')); }, [file]); // eslint-disable-line react-hooks/exhaustive-deps
  const upload = async () => {
    if (!file) return; setProgress('Preparing…');
    try {
      const pre = await api.post(`/leads/${lead.id}/files/presign`, { title: title || file.name, category, fileName: file.name, mimeType: file.type || 'application/octet-stream', size: file.size });
      const { uploadUrl, headers, file: meta } = pre.data.data;
      setProgress('Uploading…');
      const put = await fetch(uploadUrl, { method: 'PUT', headers, body: file });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      await api.post(`/files/${meta.id}/confirm`);
      toast.success('Document uploaded'); setFile(null); setTitle(''); q.refetch(); inv(lead.id);
    } catch (e) { toast.error(errorMessage(e)); } finally { setProgress(null); }
  };
  const download = async (f: LeadFile) => { try { const r = await api.get(`/files/${f.id}/download`); const url: string = r.data.data.url; window.open(url.includes('/files/raw/') ? `${url}?token=${encodeURIComponent(useAuth.getState().accessToken ?? '')}` : url, '_blank'); } catch (e) { toast.error(errorMessage(e)); } };
  const setStatus = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/files/${id}`, { status }), onSuccess: () => q.refetch(), onError: (e) => toast.error(errorMessage(e)) });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/files/${id}`), onSuccess: () => { q.refetch(); inv(lead.id); }, onError: (e) => toast.error(errorMessage(e)) });
  const STATUS_COLOR: Record<string, string> = { pending: '#9CA3AF', uploaded: '#185FA5', verified: '#1B8A5A', rejected: '#C23B3B' };
  return (
    <div className="space-y-4">
      {can('file.upload') && (
        <div className="card p-3 flex flex-wrap items-end gap-3">
          <input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button onClick={() => inputRef.current?.click()}><Upload size={15} /> {file ? file.name : 'Choose file'}</Button>
          <Field label="Title" className="flex-1 min-w-[160px]"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. PAN card" /></Field>
          <Field label="Category" className="w-44"><Select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Button variant="primary" disabled={!file || !!progress} loading={!!progress} onClick={upload}>{progress ?? 'Upload'}</Button>
          <p className="basis-full text-[12px] text-ink-3">PDF, images, Word, Excel or CSV up to 25 MB. Files are stored in {import.meta.env.PROD ? 'S3' : 'the configured storage'}; only a reference is kept in the database.</p>
        </div>)}
      {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty title="No documents" icon={<FileText size={28} />} hint="Collect KYC and income documents here so the whole team can see what's pending." /> : (
        <table className="w-full"><thead><tr><th className="th">Document</th><th className="th">Category</th><th className="th">Status</th><th className="th">Size</th><th className="th">Uploaded</th><th className="th"></th></tr></thead>
          <tbody>{q.data.map((f) => (
            <tr key={f.id}><td className="td"><p className="font-medium">{f.title}</p><p className="text-[12px] text-ink-3">{f.fileName}</p></td><td className="td">{f.category}</td><td className="td"><Badge color={STATUS_COLOR[f.status]}>{f.status}</Badge></td><td className="td tabular-nums">{fmtBytes(f.size)}</td><td className="td"><span className="tabular-nums">{fmtDateTime(f.createdAt)}</span><span className="text-ink-3"> · {f.uploadedBy?.name}</span></td>
              <td className="td"><span className="inline-flex gap-1">
                {f.status !== 'pending' && <Button size="icon" variant="ghost" title="Download" onClick={() => download(f)}><Download size={14} /></Button>}
                {me.role !== 'agent' && f.status === 'uploaded' && <><Button size="icon" variant="ghost" title="Verify" className="text-success" onClick={() => setStatus.mutate({ id: f.id, status: 'verified' })}><Check size={14} /></Button><Button size="icon" variant="ghost" title="Reject" className="text-danger" onClick={() => setStatus.mutate({ id: f.id, status: 'rejected' })}><X size={14} /></Button></>}
                {can('file.delete') && <Button size="icon" variant="ghost" title="Delete" className="text-ink-3 hover:text-danger" onClick={() => del.mutate(f.id)}><Trash2 size={14} /></Button>}
              </span></td></tr>))}</tbody></table>)}
    </div>
  );
}

