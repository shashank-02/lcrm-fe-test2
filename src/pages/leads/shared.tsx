import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge, Button, Checkbox, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { DynamicInput } from '@/components/fields/DynamicField';
import { api, errorDetails, errorMessage } from '@/lib/api';
import { toInputDateTime } from '@/lib/utils';
import { useBootstrap } from '@/store/bootstrap';
import { useCan } from '@/store/auth';
import type { Lead, Stage } from '@/types';

export const StageBadge = ({ stage }: { stage?: { name: string; color?: string } | null }) => (stage ? <Badge color={stage.color} soft>{stage.name}</Badge> : <span className="text-ink-3">—</span>);
export const StatusBadge = ({ status }: { status?: { name: string; color?: string } | null }) => (status ? <Badge color={status.color}>{status.name}</Badge> : <span className="text-ink-3">—</span>);

/** Invalidate everything that shows lead data. */
export function useLeadInvalidate() {
  const qc = useQueryClient();
  return (id?: string) => { qc.invalidateQueries({ queryKey: ['leads'] }); qc.invalidateQueries({ queryKey: ['lead-counts'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); if (id) { qc.invalidateQueries({ queryKey: ['lead', id] }); qc.invalidateQueries({ queryKey: ['lead-activities', id] }); } };
}

// ---------- Assign ----------
export function AssignModal({ open, onClose, leadIds, current, onDone }: { open: boolean; onClose: () => void; leadIds: string[]; current?: string | null; onDone?: () => void }) {
  const { boot } = useBootstrap(); const can = useCan(); const inv = useLeadInvalidate();
  const [ownerId, setOwner] = useState(current ?? ''); const [comment, setComment] = useState(''); const [erase, setErase] = useState(false); const [today, setToday] = useState(false);
  useEffect(() => { if (open) { setOwner(current ?? ''); setComment(''); setErase(false); setToday(false); } }, [open, current]);
  const m = useMutation({
    mutationFn: async () => leadIds.length === 1
      ? api.post(`/leads/${leadIds[0]}/assign`, { ownerId: ownerId || null, comment: comment || undefined, eraseHistory: erase, addToTodayList: today || undefined })
      : api.post('/leads/bulk', { ids: leadIds, action: 'assign', payload: { ownerId: ownerId || null, comment: comment || undefined, eraseHistory: erase } }),
    onSuccess: (res) => { const d = res.data.data; toast.success(leadIds.length === 1 ? 'Lead assigned' : `Assigned ${d.affected} of ${d.requested} leads${d.errors?.length ? ` (${d.errors.length} skipped)` : ''}`); inv(leadIds[0]); onDone?.(); onClose(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const grouped = useMemo(() => { const g: Record<string, typeof boot.users> = {}; boot.users.forEach((u) => { const t = boot.teams.find((x) => x.id === u.teamId)?.name ?? 'No team'; (g[t] ??= []).push(u); }); return g; }, [boot.users, boot.teams]);
  return (
    <Modal open={open} onClose={onClose} title={leadIds.length > 1 ? `Assign ${leadIds.length} leads` : 'Assign lead'} width="max-w-md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={m.isPending} onClick={() => m.mutate()}>Assign</Button></>}>
      <div className="space-y-3">
        <Field label="Assign to" required>
          <Select value={ownerId} onChange={(e) => setOwner(e.target.value)}>
            <option value="">— Unassigned —</option>
            {Object.entries(grouped).map(([team, users]) => <optgroup key={team} label={team}>{users.map((u) => <option key={u.id} value={u.id}>{u.name}{u.role ? ` · ${boot.roles[u.role]}` : ''}</option>)}</optgroup>)}
          </Select>
        </Field>
        <Field label="Comment for the new owner"><Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Why this lead is being handed over, what to do next…" className="min-h-[64px]" /></Field>
        <div className="space-y-2 pt-1">
          {can('lead.erase_history') && <Checkbox checked={erase} onChange={setErase} label={<span>Erase history <span className="text-ink-3">— hide previous notes, calls and activity from the new owner</span></span>} />}
          {leadIds.length === 1 && <Checkbox checked={today} onChange={setToday} label="Add to the owner's Today list" />}
        </div>
      </div>
    </Modal>
  );
}

// ---------- Stage change (with directive-driven required fields) ----------
export function StageModal({ open, onClose, lead, toStage, onDone }: { open: boolean; onClose: () => void; lead: Lead; toStage: Stage | null; onDone?: () => void }) {
  const { boot } = useBootstrap(); const inv = useLeadInvalidate();
  const [remarks, setRemarks] = useState(''); const [followUp, setFollowUp] = useState(''); const [statusId, setStatus] = useState(lead.statusId ?? ''); const [custom, setCustom] = useState<Record<string, unknown>>({}); const [issues, setIssues] = useState<string[]>([]);
  const directives = useMemo(() => boot.directives.filter((d) => toStage && d.toStageId === toStage.id && (!d.fromStageId || d.fromStageId === lead.stageId)), [boot.directives, toStage, lead.stageId]);
  const requiredCustom = useMemo(() => Array.from(new Set(directives.flatMap((d) => d.requiredFields))).filter((f) => f.startsWith('custom.')).map((f) => boot.fields.find((x) => x.key === f.slice(7))).filter(Boolean) as typeof boot.fields, [directives, boot.fields]);
  const requireRemark = directives.some((d) => d.requireRemark), requireFollowUp = directives.some((d) => d.requireNextFollowUp);
  const statuses = boot.statuses.filter((s) => !s.stageIds.length || (toStage && s.stageIds.includes(toStage.id)));
  useEffect(() => { if (open) { setRemarks(''); setFollowUp(''); setStatus(lead.statusId ?? ''); setIssues([]); const init: Record<string, unknown> = {}; requiredCustom.forEach((f) => { init[f.key] = lead.customFields?.[f.key] ?? null; }); setCustom(init); } }, [open, lead, requiredCustom]);
  const m = useMutation({
    mutationFn: () => api.post(`/leads/${lead.id}/stage`, { stageId: toStage!.id, remarks: remarks || undefined, nextFollowUpAt: followUp ? new Date(followUp).toISOString() : undefined, statusId: statusId || null, customFields: Object.keys(custom).length ? custom : undefined }),
    onSuccess: () => { toast.success(`Moved to ${toStage!.name}`); inv(lead.id); onDone?.(); onClose(); },
    onError: (e) => { const d = errorDetails(e) as { issues?: string[] } | undefined; setIssues(d?.issues ?? [errorMessage(e)]); },
  });
  if (!toStage) return null;
  return (
    <Modal open={open} onClose={onClose} title={<span>Move to <span style={{ color: toStage.color }}>{toStage.name}</span></span>} description={lead.stage ? `From ${lead.stage.name}` : undefined} width="max-w-md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={m.isPending} onClick={() => m.mutate()}>Update stage</Button></>}>
      <div className="space-y-3">
        {issues.length > 0 && <div className="rounded-md border border-danger/40 bg-danger/5 text-danger text-[13px] px-3 py-2 space-y-0.5">{issues.map((i) => <p key={i}>{i}</p>)}</div>}
        {directives.length > 0 && <p className="text-[12.5px] text-ink-3">This stage has rules: {directives.map((d) => d.name).join(', ')}.</p>}
        {requiredCustom.map((f) => <Field key={f.key} label={f.label} required><DynamicInput def={f} value={custom[f.key]} onChange={(v) => setCustom((c) => ({ ...c, [f.key]: v }))} /></Field>)}
        <Field label="Status"><Select value={statusId} onChange={(e) => setStatus(e.target.value)}><option value="">Keep current</option>{statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Remark" required={requireRemark}><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="min-h-[64px]" placeholder="What happened on this call / step" /></Field>
        <Field label="Next follow-up" required={requireFollowUp}><Input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// ---------- Status change ----------
export function StatusModal({ open, onClose, lead, onDone }: { open: boolean; onClose: () => void; lead: Lead; onDone?: () => void }) {
  const { boot } = useBootstrap(); const inv = useLeadInvalidate();
  const [statusId, setStatus] = useState(lead.statusId ?? ''); const [remarks, setRemarks] = useState(''); const [followUp, setFollowUp] = useState(toInputDateTime(lead.nextFollowUpAt));
  useEffect(() => { if (open) { setStatus(lead.statusId ?? ''); setRemarks(''); setFollowUp(toInputDateTime(lead.nextFollowUpAt)); } }, [open, lead]);
  const statuses = boot.statuses.filter((s) => !s.stageIds.length || (lead.stageId && s.stageIds.includes(lead.stageId)));
  const m = useMutation({
    mutationFn: () => api.post(`/leads/${lead.id}/status`, { statusId: statusId || null, remarks: remarks || undefined, nextFollowUpAt: followUp ? new Date(followUp).toISOString() : null }),
    onSuccess: () => { toast.success('Status updated'); inv(lead.id); onDone?.(); onClose(); }, onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Modal open={open} onClose={onClose} title="Update status" width="max-w-md" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={m.isPending} onClick={() => m.mutate()}>Save</Button></>}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">{statuses.map((s) => <button key={s.id} type="button" onClick={() => setStatus(s.id)} className="rounded-md border px-2.5 h-8 text-[13px] font-medium transition-colors" style={statusId === s.id ? { backgroundColor: s.color, color: '#fff', borderColor: s.color } : { borderColor: s.color, color: s.color }}>{s.name}</button>)}</div>
        <Field label="Remark"><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="min-h-[64px]" /></Field>
        <Field label="Next follow-up"><Input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// ---------- Follow-up ----------
export function FollowUpModal({ open, onClose, lead, onDone }: { open: boolean; onClose: () => void; lead: Lead; onDone?: () => void }) {
  const inv = useLeadInvalidate(); const can = useCan();
  const [value, setValue] = useState(toInputDateTime(lead.nextFollowUpAt)); const [remarks, setRemarks] = useState('');
  useEffect(() => { if (open) { setValue(toInputDateTime(lead.nextFollowUpAt)); setRemarks(''); } }, [open, lead]);
  const m = useMutation({ mutationFn: (v: string | null) => api.post(`/leads/${lead.id}/followup`, { nextFollowUpAt: v, remarks: remarks || undefined }), onSuccess: () => { toast.success('Follow-up updated'); inv(lead.id); onDone?.(); onClose(); }, onError: (e) => toast.error(errorMessage(e)) });
  const quick = (h: number) => { const d = new Date(); d.setHours(d.getHours() + h); setValue(toInputDateTime(d)); };
  return (
    <Modal open={open} onClose={onClose} title="Schedule follow-up" width="max-w-sm"
      footer={<>{can('lead.reset_followup') && lead.nextFollowUpAt && <Button variant="ghost" className="mr-auto text-danger" onClick={() => m.mutate(null)}>Reset</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={m.isPending} disabled={!value} onClick={() => m.mutate(new Date(value).toISOString())}>Save</Button></>}>
      <div className="space-y-3">
        <div className="flex gap-1.5 flex-wrap">{[['+1h', 1], ['+3h', 3], ['Tomorrow', 24], ['+3 days', 72], ['Next week', 168]].map(([l, h]) => <button key={l} type="button" className="pill" onClick={() => quick(h as number)}>{l}</button>)}</div>
        <Field label="Date & time"><Input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
        <Field label="Remark"><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="min-h-[56px]" /></Field>
      </div>
    </Modal>
  );
}
