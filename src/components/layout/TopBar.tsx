import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, Search, Settings as SettingsIcon, User as UserIcon } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { MobileNavButton } from './Sidebar';
import { initialsOf } from '@/lib/format';
import { GlobalCommandSearch } from './GlobalCommandSearch';

/* ============================================================================
 * TopBar — global search, quick unit jump, notifications, account menu.
 * ==========================================================================*/

export function TopBar({
  collapsed,
  onToggleCollapse,
  onOpenMobileNav,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobileNav: () => void;
}) {
  const { user, role, logout, can } = useAuth();
  const { units, unreadNotificationCount, corporate, filter, setUnitFilter } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="no-print sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-ink-200 bg-white/95 px-3 backdrop-blur-sm sm:px-4">
      <div className="flex items-center gap-1">
        <MobileNavButton onOpen={onOpenMobileNav} />
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:inline-flex"
        >
          {collapsed ? <PanelLeftOpen className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
        </Button>
      </div>

      {/* Global search trigger */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="group flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-ink-300 bg-ink-50/60 px-3 text-left transition-colors hover:border-ink-400 hover:bg-white sm:max-w-md"
      >
        <Search className="h-4 w-4 shrink-0 text-ink-400" />
        <span className="min-w-0 flex-1 truncate text-xs text-ink-500">Search incidents, CAPA, employees, inspections…</span>
        <kbd className="hidden shrink-0 rounded border border-ink-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-500 sm:inline">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Quick unit jump */}
        <div className="hidden items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50/60 px-2.5 py-1.5 xl:flex">
          <span className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Unit</span>
          <select
            value={filter.unitId}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="bg-transparent text-xs font-medium text-ink-800 focus:outline-none"
            aria-label="Quick unit switch"
          >
            <option value="ALL">All units</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code}
              </option>
            ))}
          </select>
        </div>

        {/* Live status pill */}
        <div className="hidden items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50/60 px-2.5 py-1.5 md:flex">
          <span className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Campus</span>
          <Badge
            tone={corporate.status === 'Good' ? 'success' : corporate.status === 'Critical' ? 'danger' : 'warning'}
            size="xs"
            showDot
          >
            {corporate.status}
          </Badge>
        </div>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate('/notifications')}
          aria-label={`Notifications, ${unreadNotificationCount} unread`}
        >
          <span className="relative inline-flex">
            <Bell className="h-4.5 w-4.5" />
            {unreadNotificationCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white tabular-nums">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            ) : null}
          </span>
        </Button>

        {/* Account */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="ml-1 rounded-lg border border-transparent p-0.5 transition-colors hover:border-ink-200 hover:bg-ink-50"
            aria-label="Account menu"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-800 text-[10px] font-semibold text-white">
                {user ? user.avatarInitials || initialsOf(user.name) : '??'}
              </span>
              <span className="hidden text-left lg:block">
                <span className="block text-[11px] leading-tight font-semibold text-ink-900">{user?.name}</span>
                <span className="block text-[10px] leading-tight text-ink-500">{role?.name}</span>
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-ink-400 lg:block" />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60">
            <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
            <div className="px-2.5 pb-2">
              <p className="text-sm font-semibold text-ink-900">{user?.name}</p>
              <p className="text-[11px] text-ink-500">{user?.email}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <Badge tone="info" size="xs">
                  {role?.name}
                </Badge>
                <Badge tone="neutral" size="xs">
                  {user?.unitId ? units.find((u) => u.id === user?.unitId)?.code ?? 'Unit' : 'Corporate'}
                </Badge>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={<UserIcon className="h-3.5 w-3.5" />}>My profile</DropdownMenuItem>
            {can('settings') ? (
              <DropdownMenuItem icon={<SettingsIcon className="h-3.5 w-3.5" />} onSelect={() => navigate('/settings')}>
                Settings
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={<LogOut className="h-3.5 w-3.5" />} danger onSelect={logout}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {searchOpen ? <GlobalCommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} /> : null}

      {/* Screen-reader only route announcement for SPA navigation */}
      <span className="sr-only" role="status">
        Route: {location.pathname}
      </span>
    </header>
  );
}
