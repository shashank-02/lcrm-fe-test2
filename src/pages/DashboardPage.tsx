import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Avatar, Empty, PageHeader, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { fmtRelative } from '@/lib/utils';
import { useAuth, useCan } from '@/store/auth';
import type { Activity } from '@/types';

interface Dashboard { kpis: Record<string, number>; funnel: { id: string; name: string; color: string; count: number; isWon: boolean; isLost: boolean }[]; byStatus: { id: string; name: string; color: string; count: number }[]; bySource: { id: string; name: string; count: number }[] }
const PALETTE = ['#185FA5', '#1B8A5A', '#B7791F', '#7C3AED', '#C23B3B', '#0891B2', '#BE185D', '#4338CA'];
const tip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12.5, color: 'var(--text)' }, cursor: { fill: 'var(--surface-2)' } };

export default function DashboardPage() {
  const me = useAuth((s) => s.user)!; const can = useCan();
  const d = useQuery({ queryKey: ['dashboard'], queryFn: async () => (await api.get<{ data: Dashboard }>('/reports/dashboard')).data.data });
  const trend = useQuery({ queryKey: ['trend', 14], queryFn: async () => { const to = new Date(); const from = new Date(Date.now() - 13 * 86_400_000); return (await api.get<{ data: { date: string; created: number; contacted: number; calls: number }[] }>(`/reports/trend?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`)).data.data; } });
  const feed = useQuery({ queryKey: ['activity-feed'], queryFn: async () => (await api.get<{ data: Activity[] }>('/reports/activity-feed')).data.data, enabled: can('report.view_team', 'report.view_org') });
  const k = d.data?.kpis;
  const hour = new Date().getHours(); const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  if (d.isLoading) return <div className="py-20 flex justify-center"><Spinner /></div>;
  if (!k) return <Empty title="Nothing to show yet" />;

  const kpis: { label: string; value: number; to: string; tone?: string }[] = [
    { label: 'Follow-ups today', value: k.followUpsToday, to: '/leads?tab=followup_today', tone: 'text-primary' },
    { label: 'Overdue follow-ups', value: k.overdue, to: '/leads?tab=overdue', tone: k.overdue ? 'text-danger' : undefined },
    { label: 'Contacted today', value: k.contactedToday, to: '/leads?tab=contacted_today' },
    { label: 'Created today', value: k.createdToday, to: '/leads?tab=created_today' },
    { label: 'Assigned today', value: k.assignedToday, to: '/leads?tab=assigned_today' },
    { label: 'Unassigned', value: k.unassigned, to: '/leads?tab=unassigned', tone: k.unassigned ? 'text-warning' : undefined },
    { label: 'Open leads', value: k.openLeads, to: '/leads' },
    { label: 'Won · conversion', value: k.won, to: '/leads', tone: 'text-success' },
  ];

  return (
    <div>
      <PageHeader title={`${greet}, ${me.name.split(' ')[0]}`} subtitle="Where your pipeline stands right now." />
      <div className="card grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 divide-x divide-y xl:divide-y-0 divide-line overflow-hidden mb-4">
        {kpis.map((x) => (
          <Link key={x.label} to={x.to} className="p-3.5 hover:bg-surface-2 transition-colors">
            <p className={`text-[26px] leading-8 font-semibold tabular-nums ${x.tone ?? ''}`}>{x.value}{x.label.startsWith('Won') && <span className="text-[13px] text-ink-3 font-normal ml-1.5">{k.conversionRate}%</span>}</p>
            <p className="text-[12.5px] text-ink-2 mt-0.5">{x.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <section className="card p-4 lg:col-span-2">
          <h2 className="text-[14px] font-semibold mb-3">Pipeline funnel</h2>
          <div className="space-y-2">{d.data!.funnel.map((s) => { const max = Math.max(1, ...d.data!.funnel.map((x) => x.count)); return (
            <Link to={`/leads?stageId=${s.id}`} key={s.id} className="grid grid-cols-[150px_1fr_48px] items-center gap-3 text-[13px] group">
              <span className="truncate text-ink-2 group-hover:text-ink">{s.name}</span>
              <span className="h-6 rounded bg-surface-2 overflow-hidden"><span className="block h-full rounded transition-[width]" style={{ width: `${Math.max(2, (s.count / max) * 100)}%`, backgroundColor: s.color }} /></span>
              <span className="text-right tabular-nums font-medium">{s.count}</span>
            </Link>); })}</div>
        </section>
        <section className="card p-4">
          <h2 className="text-[14px] font-semibold mb-1">Leads by source</h2><p className="text-[12px] text-ink-3 mb-2">Last 30 days</p>
          {d.data!.bySource.length ? (
            <div className="flex items-center gap-3"><ResponsiveContainer width={140} height={140}><PieChart><Pie data={d.data!.bySource} dataKey="count" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={2} stroke="none">{d.data!.bySource.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie><Tooltip {...tip} /></PieChart></ResponsiveContainer>
              <ul className="text-[12.5px] space-y-1 flex-1 min-w-0">{d.data!.bySource.slice(0, 7).map((s, i) => <li key={s.id} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} /><span className="truncate text-ink-2">{s.name}</span><span className="ml-auto tabular-nums">{s.count}</span></li>)}</ul></div>
          ) : <p className="text-[13px] text-ink-3 py-8 text-center">No leads created in this period.</p>}
        </section>
        <section className="card p-4 lg:col-span-2">
          <h2 className="text-[14px] font-semibold mb-3">Created vs contacted · last 14 days</h2>
          <ResponsiveContainer width="100%" height={220}><LineChart data={trend.data ?? []} margin={{ left: -20, right: 8, top: 4 }}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip {...tip} /><Line type="monotone" dataKey="created" name="Created" stroke="#185FA5" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="contacted" name="Contacted" stroke="#1B8A5A" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="calls" name="Calls logged" stroke="#B7791F" strokeWidth={2} dot={false} strokeDasharray="4 3" /></LineChart></ResponsiveContainer>
        </section>
        <section className="card p-4">
          <h2 className="text-[14px] font-semibold mb-3">By status</h2>
          <ResponsiveContainer width="100%" height={220}><BarChart data={d.data!.byStatus} layout="vertical" margin={{ left: 10, right: 12 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11.5, fill: 'var(--text-2)' }} axisLine={false} tickLine={false} /><Tooltip {...tip} /><Bar dataKey="count" radius={[0, 4, 4, 0]}>{d.data!.byStatus.map((s) => <Cell key={s.id} fill={s.color} />)}</Bar></BarChart></ResponsiveContainer>
        </section>
        {feed.data && (
          <section className="card p-4 lg:col-span-3">
            <h2 className="text-[14px] font-semibold mb-3">Team activity</h2>
            {feed.data.length ? <ul className="grid md:grid-cols-2 gap-x-6 gap-y-2">{feed.data.slice(0, 14).map((a) => <li key={a.id} className="flex items-center gap-2 text-[13px] min-w-0"><Avatar name={a.user?.name ?? 'S'} color={a.user?.avatarColor} size={22} /><span className="truncate"><span className="font-medium">{a.user?.name ?? 'System'}</span> <span className="text-ink-2">{a.description}</span>{a.lead && <> · <Link to={`/leads/${a.lead.id}`} className="text-primary hover:underline">{a.lead.name || a.lead.phone}</Link></>}</span><span className="ml-auto text-ink-3 text-[12px] whitespace-nowrap">{fmtRelative(a.createdAt)}</span></li>)}</ul> : <p className="text-[13px] text-ink-3">No activity yet.</p>}
          </section>)}
      </div>
    </div>
  );
}
