import { useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Columns3, GitBranch, LayoutList, Layers, ListOrdered, Puzzle, Radio, Settings, ShieldCheck, SlidersHorizontal, Users, Users2, Workflow, Zap, ScrollText, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBootstrap } from '@/store/bootstrap';
import { useCan } from '@/store/auth';
import UsersPage from './UsersPage';
import TeamsPage from './TeamsPage';
import SettingsPage from './SettingsPage';
import { ConfigCrudPage } from './ConfigCrudPage';
import { rulesSpec, sourcesSpec, stagesSpec, statusesSpec, templatesSpec } from './configSpecs';
import { AuditLogPage, ColumnGroupsPage, ColumnsPage, FeaturePermissionsPage, LayoutPage, PrioritizationPage, fbEventsSpec, viewGroupsSpec, viewTabsSpec } from './projectPages';

type Item = { to: string; label: string; icon: React.ElementType; children?: { to: string; label: string; icon?: React.ElementType }[] };
const MENU: Item[] = [
  { to: 'settings', label: 'Settings', icon: Settings }, { to: 'members', label: 'Members', icon: Users }, { to: 'teams', label: 'Teams', icon: Users2 }, { to: 'templates', label: 'Templates', icon: Puzzle }, { to: 'sources', label: 'Sources', icon: Radio }, { to: 'stages', label: 'Stages', icon: GitBranch }, { to: 'statuses', label: 'Statuses', icon: Tag },
  { to: 'lead-settings', label: 'Lead Settings', icon: LayoutList, children: [{ to: 'lead-settings/layout', label: 'Create Layout' }, { to: 'lead-settings/columns', label: 'Columns' }, { to: 'lead-settings/column-groups', label: 'Columns Groups' }] },
  { to: 'views', label: 'Views', icon: Columns3, children: [{ to: 'views/tabs', label: 'View Tabs' }, { to: 'views/groups', label: 'View Groups' }] },
  { to: 'prioritization', label: 'Prioritization', icon: ListOrdered },
  { to: 'automations', label: 'Automations', icon: Zap, children: [{ to: 'automations/assignment', label: 'Lead Assignment' }, { to: 'automations/fb-events', label: 'FB Conversion Events' }] },
  { to: 'feature-permissions', label: 'Feature Permissions', icon: ShieldCheck }, { to: 'audit-log', label: 'Audit Log', icon: ScrollText },
];

export default function ProjectAdminRoutes() {
  const can = useCan(); const { boot } = useBootstrap(); const loc = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(MENU.filter((m) => m.children).map((m) => [m.to, loc.pathname.includes(`/project-admin/${m.to}`)])));
  if (!can('admin.project')) return <Navigate to="/" replace />;
  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-6 items-start">
      <nav className="flex md:flex-col gap-0.5 overflow-x-auto scroll-hidden -mx-1 px-1 md:sticky md:top-[72px]">
        <h1 className="hidden md:block text-[12px] font-semibold text-ink-3 px-2.5 mb-1">Project Administration</h1>
        {MENU.map((m) => m.children ? (
          <div key={m.to} className="shrink-0">
            <button onClick={() => setOpen((o) => ({ ...o, [m.to]: !o[m.to] }))} className={cn('w-full px-2.5 h-8 flex items-center gap-2 rounded-md text-[13.5px] whitespace-nowrap text-ink-2 hover:bg-surface-2 hover:text-ink', loc.pathname.includes(`/project-admin/${m.to}`) && 'text-ink font-medium')}><m.icon size={15} className="shrink-0" /><span className="flex-1 text-left">{m.label}</span>{open[m.to] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
            {(open[m.to] || !window.matchMedia('(min-width: 768px)').matches) && <div className="md:pl-5 flex md:flex-col gap-0.5">{m.children.map((c) => <NavLink key={c.to} to={c.to} className={({ isActive }) => cn('px-2.5 h-8 flex items-center rounded-md text-[13px] whitespace-nowrap', isActive ? 'bg-primary-soft text-primary font-medium' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')}>{c.label}</NavLink>)}</div>}
          </div>
        ) : <NavLink key={m.to} to={m.to} className={({ isActive }) => cn('px-2.5 h-8 flex items-center gap-2 rounded-md text-[13.5px] whitespace-nowrap shrink-0', isActive ? 'bg-primary-soft text-primary font-medium' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')}><m.icon size={15} className="shrink-0" /> {m.label}</NavLink>)}
      </nav>
      <div className="min-w-0">
        <Routes>
          <Route index element={<Navigate to="settings" replace />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="members" element={<UsersPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="templates" element={<ConfigCrudPage spec={templatesSpec()} />} />
          <Route path="sources" element={<ConfigCrudPage spec={sourcesSpec()} />} />
          <Route path="stages" element={<ConfigCrudPage spec={stagesSpec()} />} />
          <Route path="statuses" element={<ConfigCrudPage spec={statusesSpec(boot)} />} />
          <Route path="lead-settings" element={<Navigate to="layout" replace />} />
          <Route path="lead-settings/layout" element={<LayoutPage />} />
          <Route path="lead-settings/columns" element={<ColumnsPage />} />
          <Route path="lead-settings/column-groups" element={<ColumnGroupsPage />} />
          <Route path="views" element={<Navigate to="tabs" replace />} />
          <Route path="views/tabs" element={<ConfigCrudPage spec={viewTabsSpec(boot)} />} />
          <Route path="views/groups" element={<ConfigCrudPage spec={viewGroupsSpec()} />} />
          <Route path="prioritization" element={<PrioritizationPage />} />
          <Route path="automations" element={<Navigate to="assignment" replace />} />
          <Route path="automations/assignment" element={<ConfigCrudPage spec={rulesSpec(boot)} />} />
          <Route path="automations/fb-events" element={<ConfigCrudPage spec={fbEventsSpec(boot)} />} />
          <Route path="feature-permissions" element={<FeaturePermissionsPage />} />
          <Route path="audit-log" element={<AuditLogPage />} />
          <Route path="*" element={<Navigate to="settings" replace />} />
        </Routes>
      </div>
    </div>
  );
}
export { Layers, SlidersHorizontal, Workflow };
