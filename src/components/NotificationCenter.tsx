import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlarmClock, Bell, BellRing, CalendarClock, Check, CheckCheck, ExternalLink, Phone, StickyNote, UserPlus, Wallet, X, ShieldAlert, ClipboardList } from 'lucide-react';
import { Badge, Button, Empty, Menu, Spinner, Tabs } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { cn, fmtRelative, fmtDateTime } from '@/lib/utils';
import { useCan } from '@/store/auth';
import type { Notification } from '@/types';

const ICON: Record<string, React.ElementType> = { followup_due: CalendarClock, followup_overdue: AlarmClock, callback_due: Phone, task_due: ClipboardList, note_reminder: StickyNote, topup_due: Wallet, lead_assigned: UserPlus, lead_reassigned: UserPlus, admin_note: StickyNote, admin_update: ShieldAlert, admin_status: ShieldAlert, admin_stage: ShieldAlert, admin_request: ShieldAlert, system: Bell };
const FILTERS = [{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread' }, { key: 'followups', label: 'Follow-ups' }, { key: 'assignments', label: 'Assignments' }, { key: 'admin', label: 'Admin actions' }, { key: 'reminders', label: 'Reminders' }] as const;
type Filter = (typeof FILTERS)[number]['key'];

export function useUnreadCount(enabled: boolean) {
  return useQuery({ queryKey: ['notif-unread'], queryFn: async () => (await api.get<{ data: { unread: number; popups: Notification[] } }>('/notifications/unread-count')).data.data, refetchInterval: 30_000, enabled, staleTime: 10_000 });
}

/** Actions shared by the panel and the persistent pop-ups. */
export function useNotificationActions() {
  const qc = useQueryClient(); const nav = useNavigate();
  const inv = () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['notif-unread'] }); };
  const act = useMutation({ mutationFn: ({ id, action, body }: { id: string; action: 'read' | 'complete' | 'dismiss' | 'snooze'; body?: Record<string, unknown> }) => api.post(`/notifications/${id}/${action}`, body ?? {}), onSuccess: inv, onError: (e) => toast.error(errorMessage(e)) });
  const readAll = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: inv, onError: (e) => toast.error(errorMessage(e)) });
  const open = (n: Notification, close?: () => void) => { if (n.status === 'pending') act.mutate({ id: n.id, action: 'read' }); close?.(); if (n.leadId) nav(`/leads/${n.leadId}${n.ref?.kind === 'topup' ? '?topup=1' : n.type.startsWith('followup') || n.type === 'callback_due' ? '?call=1' : ''}`); };
  return { act, readAll, open };
}

export function NotificationBell() {
  const can = useCan(); const enabled = can('notification.view');
  const unread = useUnreadCount(enabled);
  const [filter, setFilter] = useState<Filter>('all');
  const count = unread.data?.unread ?? 0;
  if (!enabled) return null;
  return (
    <Menu align="right" trigger={(open) => (
      <button className={cn('relative h-9 w-9 rounded-md grid place-items-center text-ink-2 hover:bg-surface-2 hover:text-ink', open && 'bg-surface-2 text-ink')} title="Notifications" aria-label={`Notifications, ${count} unread`}>
        {count ? <BellRing size={18} /> : <Bell size={18} />}
        {count > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10.5px] font-semibold grid place-items-center tabular-nums">{count > 99 ? '99+' : count}</span>}
      </button>)}>
      {(close) => <NotificationPanel filter={filter} setFilter={setFilter} close={close} />}
    </Menu>
  );
}

function NotificationPanel({ filter, setFilter, close }: { filter: Filter; setFilter: (f: Filter) => void; close: () => void }) {
  const q = useQuery({ queryKey: ['notifications', filter], queryFn: async () => (await api.get<{ data: { items: Notification[]; unread: number } }>(`/notifications?filter=${filter}&limit=40`)).data.data });
  const { act, readAll, open } = useNotificationActions();
  return (
    <div className="w-[min(420px,calc(100vw-24px))]" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1"><h3 className="font-semibold text-[14px]">Notifications</h3>{(q.data?.unread ?? 0) > 0 && <button className="text-[12px] text-primary hover:underline inline-flex items-center gap-1" onClick={() => readAll.mutate()}><CheckCheck size={13} /> Mark all read</button>}</div>
      <Tabs tabs={FILTERS.map((f) => ({ key: f.key, label: f.label }))} value={filter} onChange={setFilter} className="px-2 [&_button]:h-8 [&_button]:px-2 [&_button]:text-[12.5px]" />
      <div className="max-h-[60vh] overflow-y-auto scroll-thin">
        {q.isLoading ? <div className="py-8 flex justify-center"><Spinner /></div> : !q.data?.items.length ? <Empty title="You're all caught up" hint="Reminders, assignments and admin actions on your leads appear here and stay until you act on them." icon={<Bell size={24} />} /> : (
          <ul className="divide-y divide-line">{q.data.items.map((n) => <NotificationRow key={n.id} n={n} onOpen={() => open(n, close)} onAct={(a, body) => act.mutate({ id: n.id, action: a, body })} />)}</ul>)}
      </div>
    </div>
  );
}

export function NotificationRow({ n, onOpen, onAct, compact }: { n: Notification; onOpen: () => void; onAct: (a: 'read' | 'complete' | 'dismiss' | 'snooze', body?: Record<string, unknown>) => void; compact?: boolean }) {
  const Icon = ICON[n.type] ?? Bell;
  const tone = n.priority === 'high' ? 'text-danger' : n.priority === 'medium' ? 'text-warning' : 'text-primary';
  return (
    <li className={cn('px-3 py-2.5 hover:bg-surface-2/70 transition-colors', n.status === 'pending' && 'bg-primary-soft/40')}>
      <div className="flex gap-2.5">
        <span className={cn('mt-0.5 h-8 w-8 rounded-md grid place-items-center shrink-0 bg-surface-2', tone)}><Icon size={16} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5"><p className="text-[13px] font-semibold truncate">{n.title}</p>{n.priority === 'high' && <Badge color="#C23B3B" soft className="h-[18px] text-[10.5px]">High</Badge>}{n.status === 'pending' && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}</div>
          {n.leadName && <button onClick={onOpen} className="text-[12.5px] text-primary hover:underline">{n.leadName}</button>}
          {!compact && <p className="text-[12.5px] text-ink-2 mt-0.5 line-clamp-2">{n.body}</p>}
          <p className="text-[11.5px] text-ink-3 mt-1" title={fmtDateTime(n.createdAt)}>{n.scheduledAt ? `Scheduled ${fmtDateTime(n.scheduledAt)} · ` : ''}{fmtRelative(n.createdAt)}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {n.leadId && <Button size="sm" variant="primary" className="h-7 text-[12px]" onClick={onOpen}><ExternalLink size={12} /> Open lead</Button>}
            {['followups', 'reminders'].includes(n.category) && <Button size="sm" className="h-7 text-[12px]" onClick={() => onAct('snooze', { minutes: 60 })} title="Remind me in 1 hour"><AlarmClock size={12} /> 1 hour</Button>}
            {['followups', 'reminders'].includes(n.category) && <Button size="sm" className="h-7 text-[12px]" onClick={() => onAct('complete')}><Check size={12} /> Complete</Button>}
            <Button size="sm" variant="ghost" className="h-7 text-[12px] text-ink-3" onClick={() => onAct('dismiss')} title="Dismiss"><X size={12} /> Close</Button>
          </div>
        </div>
      </div>
    </li>
  );
}

/** Persistent pop-ups for high-priority reminders. They stay until the user acts; refresh does not clear them. */
export function NotificationPopups() {
  const can = useCan(); const unread = useUnreadCount(can('notification.view'));
  const { act, open } = useNotificationActions();
  const [hidden, setHidden] = useState<Set<string>>(new Set()); // minimised in this tab only
  const popups = useMemo(() => (unread.data?.popups ?? []).filter((p) => !hidden.has(p.id)).slice(0, 3), [unread.data, hidden]);
  useEffect(() => { setHidden((h) => new Set(Array.from(h).filter((id) => (unread.data?.popups ?? []).some((p) => p.id === id)))); }, [unread.data]);
  if (!popups.length) return null;
  return (
    <div className="fixed bottom-4 left-4 z-40 flex flex-col gap-2 w-[min(380px,calc(100vw-32px))]">
      {popups.map((n) => (
        <div key={n.id} className="card shadow-pop border-l-4 border-l-danger">
          <div className="flex items-center justify-between px-3 pt-2"><span className="text-[12px] font-semibold text-danger inline-flex items-center gap-1"><BellRing size={13} /> Reminder</span><button className="text-ink-3 hover:text-ink" title="Minimise (stays in notification centre)" onClick={() => setHidden((h) => new Set(h).add(n.id))}><X size={14} /></button></div>
          <ul><NotificationRow n={n} compact={false} onOpen={() => open(n)} onAct={(a, body) => act.mutate({ id: n.id, action: a, body })} /></ul>
        </div>
      ))}
    </div>
  );
}
