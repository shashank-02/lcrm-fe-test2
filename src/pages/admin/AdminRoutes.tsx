import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Tabs } from '@/components/ui';
import { useBootstrap } from '@/store/bootstrap';
import { useCan } from '@/store/auth';
import { cn } from '@/lib/utils';
import UsersPage from './UsersPage';
import TeamsPage from './TeamsPage';
import PermissionsPage from './PermissionsPage';
import ImportsPage from './ImportsPage';
import SettingsPage from './SettingsPage';
import { ConfigCrudPage } from './ConfigCrudPage';
import { directivesSpec, fieldsSpec, rulesSpec, sourcesSpec, stagesSpec, statusesSpec, templatesSpec } from './configSpecs';
import { useState } from 'react';

const NAV = [
  { to: 'users', label: 'Users', perm: ['admin.users'] }, { to: 'teams', label: 'Teams', perm: ['admin.teams'] }, { to: 'permissions', label: 'Permissions', perm: ['admin.permissions'] },
  { to: 'pipeline', label: 'Pipeline', perm: ['admin.pipeline'] }, { to: 'fields', label: 'Lead fields', perm: ['admin.fields'] }, { to: 'templates', label: 'Templates', perm: ['admin.templates'] },
  { to: 'rules', label: 'Assignment rules', perm: ['admin.assignment_rules'] }, { to: 'imports', label: 'Imports', perm: ['lead.import', 'admin.imports'] }, { to: 'settings', label: 'Settings', perm: ['admin.settings'] },
];

export default function AdminRoutes() {
  const can = useCan();
  const items = NAV.filter((n) => can(...n.perm));
  if (!items.length) return <Navigate to="/" replace />;
  return (
    <div className="grid md:grid-cols-[190px_1fr] gap-6 items-start">
      <nav className="flex md:flex-col gap-0.5 overflow-x-auto scroll-thin -mx-1 px-1 md:sticky md:top-[72px]">
        <h1 className="hidden md:block text-[12px] font-semibold text-ink-3 px-2.5 mb-1">Administration</h1>
        {items.map((n) => <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('px-2.5 h-8 flex items-center rounded-md text-[13.5px] whitespace-nowrap', isActive ? 'bg-primary-soft text-primary font-medium' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')}>{n.label}</NavLink>)}
      </nav>
      <div className="min-w-0">
        <Routes>
          <Route index element={<Navigate to={items[0].to} replace />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="permissions" element={<PermissionsPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="fields" element={<FieldsPage />} />
          <Route path="templates" element={<ConfigCrudPage spec={templatesSpec()} />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="imports" element={<ImportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to={items[0].to} replace />} />
        </Routes>
      </div>
    </div>
  );
}

function PipelinePage() {
  const { boot } = useBootstrap();
  const [tab, setTab] = useState<'stages' | 'statuses' | 'sources' | 'directives'>('stages');
  return (
    <div>
      <Tabs tabs={[{ key: 'stages', label: 'Stages' }, { key: 'statuses', label: 'Statuses' }, { key: 'sources', label: 'Sources' }, { key: 'directives', label: 'Stage directives' }]} value={tab} onChange={setTab} className="mb-4" />
      {tab === 'stages' && <ConfigCrudPage spec={stagesSpec()} />}
      {tab === 'statuses' && <ConfigCrudPage spec={statusesSpec(boot)} />}
      {tab === 'sources' && <ConfigCrudPage spec={sourcesSpec()} />}
      {tab === 'directives' && <ConfigCrudPage spec={directivesSpec(boot)} />}
    </div>
  );
}
function FieldsPage() { const { boot } = useBootstrap(); return <ConfigCrudPage spec={fieldsSpec(boot)} />; }
function RulesPage() { const { boot } = useBootstrap(); return <ConfigCrudPage spec={rulesSpec(boot)} />; }
