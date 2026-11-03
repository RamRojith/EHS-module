import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

const COLLAPSE_KEY = 'ehs.sidebar.collapsed';

export function AppLayout() {
  const [collapsed, setCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggleCollapse = React.useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* storage disabled – collapse stays session-only */
      }
      return next;
    });
  }, []);

  return (
    <div className="min-h-dvh bg-ink-50">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className={cn('flex min-h-dvh flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-16' : 'lg:pl-64')}>
        <TopBar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          onOpenMobileNav={() => setMobileOpen(true)}
        />

        <main className="flex-1 px-3 py-4 sm:px-4 sm:py-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>

        <footer className="no-print border-t border-ink-200 px-4 py-3 text-center text-[10px] text-ink-400 lg:px-6">
          EHS Command Centre · MillTech Textiles Ltd. · Deterministic demonstration dataset · All figures are
          illustrative and not a compliance record.
        </footer>
      </div>
    </div>
  );
}
