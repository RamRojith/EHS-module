import { ArrowLeft, Compass, LifeBuoy } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { Button, Card, CardContent } from '@/components/ui';

const SUGGESTIONS = [
  { label: 'Corporate dashboard', to: '/corporate' },
  { label: 'Business units', to: '/units' },
  { label: 'Incident register', to: '/incidents' },
  { label: 'Corrective actions', to: '/capa' },
];

export function NotFound() {
  const location = useLocation();

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-5 p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-safety-50 text-safety-600">
            <Compass className="h-6 w-6" />
          </span>
          <div>
            <p className="text-3xl font-semibold tracking-tight text-ink-900">404</p>
            <h1 className="mt-1 text-base font-semibold text-ink-900">This page is not part of the EHS module</h1>
            <p className="mt-1.5 text-sm text-ink-500">
              Nothing is registered at{' '}
              <span className="font-mono text-xs text-ink-700">{location.pathname}</span>. It may have been moved or renamed.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <Link key={s.to} to={s.to}>
                <Button variant="outline" size="sm">
                  {s.label}
                </Button>
              </Link>
            ))}
          </div>
          <Link to="/dashboard">
            <Button variant="primary">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Button>
          </Link>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-ink-400">
            <LifeBuoy className="h-3 w-3" />
            Need access to a module you cannot see? Ask your EHS administrator to extend your role permissions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default NotFound;
