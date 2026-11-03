import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BellRing, CheckCheck, Info, Megaphone, Siren, TriangleAlert } from 'lucide-react';

import { useData } from '@/context/DataContext';
import { PageHeader, DetailField } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/common/DataTable';
import { KpiCard } from '@/components/ui/kpi-card';
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  StatusBadge,
} from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AppNotification, NotificationSeverity } from '@/data/types';

const SEVERITY_ICON: Record<NotificationSeverity, typeof Siren> = {
  Critical: Siren,
  Warning: TriangleAlert,
  Information: Info,
};

const SEVERITY_TONE: Record<NotificationSeverity, 'danger' | 'warning' | 'info'> = {
  Critical: 'danger',
  Warning: 'warning',
  Information: 'info',
};

export function Notifications() {
  const { state, settings, filter, unitCode, markNotificationRead, markAllNotificationsRead, unreadNotificationCount } = useData();
  const [tab, setTab] = React.useState('inbox');
  const [detail, setDetail] = React.useState<AppNotification | null>(null);

  const rows = React.useMemo(
    () =>
      state.notifications
        .filter((n) => filter.unitId === 'ALL' || n.unitId === null || n.unitId === filter.unitId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.notifications, filter.unitId],
  );

  const unread = rows.filter((n) => !n.read);
  const critical = rows.filter((n) => n.severity === 'Critical');
  const unreadCritical = critical.filter((n) => !n.read);

  const byModule = React.useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((n) => map.set(n.module, (map.get(n.module) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const columns: Column<AppNotification>[] = [
    {
      key: 'severity',
      header: 'Severity',
      sortValue: (n) => ['Critical', 'Warning', 'Information'].indexOf(n.severity),
      exportValue: (n) => n.severity,
      cell: (n) => {
        const Icon = SEVERITY_ICON[n.severity];
        return (
          <span className="inline-flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5" />
            <Badge tone={SEVERITY_TONE[n.severity]} size="xs">
              {n.severity}
            </Badge>
          </span>
        );
      },
    },
    {
      key: 'title',
      header: 'Notification',
      className: 'max-w-[32rem]',
      sortValue: (n) => n.title,
      exportValue: (n) => n.title,
      cell: (n) => (
        <div className="min-w-0">
          <p className={cn('truncate', n.read ? 'font-medium text-ink-700' : 'font-semibold text-ink-900')}>{n.title}</p>
          <p className="truncate text-[11px] text-ink-500">{n.message}</p>
        </div>
      ),
    },
    {
      key: 'module',
      header: 'Module',
      sortValue: (n) => n.module,
      exportValue: (n) => n.module,
      cell: (n) => <StatusBadge value={n.module} size="xs" />,
    },
    {
      key: 'unit',
      header: 'Unit',
      sortValue: (n) => unitCode(n.unitId),
      exportValue: (n) => unitCode(n.unitId),
      hideBelow: 'md',
      cell: (n) => <span className="text-ink-600">{n.unitId === null ? 'Corporate' : unitCode(n.unitId)}</span>,
    },
    {
      key: 'createdAt',
      header: 'Raised',
      sortValue: (n) => n.createdAt,
      exportValue: (n) => n.createdAt,
      cell: (n) => <span className="whitespace-nowrap text-ink-600">{formatDateTime(n.createdAt)}</span>,
    },
    {
      key: 'read',
      header: 'State',
      sortValue: (n) => (n.read ? 1 : 0),
      exportValue: (n) => (n.read ? 'Read' : 'Unread'),
      cell: (n) => <Badge tone={n.read ? 'neutral' : 'accent'} size="xs">{n.read ? 'Read' : 'Unread'}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="Alerts raised by the module for critical incidents, overdue corrective actions, inspection failures, training expiries and emergency readiness."
        breadcrumbs={[{ label: 'EHS', to: '/dashboard' }, { label: 'Notifications' }]}
        icon={<BellRing className="h-4 w-4" />}
        badges={
          <Badge tone={unreadNotificationCount ? 'warning' : 'success'} showDot>
            {unreadNotificationCount ? `${unreadNotificationCount} unread` : 'All caught up'}
          </Badge>
        }
        toolbar={
          <Button variant="outline" size="sm" onClick={markAllNotificationsRead} disabled={!unreadNotificationCount}>
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Total in scope" value={rows.length} tone="navy" icon={BellRing} />
        <KpiCard label="Unread" value={unread.length} tone={unread.length ? 'amber' : 'green'} />
        <KpiCard label="Critical" value={critical.length} tone={critical.length ? 'red' : 'green'} icon={Siren} />
        <KpiCard label="Unread critical" value={unreadCritical.length} tone={unreadCritical.length ? 'red' : 'green'} icon={TriangleAlert} />
        <KpiCard
          label="Digest cadence"
          value={settings.notifications.digest}
          tone="blue"
          icon={Megaphone}
          footer={settings.notifications.criticalAlerts ? 'Critical alerts enabled' : 'Critical alerts muted'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="print-page xl:col-span-2">
          <Tabs value={tab} onValueChange={setTab}>
            <CardHeader>
              <div>
                <CardTitle>Inbox</CardTitle>
                <p className="mt-0.5 text-xs text-ink-500">Select an alert to read the full message and jump to the source record</p>
              </div>
              <CardAction>
                <span className="text-xs text-ink-500 tabular-nums">
                  {unread.length} unread of {rows.length}
                </span>
              </CardAction>
            </CardHeader>
            <TabsList className="mx-4">
              <TabsTrigger value="inbox" count={rows.length}>
                <BellRing className="h-3.5 w-3.5" />
                All
              </TabsTrigger>
              <TabsTrigger value="unread" count={unread.length}>
                <TriangleAlert className="h-3.5 w-3.5" />
                Unread
              </TabsTrigger>
              <TabsTrigger value="critical" count={critical.length}>
                <Siren className="h-3.5 w-3.5" />
                Critical
              </TabsTrigger>
            </TabsList>
            <TabsContent value="inbox" className="px-4 pb-4">
              <DataTable
                data={rows}
                columns={columns}
                rowKey={(n) => n.id}
                onRowClick={(n) => {
                  setDetail(n);
                  markNotificationRead(n.id);
                }}
                searchPlaceholder="Search title, message, module..."
                pageSize={settings.rowsPerPage}
                exportName="notifications"
                exportTitle="Notification Log"
                emptyLabel="No notifications in this scope"
              />
            </TabsContent>
            <TabsContent value="unread" className="px-4 pb-4">
              <DataTable
                data={unread}
                columns={columns}
                rowKey={(n) => n.id}
                onRowClick={(n) => {
                  setDetail(n);
                  markNotificationRead(n.id);
                }}
                searchPlaceholder="Search title, message, module..."
                pageSize={settings.rowsPerPage}
                exportName="notifications-unread"
                exportTitle="Unread Notifications"
                emptyLabel="Nothing unread"
              />
            </TabsContent>
            <TabsContent value="critical" className="px-4 pb-4">
              <DataTable
                data={critical}
                columns={columns}
                rowKey={(n) => n.id}
                onRowClick={(n) => {
                  setDetail(n);
                  markNotificationRead(n.id);
                }}
                searchPlaceholder="Search title, message, module..."
                pageSize={settings.rowsPerPage}
                exportName="notifications-critical"
                exportTitle="Critical Notifications"
                emptyLabel="No critical alerts"
              />
            </TabsContent>
          </Tabs>
        </Card>

        <div className="space-y-4">
          <Card className="print-page">
            <CardHeader>
              <div>
                <CardTitle>By module</CardTitle>
                <p className="mt-0.5 text-xs text-ink-500">Where the alert volume comes from</p>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {byModule.map(([module, count]) => {
                  const max = byModule[0]?.[1] ?? 1;
                  return (
                    <li key={module}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-ink-600">{module}</span>
                        <span className="font-semibold text-ink-900 tabular-nums">{count}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                        <div className="h-full rounded-full bg-safety-500" style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card className="print-page">
            <CardHeader>
              <div>
                <CardTitle>Delivery preferences</CardTitle>
                <p className="mt-0.5 text-xs text-ink-500">Managed under settings</p>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-xs">
                {[
                  ['Email', settings.notifications.email],
                  ['Push', settings.notifications.push],
                  ['SMS', settings.notifications.sms],
                  ['Critical alerts', settings.notifications.criticalAlerts],
                  ['Overdue CAPA', settings.notifications.overdueCaps],
                  ['Inspection reminders', settings.notifications.inspectionReminders],
                  ['Training expiry', settings.notifications.trainingExpiry],
                ].map(([label, enabled]) => (
                  <div key={String(label)} className="flex items-center justify-between">
                    <dt className="text-ink-600">{label}</dt>
                    <dd>
                      <Badge tone={enabled ? 'success' : 'neutral'} size="xs">
                        {enabled ? 'On' : 'Off'}
                      </Badge>
                    </dd>
                  </div>
                ))}
              </dl>
              <Link
                to="/settings"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:underline"
              >
                Manage notification settings
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent size="md">
          {detail ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>{detail.title}</DialogTitle>
                  <Badge tone={SEVERITY_TONE[detail.severity]} size="xs">
                    {detail.severity}
                  </Badge>
                </div>
                <DialogDescription>
                  {detail.module} / {detail.unitId === null ? 'Corporate' : unitCode(detail.unitId)} / raised {formatDateTime(detail.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4">
                <p className="text-sm leading-relaxed text-ink-700">{detail.message}</p>
                <dl className="grid grid-cols-2 gap-4">
                  <DetailField label="Reference">{detail.id}</DetailField>
                  <DetailField label="Module">{detail.module}</DetailField>
                  <DetailField label="Unit">{detail.unitId === null ? 'Corporate' : unitCode(detail.unitId)}</DetailField>
                  <DetailField label="State">{detail.read ? 'Read' : 'Unread'}</DetailField>
                </dl>
              </DialogBody>
              <DialogFooter>
                <Link to={detail.link}>
                  <Button variant="primary">
                    Open source record
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => setDetail(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Notifications;
