import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, Check, Pencil, Trash2, X, ShieldCheck, Building2, Users2 } from 'lucide-react';
import { Avatar, Badge, Button, Field, Input, PageHeader, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { fmtDate, orDash, ROLE_LABEL, toInputDate } from '@/lib/utils';
import { useAuth } from '@/store/auth';
import { useInvalidateBootstrap } from '@/store/bootstrap';
import type { Profile } from '@/types';

const EDITABLE = ['name', 'phone', 'email', 'employeeId', 'designation', 'dateOfBirth', 'bankName', 'bankAccountName', 'bankAccountNumber', 'ifscCode', 'panNumber'] as const;
type Form = Record<(typeof EDITABLE)[number], string>;

export default function ProfilePage() {
  const [sp] = useSearchParams();
  const me = useAuth((s) => s.user)!; const setUser = useAuth((s) => s.setUser); const invBoot = useInvalidateBootstrap();
  const q = useQuery({ queryKey: ['profile'], queryFn: async () => (await api.get<{ data: Profile }>('/me/profile')).data.data });
  const [editing, setEditing] = useState(sp.get('edit') === '1'); const [form, setForm] = useState<Form | null>(null); const [preview, setPreview] = useState<string | null>(null); const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const p = q.data;
  const toForm = (x: Profile): Form => ({ name: x.name, phone: x.phone, email: x.email, employeeId: x.employeeId ?? '', designation: x.designation ?? '', dateOfBirth: toInputDate(x.dateOfBirth), bankName: x.bankName ?? '', bankAccountName: x.bankAccountName ?? '', bankAccountNumber: x.bankAccountNumber ?? '', ifscCode: x.ifscCode ?? '', panNumber: x.panNumber ?? '' });
  useEffect(() => { if (p && !form) setForm(toForm(p)); }, [p]); // eslint-disable-line react-hooks/exhaustive-deps
  const syncMe = (x: Profile) => { setUser({ ...me, name: x.name, email: x.email, phone: x.phone, avatarUrl: x.avatarUrl, employeeId: x.employeeId, designation: x.designation }); invBoot(); };
  const save = useMutation({
    mutationFn: async () => {
      if (!form) return; const errs: string[] = [];
      if (!form.name.trim()) errs.push('Name is required'); if (!/^\+?[0-9]{8,15}$/.test(form.phone)) errs.push('Phone must be 8–15 digits'); if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.push('Enter a valid email');
      if (form.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(form.panNumber)) errs.push('PAN must look like ABCDE1234F'); if (form.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(form.ifscCode)) errs.push('IFSC must look like HDFC0001234');
      if (errs.length) throw new Error(errs.join('. '));
      const body: Record<string, unknown> = { ...form, dateOfBirth: form.dateOfBirth || null };
      const res = await api.patch<{ data: Profile }>('/me/profile', body);
      if (file) { const fd = new FormData(); fd.append('file', file); await api.post('/me/profile/avatar', fd); }
      return res.data.data;
    },
    onSuccess: async () => { const fresh = (await q.refetch()).data; if (fresh) { setForm(toForm(fresh)); syncMe(fresh); } setEditing(false); setFile(null); setPreview(null); toast.success('Profile updated successfully.'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const removeAvatar = useMutation({ mutationFn: () => api.delete('/me/profile/avatar'), onSuccess: async () => { const fresh = (await q.refetch()).data; if (fresh) syncMe(fresh); setPreview(null); setFile(null); toast.success('Photo removed'); }, onError: (e) => toast.error(errorMessage(e)) });
  const pick = (f: File | null) => { if (!f) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return toast.error('Use a JPG, PNG or WEBP image'); if (f.size > 3 * 1024 * 1024) return toast.error('Image must be under 3 MB'); setFile(f); setPreview(URL.createObjectURL(f)); if (!editing) setEditing(true); };
  const cancel = () => { if (p) setForm(toForm(p)); setEditing(false); setFile(null); setPreview(null); };
  if (q.isLoading || !p || !form) return <div className="py-20 flex justify-center"><Spinner /></div>;
  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f!, [k]: v }));
  const row = (label: string, key: keyof Form, type = 'text', readOnly = false) => (
    <div><dt className="text-[12px] text-ink-3">{label}</dt><dd className="text-[13.5px] mt-0.5">{editing && !readOnly ? <Input sm type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} /> : <span className={type === 'tel' ? 'tabular-nums' : ''}>{key === 'dateOfBirth' ? fmtDate(p.dateOfBirth) : orDash(form[key])}</span>}</dd></div>);
  return (
    <div>
      <PageHeader crumbs={<span>Settings / Profile</span>} title={`Hello, ${p.name}`} actions={editing ? <><Button onClick={cancel}><X size={14} /> Cancel</Button><Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}><Check size={14} /> Save changes</Button></> : <Button variant="primary" onClick={() => setEditing(true)}><Pencil size={14} /> Edit profile</Button>} />
      <div className="grid lg:grid-cols-[280px_1fr_300px] gap-4 items-start">
        <section className="card p-6 flex flex-col items-center text-center">
          <div className="relative">
            {preview || p.avatarUrl ? <img src={preview ?? p.avatarUrl!} alt={p.name} className="h-36 w-36 rounded-full object-cover border-4 border-surface-2" /> : <Avatar name={p.name} color={p.avatarColor} size={144} className="text-[44px] border-4 border-surface-2" />}
            <button type="button" onClick={() => fileRef.current?.click()} className="absolute bottom-1 right-1 h-9 w-9 rounded-full bg-primary text-white grid place-items-center shadow-pop hover:bg-primary-hover" title="Upload / change photo"><Camera size={16} /></button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </div>
          <h2 className="mt-4 font-semibold text-[16px]">{p.name}</h2><p className="text-[13px] text-ink-2 tabular-nums">{p.phone}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5"><Badge>{ROLE_LABEL[p.role]}</Badge>{p.twoFactorEnabled && <Badge color="#1B8A5A" soft><ShieldCheck size={11} className="mr-1" /> 2FA on</Badge>}</div>
          <div className="mt-4 flex gap-2"><Button size="sm" onClick={() => fileRef.current?.click()}><Camera size={13} /> {p.avatarUrl ? 'Change photo' : 'Upload photo'}</Button>{(p.avatarUrl || preview) && <Button size="sm" variant="ghost" className="text-danger" onClick={() => (preview ? (setPreview(null), setFile(null)) : removeAvatar.mutate())}><Trash2 size={13} /> Remove</Button>}</div>
          <p className="text-[11.5px] text-ink-3 mt-3">JPG, PNG or WEBP · up to 3 MB. {preview && 'Preview — press Save changes to apply.'}</p>
        </section>
        <section className="card p-5">
          <h3 className="font-semibold text-[15px] mb-3">Profile details</h3>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
            {row('Name', 'name')}<div><dt className="text-[12px] text-ink-3">Role</dt><dd className="text-[13.5px] mt-0.5">{ROLE_LABEL[p.role]} <span className="text-ink-3 text-[12px]">· set by admin</span></dd></div>
            {row('Email', 'email', 'email')}{row('Phone', 'phone', 'tel')}
            {row('Employee ID', 'employeeId')}<div><dt className="text-[12px] text-ink-3">Group / team</dt><dd className="text-[13.5px] mt-0.5">{orDash(p.teamName)}</dd></div>
            {row('Designation', 'designation')}{row('Date of birth', 'dateOfBirth', 'date')}
            {row('Bank name', 'bankName')}{row('Bank account name', 'bankAccountName')}
            {row('Bank account number', 'bankAccountNumber')}{row('IFSC code', 'ifscCode')}
            {row('PAN number', 'panNumber')}<div><dt className="text-[12px] text-ink-3">Username</dt><dd className="text-[13.5px] mt-0.5">@{p.username}</dd></div>
          </dl>
          <p className="text-[12px] text-ink-3 mt-4 inline-flex items-center gap-1.5"><ShieldCheck size={12} /> Bank account and PAN are encrypted at rest. Role, team and permissions are managed by your administrator.</p>
        </section>
        <div className="space-y-4">
          <section className="card p-5"><h3 className="font-semibold text-[15px] mb-3 inline-flex items-center gap-2"><Building2 size={16} className="text-ink-3" /> Account details</h3><dl className="space-y-3 text-[13.5px]"><div><dt className="text-[12px] text-ink-3">Account name</dt><dd>{p.account.name}</dd></div><div><dt className="text-[12px] text-ink-3">Account owner</dt><dd>{orDash(p.account.owner)}</dd></div><div><dt className="text-[12px] text-ink-3">Owner email</dt><dd className="truncate">{orDash(p.account.ownerEmail)}</dd></div></dl></section>
          <section className="card p-5"><h3 className="font-semibold text-[15px] mb-3 inline-flex items-center gap-2"><Users2 size={16} className="text-ink-3" /> Projects / teams</h3>{p.projects.length ? <ul className="space-y-2 text-[13.5px]">{p.projects.map((t) => <li key={t.id} className="flex items-center gap-2"><span className="text-primary">➤</span><span className="font-medium">{t.name}</span><span className="text-ink-3 text-[12px]">({t.role})</span></li>)}</ul> : <p className="text-[13px] text-ink-3">Not part of any team yet.</p>}<p className="text-[11.5px] text-ink-3 mt-3">Team access is assigned by an administrator.</p></section>
        </div>
      </div>
    </div>
  );
}
