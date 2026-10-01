import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { DynamicInput } from '@/components/fields/DynamicField';
import { api, errorDetails, errorMessage } from '@/lib/api';
import { useBootstrap } from '@/store/bootstrap';
import { useAuth, useCan } from '@/store/auth';
import { cn } from '@/lib/utils';
import { useLeadInvalidate } from './shared';

interface Primary { name: string; phone: string; altPhone: string; email: string; city: string; state: string; stageId: string; statusId: string; sourceId: string; ownerId: string; remarks: string; nextFollowUpAt: string; createdAt: string }
const empty: Primary = { name: '', phone: '', altPhone: '', email: '', city: '', state: '', stageId: '', statusId: '', sourceId: '', ownerId: '', remarks: '', nextFollowUpAt: '', createdAt: '' };

/** Two-step create: primary info, then admin-defined custom parameters. */
export function CreateLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { boot } = useBootstrap(); const can = useCan(); const me = useAuth((s) => s.user)!; const inv = useLeadInvalidate(); const nav = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [p, setP] = useState<Primary>({ ...empty, stageId: boot.stages[0]?.id ?? '' });
  const [custom, setCustom] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dup, setDup] = useState<{ id: string; name: string } | null>(null);
  const createFields = useMemo(() => boot.fields.filter((f) => f.showInCreate || f.required), [boot.fields]);
  const sections = useMemo(() => { const m = new Map<string, typeof createFields>(); createFields.forEach((f) => m.set(f.section, [...(m.get(f.section) ?? []), f])); return Array.from(m.entries()); }, [createFields]);
  const set = <K extends keyof Primary>(k: K, v: Primary[K]) => setP((s) => ({ ...s, [k]: v }));
  const reset = () => { setStep(1); setP({ ...empty, stageId: boot.stages[0]?.id ?? '' }); setCustom({}); setErrors({}); setDup(null); };

  const checkPhone = async () => {
    const phone = p.phone.replace(/[\s-]/g, ''); if (phone.length < 8) return;
    try { const r = await api.get(`/leads/check-phone?phone=${encodeURIComponent(phone)}`); setDup(r.data.data.exists ? r.data.data.lead : null); } catch { /* ignore */ }
  };
  const validate1 = () => { const e: Record<string, string> = {}; if (!/^\+?[0-9\s-]{8,16}$/.test(p.phone)) e.phone = 'Enter a valid phone number'; if (p.email && !/^\S+@\S+\.\S+$/.test(p.email)) e.email = 'Enter a valid email'; if (dup) e.phone = `Already exists: ${dup.name || 'lead'}`; setErrors(e); return !Object.keys(e).length; };

  const m = useMutation({
    mutationFn: () => api.post('/leads', {
      name: p.name || undefined, phone: p.phone, altPhone: p.altPhone || undefined, email: p.email || undefined, city: p.city || undefined, state: p.state || undefined,
      stageId: p.stageId || undefined, statusId: p.statusId || undefined, sourceId: p.sourceId || undefined, ownerId: p.ownerId || undefined, remarks: p.remarks || undefined,
      nextFollowUpAt: p.nextFollowUpAt ? new Date(p.nextFollowUpAt).toISOString() : undefined, createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
      customFields: Object.fromEntries(Object.entries(custom).filter(([, v]) => v !== undefined)),
    }),
    onSuccess: (res) => { toast.success('Lead created'); inv(); reset(); onClose(); nav(`/leads/${res.data.data.id}`); },
    onError: (e) => { const d = errorDetails(e) as { path: string; message: string }[] | { leadId?: string } | undefined; if (Array.isArray(d)) { const errs: Record<string, string> = {}; d.forEach((x) => { errs[x.path.replace('body.', '').replace('customFields.', 'custom.')] = x.message; }); setErrors(errs); if (d.some((x) => x.path.includes('customFields'))) setStep(2); else setStep(1); } toast.error(errorMessage(e)); },
  });

  const close = () => { reset(); onClose(); };
  return (
    <Modal open={open} onClose={close} title="Create lead" width="max-w-2xl"
      description={<span className="inline-flex items-center gap-2">{[1, 2].map((s) => <span key={s} className={cn('inline-flex items-center gap-1.5', step === s ? 'text-primary font-medium' : 'text-ink-3')}><span className={cn('h-5 w-5 rounded-full grid place-items-center text-[11px] border', step === s ? 'bg-primary text-white border-primary' : 'border-line')}>{s}</span>{s === 1 ? 'Primary info' : 'Custom parameters'}</span>)}</span>}
      footer={<>
        {step === 2 && <Button onClick={() => setStep(1)} className="mr-auto">Back</Button>}
        <Button onClick={close}>Cancel</Button>
        {step === 1 && createFields.length > 0 && <Button variant="primary" onClick={() => { if (validate1()) setStep(2); }}>Next</Button>}
        {(step === 2 || !createFields.length) && <Button variant="primary" loading={m.isPending} onClick={() => { if (validate1()) m.mutate(); }}>Create lead</Button>}
      </>}>
      {step === 1 ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Name"><Input value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="Customer name" autoFocus /></Field>
          <Field label="Phone" required error={errors.phone} hint={dup ? undefined : undefined}>
            <Input value={p.phone} onChange={(e) => { set('phone', e.target.value); setDup(null); }} onBlur={checkPhone} inputMode="tel" placeholder="10-digit mobile" />
            {dup && <button type="button" className="mt-1 text-[12px] text-primary underline" onClick={() => { close(); nav(`/leads/${dup.id}`); }}>Open existing lead →</button>}
          </Field>
          <Field label="Alternate phone"><Input value={p.altPhone} onChange={(e) => set('altPhone', e.target.value)} inputMode="tel" /></Field>
          <Field label="Email" error={errors.email}><Input type="email" value={p.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="City"><Input value={p.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="State"><Input value={p.state} onChange={(e) => set('state', e.target.value)} /></Field>
          <Field label="Stage"><Select value={p.stageId} onChange={(e) => set('stageId', e.target.value)}>{boot.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Status"><Select value={p.statusId} onChange={(e) => set('statusId', e.target.value)}><option value="">—</option>{boot.statuses.filter((s) => !s.stageIds.length || s.stageIds.includes(p.stageId)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Source"><Select value={p.sourceId} onChange={(e) => set('sourceId', e.target.value)}><option value="">—</option>{boot.sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Owner" hint={me.role === 'agent' ? 'Leads you create are assigned to you' : undefined}>
            <Select value={p.ownerId} onChange={(e) => set('ownerId', e.target.value)} disabled={!can('lead.assign')}><option value="">{me.role === 'agent' ? me.name : can('lead.assign') ? 'Auto-assign by rules / unassigned' : me.name}</option>{boot.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
          </Field>
          <Field label="Next follow-up"><Input type="datetime-local" value={p.nextFollowUpAt} onChange={(e) => set('nextFollowUpAt', e.target.value)} /></Field>
          {me.role === 'admin' && <Field label="Lead created at" hint="Backdate for offline leads"><Input type="datetime-local" value={p.createdAt} onChange={(e) => set('createdAt', e.target.value)} /></Field>}
          <Field label="Remarks" className="sm:col-span-2"><Textarea value={p.remarks} onChange={(e) => set('remarks', e.target.value)} className="min-h-[64px]" /></Field>
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map(([section, fields]) => (
            <div key={section}>
              <h3 className="text-[12.5px] font-semibold text-ink-2 mb-2 pb-1 border-b border-line">{section}</h3>
              <div className="grid sm:grid-cols-2 gap-3">{fields.map((f) => <Field key={f.key} label={f.label} required={f.required} hint={f.helpText || undefined} error={errors[`custom.${f.key}`]}><DynamicInput def={f} value={custom[f.key]} onChange={(v) => setCustom((c) => ({ ...c, [f.key]: v }))} /></Field>)}</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
