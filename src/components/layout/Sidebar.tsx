import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Eye,
  Factory,
  FileBarChart,
  Flame,
  GraduationCap,
  HardHat,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  Settings as SettingsIcon,
  ShieldCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_SECTIONS } from '@/data/settings';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui';

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  Factory,
  AlertTriangle,
  Radar,
  Eye,
  ClipboardCheck,
  GraduationCap,
  HardHat,
  ClipboardList,
  Flame,
  FileBarChart,
  Bell,
  Settings: SettingsIcon,
};

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const { can, user } = useAuth();
  const { settings, unreadNotificationCount } = useData();
  const location = useLocation();
  React.useEffect(() => {
    onCloseMobile();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => can(item.permission)),
  })).filter((s) => s.items.length > 0);

  return (
    <>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-ink-950/50 lg:hidden" onClick={onCloseMobile} aria-hidden="true" />
      ) : null}

      <aside
        className={cn(
          'no-print fixed inset-y-0 left-0 z-50 flex flex-col border-r border-navy-950 bg-navy-900 transition-[width,transform] duration-200 ease-out',
          collapsed ? 'w-16 lg:w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className={cn('flex h-14 shrink-0 items-center gap-2.5 border-b border-white/8 px-4', collapsed && 'lg:justify-center lg:px-0')}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-safety-500 text-white">
            <ShieldCheck className="h-4.5 w-4.5" />
          </span>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] leading-tight font-semibold text-white">EHS Command Centre</p>
              <p className="truncate text-[10px] leading-tight text-navy-200/70">{settings.plantName}</p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onCloseMobile}
            className="-mr-1 rounded p-1 text-navy-200 hover:bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden rounded p-1 text-navy-200 transition-colors hover:bg-white/10 hover:text-white lg:block"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Links */}
        <nav className="data-grid-scroll flex-1 overflow-y-auto px-2.5 py-3">
          {visibleSections.map((section) => (
            <div key={section.title} className="mb-4 last:mb-0">
              {!collapsed ? (
                <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-wider text-navy-200/50 uppercase">
                  {section.title}
                </p>
              ) : (
                <div className="mx-2 mb-2 border-t border-white/8" />
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? LayoutDashboard;
                  const isNotifications = item.to === '/notifications';
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          cn(
                            'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
                            isActive
                              ? 'bg-safety-500 text-white'
                              : 'text-navy-100/75 hover:bg-white/8 hover:text-white',
                            collapsed && 'lg:justify-center lg:px-0',
                          )
                        }
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
                        {isNotifications && unreadNotificationCount > 0 ? (
                          <span
                            className={cn(
                              'rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white tabular-nums',
                              collapsed && 'absolute top-1 right-1 px-1',
                            )}
                          >
                            {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                          </span>
                        ) : null}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User block */}
        <div className="shrink-0 border-t border-white/8 p-2.5">
          {user ? (
            <div className={cn('flex items-center gap-2.5 rounded-lg px-2 py-1.5', collapsed && 'lg:justify-center lg:px-0')}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-safety-500/20 text-[11px] font-semibold text-safety-200">
                {user.avatarInitials}
              </span>
              {!collapsed ? (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">{user.name}</p>
                  <p className="truncate text-[10px] text-navy-200/60">{user.designation}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}

/* ------------------------------- Mobile trigger -------------------------- */

export function MobileNavButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Button variant="ghost" size="icon" onClick={onOpen} aria-label="Open navigation" className="lg:hidden">
      <Menu className="h-4.5 w-4.5" />
    </Button>
  );
}

export { Bell };
