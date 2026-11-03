import { Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DataProvider } from '@/context/DataContext';
import { ToastProvider } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui';
import { AppLayout } from '@/components/layout/AppLayout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { CorporateSafety } from '@/pages/CorporateSafety';
import { UnitsList } from '@/pages/UnitsList';
import { UnitDetail } from '@/pages/UnitDetail';
import { Incidents } from '@/pages/Incidents';
import { NearMisses } from '@/pages/NearMisses';
import { Observations } from '@/pages/Observations';
import { Capa } from '@/pages/Capa';
import { Training } from '@/pages/Training';
import { Ppe } from '@/pages/Ppe';
import { Inspections } from '@/pages/Inspections';
import { Emergency } from '@/pages/Emergency';
import { Reports } from '@/pages/Reports';
import { Notifications } from '@/pages/Notifications';
import { Settings } from '@/pages/Settings';
import { NotFound } from '@/pages/NotFound';

function FullScreenLoader({ label = 'Preparing your workspace…' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-ink-50">
      <Loader2 className="h-6 w-6 animate-spin text-safety-500" />
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady, can } = useAuth();
  const location = useLocation();

  if (!isReady) return <FullScreenLoader label="Restoring session…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const needsPermission = (location.pathname.split('/').filter(Boolean)[0] ?? '') as string;
  if (needsPermission && needsPermission !== 'units' && needsPermission !== 'corporate' && !can(needsPermission)) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<ShieldAlert className="h-5 w-5" />}
          title="You do not have access to this module"
          description="Your role does not include this permission. Contact the Head of EHS if you believe this is an error."
        />
      </div>
    );
  }

  return <>{children}</>;
}

function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady } = useAuth();
  if (!isReady) return <FullScreenLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <Suspense fallback={<FullScreenLoader />}>
            <Routes>
              <Route
                path="/login"
                element={
                  <RedirectIfAuthenticated>
                    <Login />
                  </RedirectIfAuthenticated>
                }
              />

              <Route
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/corporate" element={<CorporateSafety />} />
                <Route path="/units" element={<UnitsList />} />
                <Route path="/units/:unitId" element={<UnitDetail />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/near-misses" element={<NearMisses />} />
                <Route path="/observations" element={<Observations />} />
                <Route path="/capa" element={<Capa />} />
                <Route path="/training" element={<Training />} />
                <Route path="/ppe" element={<Ppe />} />
                <Route path="/inspections" element={<Inspections />} />
                <Route path="/emergency" element={<Emergency />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  );
}
