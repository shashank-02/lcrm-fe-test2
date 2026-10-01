import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { Avatar, Badge, Empty, Pagination, PillSelect, Spinner } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { fmtDate, fmtDateTime } from '@/lib/utils';
import type { ApiList, TopUpReminder } from '@/types';
import { OUTCOME_LABEL } from '@/pages/leads/QuickAccess';

const TONE: Record<string, string> = { scheduled: '#185FA5', due: '#C23B3B', snoozed: '#B7791F', completed: '#1B8A5A', dismissed: '#6B7280' };

/** Admin / manager view: upcoming, due and completed top-up follow-ups with outcomes and responsible agents. */
export function TopUpReport({ from, to, userId }: { from: string; to: string; userId: string }) {
  const [status, setStatus] = useState('open'); const [page, setPage] = useState(1); const [useRange, setUseRange] = useState(false);
  const q = useQuery({ queryKey: ['topup-report', { status, userId, page, from, to, useRange }], queryFn: async () => (await api.get<ApiList<TopUpReminder> & { data: { items: TopUpReminder[]; summary: Record<string, number> } }>(`/topup-reminders${qs({ status, ownerId: userId, page, limit: 50, from: useRange ? from : undefined, to: useRange ? to : undefined })}`)).data, placeholderData: (p) => p });
  const s = q.data?.data.summary ?? {};
  return (
    <div>
      <div className="card grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-line overflow-hidden mb-3">{(['scheduled', 'due', 'snoozed', 'completed', 'dismissed'] as const).map((k) => <button key={k} onClick={() => { setStatus(k); setPage(1); }} className={`p-3 text-left hover:bg-surface-2 ${status === k ? 'bg-primary-soft/50' : ''}`}><p className="text-[22px] font-semibold tabular-nums" style={{ color: TONE[k] }}>{s[k] ?? 0}</p><p className="text-[12px] text-ink-2 capitalize">{k === 'due' ? 'Due now' : k}</p></button>)}</div>
      <div className="flex flex-wrap gap-2 mb-3"><PillSelect label="Show" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: 'open', label: 'Open (scheduled + due + snoozed)' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'due', label: 'Due now' }, { value: 'snoozed', label: 'Snoozed' }, { value: 'completed', label: 'Completed' }, { value: 'dismissed', label: 'Dismissed' }]} /><button className={`pill ${useRange ? 'border-primary text-primary bg-primary-soft' : ''}`} onClick={() => setUseRange((u) => !u)}>Reminder date in selected range</button></div>
      <div className="card overflow-x-auto">{q.isLoading ? <Spinner /> : !q.data?.data.items.length ? <Empty title="No top-up follow-ups" icon={<Wallet size={26} />} hint="Reminders are created automatically 3 months after a lead is disbursed." /> : (
        <table className="w-full min-w-[820px]"><thead><tr>{['Customer', 'Agent', 'Disbursed on', 'Reminder on', 'Status', 'Outcome', 'Completed'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{q.data.data.items.map((r) => <tr key={r.id} className="hover:bg-surface-2/60"><td className="td">{r.lead ? <Link to={`/leads/${r.lead.id}?topup=1`} className="font-medium hover:text-primary">{r.lead.name || r.lead.phone}</Link> : '—'}<span className="block text-[12px] text-ink-3 tabular-nums">{r.lead?.phone}</span></td><td className="td">{r.owner ? <span className="inline-flex items-center gap-1.5"><Avatar name={r.owner.name} color={r.owner.avatarColor} src={r.owner.avatarUrl} size={20} />{r.owner.name}</span> : <span className="text-warning">Unassigned</span>}</td><td className="td tabular-nums">{fmtDate(r.disbursedAt)}</td><td className="td tabular-nums">{fmtDate(r.snoozedUntil ?? r.dueAt)}</td><td className="td"><Badge color={TONE[r.status]}>{r.status === 'due' ? 'Due now' : r.status}</Badge></td><td className="td">{r.outcome ? <span className="font-medium">{OUTCOME_LABEL[r.outcome] ?? r.outcome}</span> : '—'}{r.outcomeNotes && <span className="block text-[12px] text-ink-3 max-w-[260px] truncate" title={r.outcomeNotes}>{r.outcomeNotes}</span>}</td><td className="td tabular-nums text-ink-2">{r.completedAt ? <>{fmtDateTime(r.completedAt)}<span className="block text-[12px] text-ink-3">by {r.completedBy?.name}</span></> : '—'}</td></tr>)}</tbody></table>)}
        <div className="px-3 py-2 border-t border-line"><Pagination page={page} totalPages={q.data?.meta.totalPages ?? 1} total={q.data?.meta.total ?? 0} limit={50} onPage={setPage} onLimit={() => undefined} sizes={[50]} /></div></div>
    </div>
  );
}
