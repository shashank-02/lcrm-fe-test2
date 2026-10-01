import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlarmClock, Check, Mail, MessageCircle, Phone, PhoneCall, StickyNote, Wallet, X } from 'lucide-react';
import { Badge, Button, Checkbox, Drawer, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { cn, fmtDate, fmtDateTime } from '@/lib/utils';
import { useBootstrap } from '@/store/bootstrap';
import { useCan } from '@/store/auth';
import type { Lead, TopUpOutcome, TopUpReminder } from '@/types';
import { useLeadInvalidate } from './shared';

const CALL_STATUSES = [['connected', 'Connected'], ['not_connected', 'Not connected'], ['busy', 'Busy'], ['no_answer', 'No answer'], ['switched_off', 'Switched off'], ['wrong_number', 'Wrong number'], ['voicemail', 'Voicemail']] as const;

/** Right-side quick access bar: Add Call Log, Add Note, Call, WhatsApp, Email. */
export function QuickAccessBar({ lead, openCall, onOpenCall, openTopUp, onOpenTopUp }: { lead: Lead; openCall: boolean; onOpenCall: (v: boolean) => void; openTopUp: boolean; onOpenTopUp: (v: boolean) => void }) {
  const can = useCan(); const { boot } = useBootstrap(); const inv = useLeadInvalidate();
  const [note, setNote] = useState(false);
  const [channel, setChannel] = useState<null | 'whatsapp' | 'email'>(null); const [templateId, setTemplateId] = useState(''); const [message, setMessage] = useState(''); const [subject, setSubject] = useState('');
  const templates = boot.templates.filter((t) => t.channel === channel);
  const send = useMutation({
    mutationFn: (ch: 'whatsapp' | 'email' | 'call') => api.post(`/leads/${lead.id}/communicate`, { channel: ch, templateId: templateId || undefined, message: templateId ? undefined : message || undefined, subject: templateId ? undefined : subject || undefined }),
    onSuccess: (r, ch) => { window.open(r.data.data.link, ch === 'call' ? '_self' : '_blank'); setChannel(null); setTemplateId(''); setMessage(''); inv(lead.id); if (ch === 'call') setTimeout(() => onOpenCall(true), 400); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const preview = templateId ? boot.templates.find((t) => t.id === templateId)?.body : message;
  const btn = 'group relative h-11 w-11 rounded-full shadow-pop grid place-items-center text-white transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100';
  const tip = 'pointer-events-none absolute right-[52px] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-navy text-white text-[12px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-pop';
  return (
    <>
      <div className="fixed right-4 bottom-4 z-30 flex flex-col gap-2 items-end" role="toolbar" aria-label="Quick access">
        {can('call.create') && <button className={cn(btn, 'bg-[#1a3a5c]')} onClick={() => onOpenCall(true)} aria-label="Add call log"><PhoneCall size={18} /><span className={tip}>Add Call Log</span></button>}
        {can('note.create') && <button className={cn(btn, 'bg-[#7C3AED]')} onClick={() => setNote(true)} aria-label="Add note"><StickyNote size={18} /><span className={tip}>Add Note</span></button>}
        {lead.topUp && ['scheduled', 'due', 'snoozed'].includes(lead.topUp.status) && can('topup.action') && <button className={cn(btn, lead.topUp.status === 'due' ? 'bg-danger animate-pulse' : 'bg-warning')} onClick={() => onOpenTopUp(true)} aria-label="Top-up follow-up"><Wallet size={18} /><span className={tip}>Top-up follow-up {lead.topUp.status === 'due' ? '— due now' : `on ${fmtDate(lead.topUp.dueAt)}`}</span></button>}
        {can('lead.communicate') && <>
          <button className={cn(btn, 'bg-primary')} onClick={() => send.mutate('call')} aria-label="Call"><Phone size={18} /><span className={tip}>Call {lead.phone}</span></button>
          <button className={cn(btn, 'bg-[#25D366]')} onClick={() => setChannel('whatsapp')} aria-label="WhatsApp"><MessageCircle size={18} /><span className={tip}>WhatsApp</span></button>
          <button className={cn(btn, 'bg-[#C23B3B]')} disabled={!lead.email} onClick={() => setChannel('email')} aria-label="Email"><Mail size={18} /><span className={tip}>{lead.email ? 'Email' : 'No email on lead'}</span></button>
        </>}
      </div>
      <CallLogDrawer lead={lead} open={openCall} onClose={() => onOpenCall(false)} />
      <QuickNoteModal lead={lead} open={note} onClose={() => setNote(false)} />
      <TopUpModal lead={lead} open={openTopUp} onClose={() => onOpenTopUp(false)} onLogCall={() => { onOpenTopUp(false); onOpenCall(true); }} />
      <Modal open={channel !== null} onClose={() => setChannel(null)} title={channel === 'whatsapp' ? `WhatsApp ${lead.name || lead.phone}` : `Email ${lead.email}`} width="max-w-md"
        footer={<><Button onClick={() => setChannel(null)}>Cancel</Button><Button variant="primary" loading={send.isPending} onClick={() => channel && send.mutate(channel)}>Open {channel === 'whatsapp' ? 'WhatsApp' : 'mail app'}</Button></>}>
        <div className="space-y-3">
          <Field label="Template"><Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}><option value="">Write my own</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
          {!templateId && channel === 'email' && <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>}
          {!templateId ? <Field label="Message"><Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[96px]" placeholder="Hi {{name}}, …" /></Field> : <div className="rounded-md bg-surface-2 p-3 text-[13px] whitespace-pre-wrap text-ink-2">{preview}</div>}
          <p className="text-[12px] text-ink-3">Placeholders like {'{{name}}'} or {'{{owner.name}}'} are filled in before opening. The touch is logged on the lead.</p>
        </div>
      </Modal>
    </>
  );
}

/** Submit Call Log — side panel with Call Type, Call Status, Status, Sub-Status, Notes and next follow-up. */
export function CallLogDrawer({ lead, open, onClose }: { lead: Lead; open: boolean; onClose: () => void }) {
  const { boot } = useBootstrap(); const can = useCan(); const inv = useLeadInvalidate(); const qc = useQueryClient();
  const [direction, setDirection] = useState<'outbound' | 'inbound'>('outbound'); const [callStatus, setCallStatus] = useState(''); const [statusId, setStatusId] = useState(''); const [subStatus, setSubStatus] = useState(''); const [notes, setNotes] = useState(''); const [dur, setDur] = useState(''); const [follow, setFollow] = useState(''); const [updateStatus, setUpdateStatus] = useState(true);
  useEffect(() => { if (open) { setDirection('outbound'); setCallStatus(''); setStatusId(lead.statusId ?? ''); setSubStatus(''); setNotes(''); setDur(''); setFollow(''); setUpdateStatus(true); } }, [open, lead]);
  const statuses = boot.statuses.filter((s) => !s.stageIds.length || (lead.stageId && s.stageIds.includes(lead.stageId)));
  const subs = useMemo(() => boot.statuses.find((s) => s.id === statusId)?.subStatuses ?? [], [boot.statuses, statusId]);
  const add = useMutation({
    mutationFn: () => api.post(`/leads/${lead.id}/calls`, { direction, callStatus: callStatus || undefined, outcomeStatusId: statusId || null, subStatus: subStatus || undefined, notes, durationSec: dur ? Number(dur) * 60 : 0, followUpAt: follow ? new Date(follow).toISOString() : undefined, updateLeadStatus: updateStatus }),
    onSuccess: () => { toast.success('Call log saved'); qc.invalidateQueries({ queryKey: ['lead-calls', lead.id] }); inv(lead.id); onClose(); }, onError: (e) => toast.error(errorMessage(e)),
  });
  const quick = (h: number) => { const d = new Date(); d.setHours(d.getHours() + h); setFollow(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)); };
  return (
    <Drawer open={open} onClose={onClose} title="Submit Call Log" description={`Fill in the details for ${lead.name || lead.phone}`} width="max-w-lg"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={add.isPending} disabled={!statusId && !notes.trim() && !callStatus} onClick={() => add.mutate()}><Check size={14} /> Submit</Button></>}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Call type" required><Select value={direction} onChange={(e) => setDirection(e.target.value as 'outbound' | 'inbound')}><option value="outbound">Outgoing</option><option value="inbound">Incoming</option></Select></Field>
          <Field label="Call status"><Select value={callStatus} onChange={(e) => setCallStatus(e.target.value)}><option value="">—</option>{CALL_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="Status" required><Select value={statusId} onChange={(e) => { setStatusId(e.target.value); setSubStatus(''); }}><option value="">Select…</option>{statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Sub-status"><Select value={subStatus} onChange={(e) => setSubStatus(e.target.value)} disabled={!subs.length}><option value="">{subs.length ? 'Select…' : 'No sub-statuses configured'}</option>{subs.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
        </div>
        <Field label="Call notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[110px]" placeholder="What was discussed, objections, next steps…" autoFocus /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Duration (minutes)"><Input type="number" min={0} value={dur} onChange={(e) => setDur(e.target.value)} /></Field>
          <Field label="Next follow-up / callback on"><Input type="datetime-local" value={follow} onChange={(e) => setFollow(e.target.value)} /></Field>
        </div>
        <div className="flex gap-1.5 flex-wrap -mt-1">{[['+1 hour', 1], ['+3 hours', 3], ['Tomorrow', 24], ['+3 days', 72]].map(([l, h]) => <button key={l as string} type="button" className="pill" onClick={() => quick(h as number)}><AlarmClock size={12} /> {l}</button>)}</div>
        {statusId && can('lead.update_status') && <Checkbox checked={updateStatus} onChange={setUpdateStatus} label="Also set this as the lead's status" />}
        <p className="text-[12px] text-ink-3">The call is linked to this lead and appears under Interactions immediately. It counts as a contact and updates the follow-up date.</p>
      </div>
    </Drawer>
  );
}

export function QuickNoteModal({ lead, open, onClose }: { lead: Lead; open: boolean; onClose: () => void }) {
  const inv = useLeadInvalidate(); const qc = useQueryClient();
  const [body, setBody] = useState(''); const [remind, setRemind] = useState('');
  useEffect(() => { if (open) { setBody(''); setRemind(''); } }, [open]);
  const add = useMutation({ mutationFn: () => api.post(`/leads/${lead.id}/notes`, { body, remindAt: remind ? new Date(remind).toISOString() : undefined }), onSuccess: () => { toast.success('Note added'); qc.invalidateQueries({ queryKey: ['lead-notes', lead.id] }); inv(lead.id); onClose(); }, onError: (e) => toast.error(errorMessage(e)) });
  return (
    <Modal open={open} onClose={onClose} title="Add note" description={`${lead.name || lead.phone} · saved with your name and time`} width="max-w-md" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!body.trim()} loading={add.isPending} onClick={() => add.mutate()}><Check size={14} /> Save note</Button></>}>
      <div className="space-y-3">
        <Textarea autoFocus value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[110px]" placeholder="Type your note…" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && body.trim()) add.mutate(); }} />
        <Field label="Remind me (optional)" hint="You will get a notification at this time"><Input type="datetime-local" value={remind} onChange={(e) => setRemind(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

const OUTCOMES: { value: TopUpOutcome; label: string }[] = [{ value: 'interested', label: 'Interested in top-up' }, { value: 'not_interested', label: 'Not interested' }, { value: 'call_back_later', label: 'Call back later' }, { value: 'unable_to_reach', label: 'Unable to reach' }, { value: 'already_taken', label: 'Top-up already taken' }, { value: 'other', label: 'Other' }];
export const OUTCOME_LABEL = Object.fromEntries(OUTCOMES.map((o) => [o.value, o.label])) as Record<string, string>;

/** Top-up follow-up outcome dialog with call / snooze / dismiss actions. */
export function TopUpModal({ lead, open, onClose, onLogCall }: { lead: Lead; open: boolean; onClose: () => void; onLogCall: () => void }) {
  const inv = useLeadInvalidate();
  const [outcome, setOutcome] = useState<TopUpOutcome | ''>(''); const [notes, setNotes] = useState('');
  useEffect(() => { if (open) { setOutcome(''); setNotes(''); } }, [open]);
  const r = lead.topUp;
  const act = useMutation({ mutationFn: ({ action, body }: { action: 'complete' | 'snooze' | 'dismiss'; body?: Record<string, unknown> }) => api.post(`/topup-reminders/${r!.id}/${action}`, body ?? {}), onSuccess: (_d, v) => { toast.success(v.action === 'complete' ? 'Top-up follow-up recorded' : v.action === 'snooze' ? 'Reminder snoozed' : 'Reminder dismissed'); inv(lead.id); onClose(); }, onError: (e) => toast.error(errorMessage(e)) });
  if (!r) return null;
  return (
    <Modal open={open} onClose={onClose} title={<span className="inline-flex items-center gap-2"><Wallet size={18} className="text-warning" /> Top-up follow-up</span>} description={`${lead.name || lead.phone} · disbursed ${fmtDate(r.disbursedAt)} · reminder ${fmtDate(r.dueAt)}`} width="max-w-md"
      footer={<><Button variant="ghost" className="mr-auto text-ink-3" onClick={() => act.mutate({ action: 'dismiss' })}><X size={14} /> Dismiss</Button><Button onClick={() => act.mutate({ action: 'snooze', body: { days: 7 } })}><AlarmClock size={14} /> Remind me in a week</Button><Button variant="primary" disabled={!outcome} loading={act.isPending} onClick={() => act.mutate({ action: 'complete', body: { outcome, notes } })}><Check size={14} /> Save outcome</Button></>}>
      <div className="space-y-3">
        <p className="text-[13.5px] text-ink-2">This customer's loan was disbursed about {boot3Months(r)} ago. Contact them and check whether they are interested in a loan top-up.</p>
        <div className="flex gap-2"><Button size="sm" onClick={() => window.open(`tel:${lead.phone}`, '_self')}><Phone size={14} /> Call customer</Button><Button size="sm" onClick={onLogCall}><PhoneCall size={14} /> Log interaction</Button></div>
        <Field label="Outcome" required><div className="grid grid-cols-2 gap-1.5">{OUTCOMES.map((o) => <button key={o.value} type="button" onClick={() => setOutcome(o.value)} className={cn('pill h-9 justify-start', outcome === o.value && 'border-primary text-primary bg-primary-soft')}>{o.label}</button>)}</div></Field>
        <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[64px]" placeholder="What the customer said…" /></Field>
      </div>
    </Modal>
  );
}
const boot3Months = (r: TopUpReminder) => { const m = Math.max(1, Math.round((Date.now() - new Date(r.disbursedAt).getTime()) / (30 * 86_400_000))); return `${m} month${m > 1 ? 's' : ''}`; };

/** Compact status card shown on the lead page. */
export function TopUpCard({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  const r = lead.topUp; const can = useCan();
  if (!r) return null;
  const tone: Record<string, string> = { scheduled: '#185FA5', due: '#C23B3B', snoozed: '#B7791F', completed: '#1B8A5A', dismissed: '#6B7280' };
  return (
    <div className="card p-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] mt-3">
      <span className="inline-flex items-center gap-1.5 font-semibold"><Wallet size={15} className="text-warning" /> Top-Up Follow-Up:</span>
      <Badge color={tone[r.status]}>{r.status === 'due' ? 'Due now' : r.status[0].toUpperCase() + r.status.slice(1)}</Badge>
      <span className="text-ink-2">Disbursed on <span className="text-ink tabular-nums">{fmtDate(r.disbursedAt)}</span></span>
      {r.status !== 'completed' ? <span className="text-ink-2">Reminder on <span className="text-ink tabular-nums">{fmtDate(r.snoozedUntil ?? r.dueAt)}</span></span> : <><span className="text-ink-2">Follow-up date <span className="text-ink tabular-nums">{fmtDateTime(r.completedAt)}</span></span><span className="text-ink-2">Outcome <span className="text-ink font-medium">{OUTCOME_LABEL[r.outcome] ?? r.outcome}</span></span>{r.outcomeNotes && <span className="text-ink-3 truncate max-w-[280px]" title={r.outcomeNotes}>“{r.outcomeNotes}”</span>}</>}
      {['scheduled', 'due', 'snoozed'].includes(r.status) && can('topup.action') && <Button size="sm" variant={r.status === 'due' ? 'primary' : 'secondary'} className="ml-auto" onClick={onOpen}>Record outcome</Button>}
    </div>
  );
}
