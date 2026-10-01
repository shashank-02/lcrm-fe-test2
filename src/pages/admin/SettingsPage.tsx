import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Image as ImageIcon, Save, ShieldCheck, Trash2, Upload, FolderOpen, Clock, Palette } from 'lucide-react';
import { Button, Field, Input, Select, Toggle } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useBootstrap, useInvalidateBootstrap } from '@/store/bootstrap';

const TZ = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Kuwait', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'UTC'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FILE_TYPES = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg', 'webp', 'csv', 'txt'];

export default function SettingsPage() {
  const { boot } = useBootstrap(); const inv = useInvalidateBootstrap();
  const org = boot.org; const logoRef = useRef<HTMLInputElement>(null);
  const [v, setV] = useState({ name: '', timezone: 'Asia/Kolkata', currency: 'INR', defaultRowsPerPage: 100, workStart: '09:30', workEnd: '18:30', workingDays: [1, 2, 3, 4, 5, 6], defaultFollowUpHours: 24, duplicatePhoneCheck: true, primaryColor: '#185FA5', showLeadStageBar: true, topUpReminderMonths: 3, twoFactorDefault: false, allowedTypes: [] as string[], maxSizeMb: 25, maxVideoSizeMb: 500 });
  useEffect(() => { if (org) setV({ name: org.name, timezone: org.timezone, currency: org.currency, defaultRowsPerPage: org.settings.defaultRowsPerPage, workStart: org.settings.workingHours.start, workEnd: org.settings.workingHours.end, workingDays: org.settings.workingDays, defaultFollowUpHours: org.settings.defaultFollowUpHours, duplicatePhoneCheck: org.settings.duplicatePhoneCheck, primaryColor: org.branding.primaryColor, showLeadStageBar: org.settings.showLeadStageBar !== false, topUpReminderMonths: org.settings.topUpReminderMonths ?? 3, twoFactorDefault: !!org.settings.twoFactorDefault, allowedTypes: org.settings.files?.allowedTypes ?? [], maxSizeMb: org.settings.files?.maxSizeMb ?? 25, maxVideoSizeMb: org.settings.training?.maxVideoSizeMb ?? 500 }); }, [org]);
  const save = useMutation({ mutationFn: () => api.patch('/organisation', { name: v.name, timezone: v.timezone, currency: v.currency, branding: { primaryColor: v.primaryColor }, settings: { defaultRowsPerPage: v.defaultRowsPerPage, workingHours: { start: v.workStart, end: v.workEnd }, workingDays: v.workingDays, defaultFollowUpHours: v.defaultFollowUpHours, duplicatePhoneCheck: v.duplicatePhoneCheck, showLeadStageBar: v.showLeadStageBar, topUpReminderMonths: v.topUpReminderMonths, twoFactorDefault: v.twoFactorDefault, files: { allowedTypes: v.allowedTypes, maxSizeMb: v.maxSizeMb }, training: { maxVideoSizeMb: v.maxVideoSizeMb } } }), onSuccess: () => { toast.success('Settings saved'); inv(); }, onError: (e) => toast.error(errorMessage(e)) });
  const uploadLogo = useMutation({ mutationFn: async (f: File) => { if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(f.type)) throw new Error('Logo must be PNG, JPG, SVG or WEBP'); if (f.size > 2 * 1024 * 1024) throw new Error('Logo must be under 2 MB'); const fd = new FormData(); fd.append('file', f); return api.post('/organisation/logo', fd); }, onSuccess: () => { toast.success('Logo updated — it now appears on the login page'); inv(); }, onError: (e) => toast.error(errorMessage(e)) });
  const removeLogo = useMutation({ mutationFn: () => api.delete('/organisation/logo'), onSuccess: () => { toast.success('Logo removed'); inv(); }, onError: (e) => toast.error(errorMessage(e)) });
  const logoUrl = org?.branding?.logoKey ? `${import.meta.env.VITE_API_URL || ''}/api/v1/public/branding/logo?v=${Date.now()}` : null;
  const card = (title: string, Icon: React.ElementType, children: React.ReactNode) => <section className="card p-4"><h3 className="text-[14.5px] font-semibold inline-flex items-center gap-2 mb-3"><Icon size={16} className="text-primary" /> {title}</h3>{children}</section>;
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-semibold">Organisation settings</h2><p className="text-[13px] text-ink-3 mt-0.5">Company details, branding, security and defaults. Admin only.</p></div><Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}><Save size={14} /> Save settings</Button></div>
      {card('Company & branding', Building2, <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Company name"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <Field label="Brand colour"><div className="flex gap-2"><input type="color" value={v.primaryColor} onChange={(e) => setV({ ...v, primaryColor: e.target.value })} className="h-9 w-12 rounded border border-line bg-surface p-1" /><Input value={v.primaryColor} onChange={(e) => setV({ ...v, primaryColor: e.target.value })} /></div></Field>
        <div className="sm:col-span-2"><p className="label inline-flex items-center gap-1.5"><ImageIcon size={13} /> Company logo (login page & sidebar)</p>
          <div className="flex flex-wrap items-center gap-3"><div className="h-20 w-48 rounded-md bg-navy grid place-items-center overflow-hidden">{logoUrl ? <img src={logoUrl} alt="Company logo" className="max-h-16 max-w-[176px] object-contain" /> : <span className="text-white/60 text-[12px]">No logo uploaded</span>}</div>
            <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo.mutate(f); e.target.value = ''; }} />
            <Button size="sm" loading={uploadLogo.isPending} onClick={() => logoRef.current?.click()}><Upload size={14} /> {logoUrl ? 'Replace logo' : 'Upload logo'}</Button>{logoUrl && <Button size="sm" variant="ghost" className="text-danger" onClick={() => removeLogo.mutate()}><Trash2 size={14} /> Remove</Button>}</div>
          <p className="text-[12px] text-ink-3 mt-1.5">PNG, JPG, SVG or WEBP up to 2 MB. Transparent background recommended; the logo is scaled to fit without distortion.</p></div>
      </div>)}
      {card('Security', ShieldCheck, <div className="space-y-3">
        <Toggle checked={v.twoFactorDefault} onChange={(x) => setV({ ...v, twoFactorDefault: x })} label={<span><span className="font-medium">Enable two-factor authentication for new users by default</span> <span className="text-ink-3">— existing users are controlled individually under Members</span></span>} />
        <p className="text-[12.5px] text-ink-3">Passwords are issued by administrators and stored as bcrypt hashes. Sessions end server-side on logout; accounts lock for 15 minutes after 5 failed sign-ins.</p>
      </div>)}
      {card('Lead page & pipeline', Palette, <div className="space-y-3">
        <Toggle checked={v.showLeadStageBar} onChange={(x) => setV({ ...v, showLeadStageBar: x })} label={<span><span className="font-medium">Show Lead Status Bar</span> <span className="text-ink-3">on the lead page for all users</span></span>} />
        <Toggle checked={v.duplicatePhoneCheck} onChange={(x) => setV({ ...v, duplicatePhoneCheck: x })} label="Warn about duplicate phone numbers when creating leads" />
        <div className="grid sm:grid-cols-3 gap-3"><Field label="Top-up reminder (months after disbursement)"><Input type="number" min={1} max={36} value={v.topUpReminderMonths} onChange={(e) => setV({ ...v, topUpReminderMonths: Number(e.target.value) })} /></Field><Field label="Default follow-up (hours)"><Input type="number" min={1} value={v.defaultFollowUpHours} onChange={(e) => setV({ ...v, defaultFollowUpHours: Number(e.target.value) })} /></Field><Field label="Default rows per page"><Select value={String(v.defaultRowsPerPage)} onChange={(e) => setV({ ...v, defaultRowsPerPage: Number(e.target.value) })}>{[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field></div>
      </div>)}
      {card('Date, time & locale', Clock, <div className="space-y-3"><div className="grid sm:grid-cols-2 gap-3">
        <Field label="Timezone" hint='"Today" tabs, reminders and reports use this'><Select value={v.timezone} onChange={(e) => setV({ ...v, timezone: e.target.value })}>{TZ.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Currency"><Select value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })}>{['INR', 'AED', 'SAR', 'QAR', 'KWD', 'USD', 'GBP', 'EUR'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Working hours start"><Input type="time" value={v.workStart} onChange={(e) => setV({ ...v, workStart: e.target.value })} /></Field><Field label="Working hours end"><Input type="time" value={v.workEnd} onChange={(e) => setV({ ...v, workEnd: e.target.value })} /></Field></div>
        <Field label="Working days"><div className="flex gap-1.5 flex-wrap">{DAYS.map((d, i) => <button key={d} type="button" onClick={() => setV({ ...v, workingDays: v.workingDays.includes(i) ? v.workingDays.filter((x) => x !== i) : [...v.workingDays, i].sort() })} className={`pill ${v.workingDays.includes(i) ? 'border-primary text-primary bg-primary-soft' : ''}`}>{d}</button>)}</div></Field></div>)}
      {card('Files & training uploads', FolderOpen, <div className="space-y-3">
        <Field label="Allowed document types (Files Corner)"><div className="flex flex-wrap gap-1.5">{FILE_TYPES.map((t) => <button key={t} type="button" className={`pill uppercase ${v.allowedTypes.includes(t) ? 'border-primary text-primary bg-primary-soft' : ''}`} onClick={() => setV({ ...v, allowedTypes: v.allowedTypes.includes(t) ? v.allowedTypes.filter((x) => x !== t) : [...v.allowedTypes, t] })}>{t}</button>)}</div></Field>
        <div className="grid sm:grid-cols-2 gap-3"><Field label="Max document size (MB)"><Input type="number" min={1} max={500} value={v.maxSizeMb} onChange={(e) => setV({ ...v, maxSizeMb: Number(e.target.value) })} /></Field><Field label="Max training video size (MB)"><Input type="number" min={10} max={2000} value={v.maxVideoSizeMb} onChange={(e) => setV({ ...v, maxVideoSizeMb: Number(e.target.value) })} /></Field></div>
      </div>)}
      <p className="text-[12.5px] text-ink-3">Organisation ID: <code className="font-mono">{org?.id}</code> · slug <code className="font-mono">{org?.slug}</code>. Every record carries this ID, which is what makes a future multi-tenant rollout possible without a migration.</p>
    </div>
  );
}
