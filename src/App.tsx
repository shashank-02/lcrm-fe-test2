import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { Spinner } from '@/components/ui';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const LeadsPage = lazy(() => import('@/pages/leads/LeadsPage'));
const LeadDetailPage = lazy(() => import('@/pages/leads/LeadDetailPage'));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'));
const AdminRoutes = lazy(() => import('@/pages/admin/AdminRoutes'));
const ProjectAdminRoutes = lazy(() => import('@/pages/admin/ProjectAdminRoutes'));
const FilesPage = lazy(() => import('@/pages/FilesPage'));
const TrainingPage = lazy(() => import('@/pages/TrainingPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.accessToken); const user = useAuth((s) => s.user);
  const loc = useLocation();
  if (!token || !user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <>{children}</>;
}

const Loading = () => <div className="flex justify-center py-20"><Spinner /></div>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route index element={<Suspense fallback={<Loading />}><DashboardPage /></Suspense>} />
        <Route path="leads" element={<Suspense fallback={<Loading />}><LeadsPage /></Suspense>} />
        <Route path="leads/:id" element={<Suspense fallback={<Loading />}><LeadDetailPage /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={<Loading />}><ReportsPage /></Suspense>} />
        <Route path="admin/*" element={<Suspense fallback={<Loading />}><AdminRoutes /></Suspense>} />
        <Route path="project-admin/*" element={<Suspense fallback={<Loading />}><ProjectAdminRoutes /></Suspense>} />
        <Route path="files" element={<Suspense fallback={<Loading />}><FilesPage /></Suspense>} />
        <Route path="training" element={<Suspense fallback={<Loading />}><TrainingPage /></Suspense>} />
        <Route path="settings/profile" element={<Suspense fallback={<Loading />}><ProfilePage /></Suspense>} />
        <Route path="settings" element={<Navigate to="/settings/profile" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
