import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { KeyRound, LogIn, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button, Field, Input } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { API_BASE, errorMessage } from '@/lib/api';
import type { Branding } from '@/types';

const HEADERS = { 'X-Requested-With': 'LeadCRM', ...(import.meta.env.VITE_CLIENT_KEY ? { 'X-Client-Key': import.meta.env.VITE_CLIENT_KEY as string } : {}) };

export function LoginPage() {
  const setSession = useAuth((s) => s.setSession);
  const token = useAuth((s) => s.accessToken);
  const nav = useNavigate(); const loc = useLocation();
  const [identifier, setId] = useState(''); const [password, setPw] = useState(''); const [busy, setBusy] = useState(false);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [otp, setOtp] = useState<{ challengeId: string; expiresAt: string; maskedEmail: string } | null>(null);
  const [code, setCode] = useState(''); const [left, setLeft] = useState(0); const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => { axios.get(`${API_BASE}/public/branding`, { headers: HEADERS }).then((r) => setBranding(r.data.data)).catch(() => setBranding({ name: 'Lead CRM', primaryColor: '#185FA5', logoUrl: null })); }, []);
  useEffect(() => { if (!otp) return; const t = setInterval(() => { setLeft(Math.max(0, Math.round((new Date(otp.expiresAt).getTime() - Date.now()) / 1000))); setCooldown((c) => Math.max(0, c - 1)); }, 1000); return () => clearInterval(t); }, [otp]);
  useEffect(() => { if (otp) setTimeout(() => codeRef.current?.focus(), 50); }, [otp]);
  if (token) return <Navigate to="/" replace />;
  const finish = (data: Parameters<typeof setSession>[0]) => { setSession(data); nav((loc.state as { from?: string } | null)?.from ?? '/', { replace: true }); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { identifier, password }, { headers: HEADERS });
      if (res.data.data.requires2FA) { setOtp(res.data.data); setCode(''); setCooldown(45); setLeft(res.data.data.ttlSeconds ?? 300); }
      else finish(res.data.data);
    } catch (err) { toast.error(errorMessage(err, 'Could not sign in')); } finally { setBusy(false); }
  };
  const verify = async (e?: React.FormEvent) => {
    e?.preventDefault(); if (!otp || code.length !== 6) return; setBusy(true);
    try { const res = await axios.post(`${API_BASE}/auth/verify-otp`, { challengeId: otp.challengeId, code }, { headers: HEADERS }); finish(res.data.data); }
    catch (err) { toast.error(errorMessage(err, 'Incorrect code')); setCode(''); codeRef.current?.focus(); } finally { setBusy(false); }
  };
  const resend = async () => {
    if (!otp || cooldown > 0) return; setBusy(true);
    try { const res = await axios.post(`${API_BASE}/auth/resend-otp`, { challengeId: otp.challengeId }, { headers: HEADERS }); setOtp(res.data.data); setCooldown(45); setLeft(res.data.data.ttlSeconds ?? 300); toast.success('A new code was sent'); }
    catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0');
  const logoSrc = branding?.logoUrl ? `${import.meta.env.VITE_API_URL || ''}${branding.logoUrl}` : null;

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden lg:flex flex-col justify-between p-12 bg-navy text-white">
        <div className="flex items-center gap-3 min-h-[56px]">
          {logoSrc ? <img src={logoSrc} alt={branding?.name} className="max-h-14 max-w-[260px] w-auto h-auto object-contain" /> : <><span className="h-9 w-9 rounded-md bg-white/15 grid place-items-center font-bold">{(branding?.name ?? 'L')[0]}</span><span className="font-semibold text-[15px]">{branding?.name ?? 'Lead CRM'}</span></>}
        </div>
        <div className="max-w-md">
          <h1 className="text-[34px] font-semibold leading-[1.15] tracking-tight">Every call, every follow-up, every disbursement — in one pipeline.</h1>
          <p className="mt-4 text-white/70 text-[15px] leading-relaxed">Built for loan and finance calling teams: role-based visibility, stage rules, document collection and daily follow-up lists.</p>
        </div>
        <p className="text-white/50 text-[12.5px]">Lead → Prospect → Logged → Underwriting → Approved</p>
      </section>
      <section className="flex items-center justify-center p-6 bg-bg dark:bg-[#0B111A]">
        {!otp ? (
          <form onSubmit={submit} className="w-full max-w-[360px] space-y-4">
            <div className="lg:hidden flex items-center gap-2 mb-6 min-h-[40px]">{logoSrc ? <img src={logoSrc} alt={branding?.name} className="max-h-10 max-w-[200px] object-contain" /> : <><span className="h-8 w-8 rounded-md bg-primary text-white grid place-items-center font-bold">{(branding?.name ?? 'L')[0]}</span><span className="font-semibold">{branding?.name ?? 'Lead CRM'}</span></>}</div>
            <div><h2 className="text-[22px] font-semibold">Sign in</h2><p className="text-[13.5px] text-ink-3 mt-1">Use your email, username or phone number.</p></div>
            <Field label="Email, username or phone"><Input autoFocus value={identifier} onChange={(e) => setId(e.target.value)} autoComplete="username" required /></Field>
            <Field label="Password"><Input type="password" value={password} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required /></Field>
            <Button type="submit" variant="primary" className="w-full" loading={busy}><LogIn size={15} /> Sign in</Button>
            <p className="text-[12.5px] text-ink-3 text-center inline-flex items-center justify-center gap-1.5 w-full"><KeyRound size={12} /> Passwords are issued by your administrator. Contact them for a replacement.</p>
          </form>
        ) : (
          <form onSubmit={verify} className="w-full max-w-[360px] space-y-4">
            <div className="h-10 w-10 rounded-md bg-primary-soft text-primary grid place-items-center"><ShieldCheck size={20} /></div>
            <div><h2 className="text-[22px] font-semibold">Check your email</h2><p className="text-[13.5px] text-ink-3 mt-1">We sent a 6-digit code to <span className="text-ink font-medium">{otp.maskedEmail}</span>. Enter it below to finish signing in.</p></div>
            <Field label="Verification code"><Input ref={codeRef} value={code} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setCode(v); if (v.length === 6) setTimeout(() => verify(), 50); }} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" className="text-center text-[22px] tracking-[0.5em] h-12 font-semibold" /></Field>
            <p className={`text-[12.5px] ${left <= 30 ? 'text-danger' : 'text-ink-3'} inline-flex items-center gap-1.5`}><MailCheck size={13} /> {left > 0 ? `Code expires in ${mm}:${ss}` : 'Code expired — request a new one.'}</p>
            <Button type="submit" variant="primary" className="w-full" loading={busy} disabled={code.length !== 6 || left === 0}>Verify and sign in</Button>
            <div className="flex items-center justify-between text-[12.5px]">
              <button type="button" className="text-ink-3 hover:text-ink" onClick={() => setOtp(null)}>← Back</button>
              <button type="button" className="text-primary disabled:text-ink-3 inline-flex items-center gap-1" disabled={cooldown > 0 || busy} onClick={resend}><RefreshCw size={12} /> {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
