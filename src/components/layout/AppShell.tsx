import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart3, Briefcase, ChevronDown, ChevronsLeft, ChevronsRight, FolderOpen, GraduationCap, LayoutDashboard, LogOut, Menu as MenuIcon, Moon, Search, Settings, Shield, Sun, UserCircle, Users, Users2, Check } from 'lucide-react';
import { Avatar, Button, Confirm, Menu, Input } from '@/components/ui';
import { useAuth, useCan } from '@/store/auth';
import { useTheme } from '@/store/theme';
import { useBootstrap } from '@/store/bootstrap';
import { useViewContext } from '@/store/context';
import { cn, ROLE_LABEL } from '@/lib/utils';
import { NotificationBell, NotificationPopups } from '@/components/NotificationCenter';
import { toast } from 'sonner';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, perm: null },
  { to: '/leads', label: 'Leads', icon: Users, perm: 'lead.view' },
  { to: '/reports', label: 'Reports', icon: BarChart3, perm: 'report.view_own' },
  { to: '/admin', label: 'Administration', icon: Shield, perm: 'admin.users,admin.teams,admin.permissions,admin.pipeline,admin.fields,admin.templates,admin.assignment_rules,admin.imports,lead.import' },
  { to: '/project-admin', label: 'Project Administration', icon: Briefcase, perm: 'admin.project' },
  { to: '/settings/profile', label: 'Profile Settings', icon: UserCircle, perm: null, group: 'Settings' },
  { to: '/files', label: 'Files', icon: FolderOpen, perm: 'files.view' },
];
const BOTTOM = [{ to: '/training', label: 'Training', icon: GraduationCap, perm: 'training.view' }];

/** Single logout flow used by the sidebar and the user menu. */
export function useLogout() {
  const logout = useAuth((s) => s.logout); const nav = useNavigate(); const qc = useQueryClient();
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const confirm = async () => { setBusy(true); try { await logout(); qc.clear(); nav('/login', { replace: true }); } catch { toast.error('Could not end the session. Try again.'); } finally { setBusy(false); setOpen(false); } };
  const dialog = <Confirm open={open} onClose={() => setOpen(false)} onConfirm={confirm} loading={busy} danger title="Logout" body="Are you sure you want to logout? Your session will be ended on this device." confirmLabel="Logout" />;
  return { ask: () => setOpen(true), dialog };
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('lead-crm-sidebar') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setMobileOpen(false); }, [loc.pathname]);
  useEffect(() => { localStorage.setItem('lead-crm-sidebar', collapsed ? '1' : '0'); }, [collapsed]);
  const can = useCan();
  const { boot } = useBootstrap();
  const items = NAV.filter((n) => !n.perm || can(...n.perm.split(',')));
  const bottom = BOTTOM.filter((n) => !n.perm || can(...n.perm.split(',')));
  const { ask, dialog } = useLogout();
  const link = (n: { to: string; label: string; icon: React.ElementType }) => (
    <NavLink key={n.to} to={n.to} end={n.to === '/'} title={n.label} className={({ isActive }) => cn('flex items-center gap-2.5 h-9 px-2.5 rounded-md text-[13.5px] transition-colors touch-target', isActive ? 'bg-primary-soft text-primary font-medium' : 'text-ink-2 hover:bg-surface-2 hover:text-ink', collapsed && 'md:justify-center md:px-0')}>
      <n.icon size={17} strokeWidth={1.9} className="shrink-0" />{!collapsed && <span className="truncate">{n.label}</span>}
    </NavLink>);
  return (
    <div className="min-h-screen flex">
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={cn('fixed md:sticky top-0 z-40 h-screen shrink-0 flex flex-col bg-surface border-r border-line transition-[width,transform] duration-200', collapsed ? 'md:w-[60px]' : 'md:w-[232px]', 'w-[248px]', mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0')}>
        <div className={cn('h-14 flex items-center gap-2.5 px-3.5 border-b border-line', collapsed && 'md:justify-center md:px-0')}>
          {boot.org?.branding?.logoKey ? <img src={`${import.meta.env.VITE_API_URL || ''}/api/v1/public/branding/logo`} alt={boot.org.name} className="h-8 w-8 rounded-md object-contain bg-white shrink-0" /> : <span className="h-8 w-8 rounded-md bg-primary text-white grid place-items-center font-bold shrink-0">{(boot.org?.name ?? 'L')[0]}</span>}
          {!collapsed && <div className="min-w-0"><p className="font-semibold truncate leading-5">{boot.org?.name ?? 'Lead CRM'}</p><p className="text-[11.5px] text-ink-3 leading-4">Lead management</p></div>}
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scroll-thin">
          {items.filter((n) => !n.group).map(link)}
          {items.some((n) => n.group) && <>{!collapsed && <p className="px-2.5 pt-3 pb-1 text-[11.5px] font-semibold text-ink-3 inline-flex items-center gap-1.5"><Settings size={12} /> Settings</p>}{items.filter((n) => n.group).map(link)}</>}
        </nav>
        <div className="px-2 pb-2 space-y-0.5 border-t border-line pt-2">
          {bottom.map(link)}
          <button onClick={ask} title="Logout" className={cn('w-full flex items-center gap-2.5 h-9 px-2.5 rounded-md text-[13.5px] text-ink-2 hover:bg-danger/10 hover:text-danger transition-colors touch-target', collapsed && 'md:justify-center md:px-0')}><LogOut size={17} strokeWidth={1.9} className="shrink-0" />{!collapsed && <span>Logout</span>}</button>
        </div>
        <button onClick={() => setCollapsed((c) => !c)} className="hidden md:flex h-9 items-center justify-center text-ink-3 hover:text-ink border-t border-line" aria-label="Toggle sidebar">{collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}</button>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} onLogout={ask} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-[1600px] w-full mx-auto min-w-0"><Outlet /></main>
      </div>
      <NotificationPopups />
      {dialog}
    </div>
  );
}

/** Team / member context switcher — options are exactly the teams and members the API says this user may see. */
function ContextSwitcher() {
  const { boot } = useBootstrap(); const can = useCan(); const me = useAuth((s) => s.user)!;
  const ctx = useViewContext(); const [q, setQ] = useState('');
  if (!can('context.view')) return null;
  const teams = boot.teams; const users = boot.users.filter((u) => u.id !== me.id);
  const options = useMemo(() => { const rx = q.toLowerCase(); return { teams: teams.filter((t) => t.name.toLowerCase().includes(rx)), users: users.filter((u) => u.name.toLowerCase().includes(rx)) }; }, [teams, users, q]);
  if (!teams.length && !users.length) return null;
  const canSwitch = can('context.switch');
  return (
    <Menu align="right" trigger={(open) => (
      <button className={cn('hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md border border-line bg-surface text-[13px] hover:bg-surface-2 max-w-[220px]', open && 'bg-surface-2', ctx.label && 'border-primary text-primary')} title="Team / member context">
        <Users2 size={15} className="shrink-0" /><span className="truncate">{ctx.label || 'Team / Member'}</span><ChevronDown size={14} className="shrink-0" />
      </button>)}>
      {(close) => (
        <div className="w-[280px]" onClick={(e) => e.stopPropagation()}>
          <div className="p-2 border-b border-line"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teams or members" className="h-8 text-[13px]" autoFocus /></div>
          <div className="max-h-[50vh] overflow-y-auto scroll-thin py-1">
            <button className="menu-item" onClick={() => { ctx.clear(); close(); }}>{!ctx.label && <Check size={14} className="text-primary" />}<span className={cn(!ctx.label && 'font-medium')}>All my leads</span></button>
            {options.teams.length > 0 && <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-ink-3">Teams</p>}
            {options.teams.map((t) => <button key={t.id} className="menu-item" disabled={!canSwitch} onClick={() => { ctx.set({ teamId: t.id, label: t.name }); close(); }}>{ctx.teamId === t.id && <Check size={14} className="text-primary" />}<Users2 size={14} className="text-ink-3" /><span className="truncate">{t.name}</span></button>)}
            {options.users.length > 0 && <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-ink-3">Members</p>}
            {options.users.map((u) => <button key={u.id} className="menu-item" disabled={!canSwitch} onClick={() => { ctx.set({ ownerId: u.id, label: u.name }); close(); }}>{ctx.ownerId === u.id && <Check size={14} className="text-primary" />}<Avatar name={u.name} color={u.avatarColor} src={u.avatarUrl} size={20} /><span className="truncate">{u.name}</span><span className="ml-auto text-[11px] text-ink-3">{u.role ? ROLE_LABEL[u.role] : ''}</span></button>)}
          </div>
          {!canSwitch && <p className="px-3 py-2 text-[11.5px] text-ink-3 border-t border-line">You can see this list but switching is not enabled for your role.</p>}
        </div>)}
    </Menu>
  );
}

function Topbar({ onMenu, onLogout }: { onMenu: () => void; onLogout: () => void }) {
  const user = useAuth((s) => s.user)!;
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (q.trim()) { nav(`/leads?search=${encodeURIComponent(q.trim())}`); setQ(''); } };
  return (
    <header className="h-14 sticky top-0 z-20 bg-bg/85 backdrop-blur border-b border-line flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6">
      <button className="md:hidden text-ink-2 h-9 w-9 grid place-items-center" onClick={onMenu} aria-label="Open menu"><MenuIcon size={20} /></button>
      <form onSubmit={submit} className="relative flex-1 max-w-md min-w-0">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leads…" className="pl-8 h-9 text-[13px]" />
      </form>
      <div className="ml-auto flex items-center gap-1">
        <ContextSwitcher />
        <NotificationBell />
        <Button variant="ghost" size="icon" onClick={toggle} title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</Button>
        <Menu align="right" trigger={() => (
          <button className="flex items-center gap-2 pl-1.5 pr-2 h-9 rounded-md hover:bg-surface-2">
            <Avatar name={user.name} color={user.avatarColor} src={user.avatarUrl} size={26} />
            <span className="hidden lg:block text-left leading-tight"><span className="block text-[13px] font-medium">{user.name}</span><span className="block text-[11px] text-ink-3">{ROLE_LABEL[user.role]}</span></span>
            <ChevronDown size={14} className="hidden lg:block text-ink-3" />
          </button>)}>
          {(close) => <>
            <div className="px-3 py-2 border-b border-line"><p className="text-[13px] font-medium">{user.name}</p><p className="text-[12px] text-ink-3 truncate">{user.email}</p></div>
            <button className="menu-item" onClick={() => { close(); nav('/settings/profile'); }}><UserCircle size={14} /> Profile</button>
            <button className="menu-item" onClick={() => { close(); nav('/settings/profile?edit=1'); }}><Settings size={14} /> Profile Settings</button>
            <button className="menu-item text-danger" onClick={() => { close(); onLogout(); }}><LogOut size={14} /> Logout</button>
          </>}
        </Menu>
      </div>
    </header>
  );
}
