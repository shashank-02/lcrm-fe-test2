import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Avatar, Button, Empty, Input, PageHeader, PillSelect, Spinner, Tabs } from '@/components/ui';
import { api, downloadFile, errorMessage, qs } from '@/lib/api';
import { useBootstrap } from '@/store/bootstrap';
import { TopUpReport } from './TopUpReport';
import { useCan } from '@/store/auth';

interface Perf { userId: string; name: string; role: string; teamName: string; avatarColor?: string; total: number; open: number; won: number; contactedToday: number; withFollowUp: number; overdue: number; createdInRange: number; contactedInRange: number; callsInRange: number; talkTimeSec: number; conversionRate: number; followUpCompliance: number }
interface TeamRow { teamId: string | null; name: string; manager: string; total: number; won: number; contactedToday: number; unassigned: number; conversionRate: number }
const tip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12.5, color: 'var(--text)' }, cursor: { fill: 'var(--surface-2)' } };
const day = (o: number) => new Date(Date.now() - o * 86_400_000).toISOString().slice(0, 10);

export default function ReportsPage() {
  const { boot } = useBootstrap(); const can = useCan();
  const [from, setFrom] = useState(day(29)); const [to, setTo] = useState(day(0)); const [teamId, setTeam] = useState(''); const [userId, setUser] = useState('');
  const [tab, setTab] = useState<'agents' | 'teams' | 'trend' | 'topup'>(can('report.view_team', 'report.view_org') ? 'agents' : 'trend');
  const p = { from, to, teamId, userId };
  const perf = useQuery({ queryKey: ['perf', p], queryFn: async () => (await api.get<{ data: Perf[] }>(`/reports/performance${qs(p)}`)).data.data, enabled: can('report.view_team', 'report.view_org') });
  const teams = useQuery({ queryKey: ['team-report', p], queryFn: async () => (await api.get<{ data: TeamRow[] }>(`/reports/teams${qs(p)}`)).data.data, enabled: can('report.view_team', 'report.view_org') });
  const trend = useQuery({ queryKey: ['trend', p], queryFn: async () => (await api.get<{ data: { date: string; created: number; contacted: number; calls: number }[] }>(`/reports/trend${qs(p)}`)).data.data });
  const exportCsv = async () => { try { await downloadFile(`/leads/export${qs({ from, to, teamId, ownerId: userId })}`, `leads-${from}-to-${to}.csv`); } catch (e) { toast.error(errorMessage(e)); } };
  const tabs = [...(can('report.view_team', 'report.view_org') ? [{ key: 'agents' as const, label: 'Agent performance' }, { key: 'teams' as const, label: 'Teams' }] : []), { key: 'trend' as const, label: 'Daily trend' }, ...(can('topup.view') ? [{ key: 'topup' as const, label: 'Top-up follow-ups' }] : [])];
  return (
    <div>
      <PageHeader title="Reports" subtitle="Performance across the leads you can see." actions={can('lead.export') && <Button onClick={exportCsv}><Download size={15} /> Export leads (CSV)</Button>} />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40 h-8 text-[13px]" /><span className="text-ink-3">to</span><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40 h-8 text-[13px]" />
        {[['7d', 6], ['30d', 29], ['90d', 89]].map(([l, o]) => <button key={l} className="pill" onClick={() => { setFrom(day(o as number)); setTo(day(0)); }}>{l}</button>)}
        {boot.teams.length > 0 && <PillSelect label="Team" value={teamId} onChange={setTeam} options={boot.teams.map((t) => ({ value: t.id, label: t.name }))} />}
        {can('report.view_team', 'report.view_org') && <PillSelect label="Agent" value={userId} onChange={setUser} options={boot.users.map((u) => ({ value: u.id, label: u.name }))} />}
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-4" />

      {tab === 'agents' && (perf.isLoading ? <Spinner /> : !perf.data?.length ? <Empty title="No owned leads in this scope" /> : (
        <div className="card overflow-auto"><table className="w-full"><thead><tr>{['Agent', 'Team', 'Total', 'Open', 'Won', 'Conv %', 'Created', 'Contacted', 'Calls', 'Talk time', 'Contacted today', 'Follow-up %', 'Overdue'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{perf.data.map((r) => <tr key={r.userId} className="hover:bg-surface-2/60"><td className="td"><span className="inline-flex items-center gap-2"><Avatar name={r.name} color={r.avatarColor} size={22} />{r.name}</span></td><td className="td text-ink-2">{r.teamName || '—'}</td><td className="td tabular-nums">{r.total}</td><td className="td tabular-nums">{r.open}</td><td className="td tabular-nums text-success font-medium">{r.won}</td><td className="td tabular-nums">{r.conversionRate}%</td><td className="td tabular-nums">{r.createdInRange}</td><td className="td tabular-nums">{r.contactedInRange}</td><td className="td tabular-nums">{r.callsInRange}</td><td className="td tabular-nums">{Math.round(r.talkTimeSec / 60)} min</td><td className="td tabular-nums">{r.contactedToday}</td><td className="td tabular-nums"><span className={r.followUpCompliance < 50 ? 'text-warning' : ''}>{r.followUpCompliance}%</span></td><td className="td tabular-nums"><span className={r.overdue ? 'text-danger font-medium' : ''}>{r.overdue}</span></td></tr>)}</tbody></table>
          <p className="px-3 py-2 text-[12px] text-ink-3 border-t border-line">Created, contacted, calls and talk time use the selected date range. Total/open/won and follow-up compliance are current snapshots.</p></div>))}

      {tab === 'teams' && (teams.isLoading ? <Spinner /> : !teams.data?.length ? <Empty title="No team data" /> : (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card overflow-auto"><table className="w-full"><thead><tr>{['Team', 'Manager', 'Leads', 'Won', 'Conv %', 'Contacted today', 'Unassigned'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead><tbody>{teams.data.map((t) => <tr key={t.teamId ?? 'none'}><td className="td font-medium">{t.name}</td><td className="td text-ink-2">{t.manager || '—'}</td><td className="td tabular-nums">{t.total}</td><td className="td tabular-nums text-success">{t.won}</td><td className="td tabular-nums">{t.conversionRate}%</td><td className="td tabular-nums">{t.contactedToday}</td><td className="td tabular-nums">{t.unassigned}</td></tr>)}</tbody></table></div>
          <div className="card p-4"><h3 className="text-[14px] font-semibold mb-2">Leads vs won by team</h3><ResponsiveContainer width="100%" height={260}><BarChart data={teams.data} margin={{ left: -20 }}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="total" name="Leads" fill="#185FA5" radius={[4, 4, 0, 0]} /><Bar dataKey="won" name="Won" fill="#1B8A5A" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </div>))}

      {tab === 'topup' && <TopUpReport from={from} to={to} userId={userId} />}
      {tab === 'trend' && (trend.isLoading ? <Spinner /> : (
        <div className="card p-4"><h3 className="text-[14px] font-semibold mb-2">Created · contacted · calls per day</h3><ResponsiveContainer width="100%" height={320}><BarChart data={trend.data ?? []} margin={{ left: -20 }}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="created" name="Created" fill="#185FA5" /><Bar dataKey="contacted" name="Contacted" fill="#1B8A5A" /><Bar dataKey="calls" name="Calls logged" fill="#B7791F" /></BarChart></ResponsiveContainer></div>))}
    </div>
  );
}
