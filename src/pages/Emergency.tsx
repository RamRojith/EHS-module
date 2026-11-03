import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BellRing,
  CalendarCheck,
  ClipboardList,
  DoorOpen,
  Drill,
  FileWarning,
  Flame,
  Siren,
  Timer,
  TriangleAlert,
} from 'lucide-react';

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
  Progress,
  ProgressCircle,
  StatusBadge,
} from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarSeriesChart, ComboChart, DonutChart } from '@/components/charts';
import { DEMO_TODAY_ISO, emergencySummary } from '@/data/analytics';
import { CHART_COLORS } from '@/lib/theme';
import { MONTH_SHORT, formatDate, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { EmergencyAsset, EmergencyDrill, EmergencyPlan } from '@/data/types';

type AssetRow = EmergencyAsset;

export function Emergency() {
  const { state, settings, filter, unitCode, unitName } = useData();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = React.useState('drills');
  const [drill, setDrill] = React.useState<EmergencyDrill | null>(null);
  const [asset, setAsset] = React.useState<AssetRow | null>(null);
  const [plan, setPlan] = React.useState<EmergencyPlan | null>(null);

  const unitId = filter.unitId;

  React.useEffect(() => {
    const open = params.get('open');
    if (!open) return;
    const d = state.drills.find((x) => x.id === open || x.drillNo === open);
    if (d) {
      setDrill(d);
      setTab('drills');
    }
    const a = state.emergencyAssets.find((x) => x.id === open || x.code === open);
    if (a) {
      setAsset(a);
      setTab('assets');
    }
    const p = state.emergencyPlans.find((x) => x.id === open || x.title === open);
    if (p) {
      setPlan(p);
      setTab('plans');
    }
    const next = new URLSearchParams(params);
    next.delete('open');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = React.useMemo(() => emergencySummary(state, unitId), [state, unitId]);

  const drills = React.useMemo(
    () =>
      state.drills
        .filter((d) => unitId === 'ALL' || d.unitId === unitId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.drills, unitId],
  );

  const assets = React.useMemo(
    () =>
      state.emergencyAssets
        .filter((a) => unitId === 'ALL' || a.unitId === unitId)
        .sort((a, b) => a.nextInspection.localeCompare(b.nextInspection)),
    [state.emergencyAssets, unitId],
  );

  const plans = React.useMemo(
    () => state.emergencyPlans.filter((p) => unitId === 'ALL' || p.unitId === unitId),
    [state.emergencyPlans, unitId],
  );

  const daysSinceLast = summary.lastDrill
    ? Math.round(
        (new Date(`${DEMO_TODAY_ISO}T00:00:00`).getTime() - new Date(`${summary.lastDrill.date}T00:00:00`).getTime()) / 86_400_000,
      )
    : null;

  const completedDrills = drills.filter((d) => d.status === 'Completed');
  const avgEvacuation = completedDrills.length
    ? Math.round(completedDrills.reduce((a, d) => a + d.evacuationTimeSec, 0) / completedDrills.length)
    : 0;
  const drillsWithinTarget = completedDrills.filter((d) => d.evacuationTimeSec <= d.targetTimeSec).length;
  const drillPassRate = completedDrills.length ? (drillsWithinTarget / completedDrills.length) * 100 : 0;
  const unserviceableAssets = assets.filter((a) => a.status === 'Defective' || a.status === 'Under Repair').length;
  const dueAssets = assets.filter((a) => a.status === 'Due').length;

  const drillByMonth = React.useMemo(() => {
    const months = new Map<string, number>();
    drills.forEach((d) => {
      const k = d.date.slice(0, 7);
      months.set(k, (months.get(k) ?? 0) + 1);
    });
    return [...months.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({ label: `${MONTH_SHORT[Number(k.slice(5)) - 1] ?? k.slice(5)} ${k.slice(2, 4)}`, drills: v }));
  }, [drills]);

  const evacuationChart = React.useMemo(
    () =>
      completedDrills
        .slice()
        .sort((a, b) => b.evacuationTimeSec - a.evacuationTimeSec)
        .slice(0, 12)
        .map((d) => ({
          label: `${unitCode(d.unitId)} ${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`,
          actual: d.evacuationTimeSec,
          target: d.targetTimeSec,
        })),
    [completedDrills, unitCode],
  );

  const unitPreparedness = React.useMemo(
    () =>
      state.units.map((u) => {
        const s = emergencySummary(state, u.id);
        return { unitCode: u.code, unitName: u.shortName, preparedness: s.preparednessScore, assets: s.assets.total, drills: s.completed };
      }),
    [state],
  );

  const avgResourcesReady = plans.length ? Math.round(plans.reduce((a, p) => a + p.resourcesReadyPct, 0) / plans.length) : 0;

  const drillColumns: Column<EmergencyDrill>[] = [
    {
      key: 'drillNo',
      header: 'Ref',
      sortValue: (d) => d.drillNo,
      exportValue: (d) => d.drillNo,
      cell: (d) => <span className="font-medium whitespace-nowrap text-ink-900">{d.drillNo}</span>,
    },
    {
      key: 'unit',
      header: 'Unit',
      sortValue: (d) => unitCode(d.unitId),
      exportValue: (d) => unitCode(d.unitId),
      cell: (d) => <span className="text-ink-700">{unitCode(d.unitId)}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      sortValue: (d) => d.type,
      exportValue: (d) => d.type,
      cell: (d) => <span className="whitespace-nowrap text-ink-700">{d.type}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      sortValue: (d) => d.date,
      exportValue: (d) => d.date,
      cell: (d) => <span className="tabular-nums whitespace-nowrap text-ink-600">{formatDate(d.date)}</span>,
    },
    {
      key: 'evacuationTimeSec',
      header: 'Evacuation',
      align: 'right',
      sortValue: (d) => d.evacuationTimeSec,
      exportValue: (d) => `${d.evacuationTimeSec}s`,
      cell: (d) =>
        d.status === 'Completed' ? (
          <span className={cn('text-xs font-semibold tabular-nums', d.evacuationTimeSec <= d.targetTimeSec ? 'text-emerald-700' : 'text-red-700')}>
            {d.evacuationTimeSec}s
            <span className="ml-1 font-normal text-ink-400">/ {d.targetTimeSec}s</span>
          </span>
        ) : (
          <span className="text-ink-400">-</span>
        ),
    },
    {
      key: 'participants',
      header: 'Participants',
      align: 'right',
      sortValue: (d) => d.participants,
      exportValue: (d) => `${d.participants} of ${d.totalEmployees}`,
      hideBelow: 'md',
      cell: (d) => (
        <span className="tabular-nums text-ink-600">
          {d.participants}
          <span className="text-ink-400">/{d.totalEmployees}</span>
        </span>
      ),
    },
    {
      key: 'wardenName',
      header: 'Warden',
      sortValue: (d) => d.wardenName,
      exportValue: (d) => d.wardenName,
      hideBelow: 'lg',
      cell: (d) => <span className="text-ink-600">{d.wardenName}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (d) => d.status,
      exportValue: (d) => d.status,
      cell: (d) => <StatusBadge value={d.status} size="xs" />,
    },
    {
      key: 'result',
      header: 'Result',
      sortValue: (d) => d.result ?? '',
      exportValue: (d) => d.result ?? '',
      cell: (d) => <StatusBadge value={d.result} size="xs" />,
    },
  ];

  const assetColumns: Column<AssetRow>[] = [
    {
      key: 'code',
      header: 'Code',
      sortValue: (a) => a.code,
      exportValue: (a) => a.code,
      cell: (a) => <span className="font-medium whitespace-nowrap text-ink-900">{a.code}</span>,
    },
    {
      key: 'kind',
      header: 'Type',
      sortValue: (a) => a.kind,
      exportValue: (a) => a.kind,
      filterOptions: [...new Set(assets.map((a) => a.kind))].map((k) => ({ value: k, label: k })),
      cell: (a) => <span className="whitespace-nowrap text-ink-700">{a.kind}</span>,
    },
    {
      key: 'unit',
      header: 'Unit',
      sortValue: (a) => unitCode(a.unitId),
      exportValue: (a) => unitCode(a.unitId),
      cell: (a) => <span className="text-ink-700">{unitCode(a.unitId)}</span>,
    },
    {
      key: 'location',
      header: 'Location',
      className: 'max-w-[18rem]',
      sortValue: (a) => a.location,
      exportValue: (a) => a.location,
      cell: (a) => (
        <span className="block truncate text-ink-600" title={a.location}>
          {a.location}
        </span>
      ),
    },
    {
      key: 'lastInspected',
      header: 'Last inspected',
      sortValue: (a) => a.lastInspected,
      exportValue: (a) => a.lastInspected,
      hideBelow: 'lg',
      cell: (a) => <span className="tabular-nums whitespace-nowrap text-ink-600">{formatDate(a.lastInspected)}</span>,
    },
    {
      key: 'nextInspection',
      header: 'Next due',
      sortValue: (a) => a.nextInspection,
      exportValue: (a) => a.nextInspection,
      cell: (a) => {
        const overdue = a.nextInspection < DEMO_TODAY_ISO && a.status !== 'Serviceable';
        return (
          <span className={cn('tabular-nums whitespace-nowrap', overdue ? 'font-semibold text-red-700' : 'text-ink-600')}>
            {formatDate(a.nextInspection)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (a) => a.status,
      exportValue: (a) => a.status,
      cell: (a) => <StatusBadge value={a.status} size="xs" />,
    },
  ];

  const planColumns: Column<EmergencyPlan>[] = [
    {
      key: 'title',
      header: 'Plan',
      className: 'max-w-[22rem]',
      sortValue: (p) => p.title,
      exportValue: (p) => p.title,
      cell: (p) => (
        <span className="block truncate font-medium text-ink-900" title={p.title}>
          {p.title}
        </span>
      ),
    },
    {
      key: 'unit',
      header: 'Unit',
      sortValue: (p) => unitCode(p.unitId),
      exportValue: (p) => unitCode(p.unitId),
      cell: (p) => <span className="text-ink-700">{unitCode(p.unitId)}</span>,
    },
    {
      key: 'owner',
      header: 'Owner',
      sortValue: (p) => p.owner,
      exportValue: (p) => p.owner,
      cell: (p) => <span className="text-ink-600">{p.owner}</span>,
    },
    {
      key: 'lastMockDrill',
      header: 'Last mock drill',
      sortValue: (p) => p.lastMockDrill,
      exportValue: (p) => p.lastMockDrill,
      cell: (p) => <span className="tabular-nums whitespace-nowrap text-ink-600">{formatDate(p.lastMockDrill)}</span>,
    },
    {
      key: 'nextMockDrill',
      header: 'Next mock drill',
      sortValue: (p) => p.nextMockDrill,
      exportValue: (p) => p.nextMockDrill,
      cell: (p) => <span className="tabular-nums whitespace-nowrap text-ink-600">{formatDate(p.nextMockDrill)}</span>,
    },
    {
      key: 'resourcesReadyPct',
      header: 'Resource readiness',
      align: 'right',
      sortValue: (p) => p.resourcesReadyPct,
      exportValue: (p) => `${p.resourcesReadyPct}%`,
      cell: (p) => (
        <div className="flex items-center justify-end gap-2">
          <Progress
            value={p.resourcesReadyPct}
            className="hidden w-20 sm:block"
            tone={p.resourcesReadyPct >= 90 ? 'green' : p.resourcesReadyPct >= 75 ? 'amber' : 'red'}
            size="sm"
          />
          <span
            className={cn(
              'text-xs font-semibold tabular-nums',
              p.resourcesReadyPct >= 90 ? 'text-emerald-700' : p.resourcesReadyPct >= 75 ? 'text-amber-700' : 'text-red-700',
            )}
          >
            {p.resourcesReadyPct}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Emergency Preparedness"
        description="Fire and evacuation drills, asset serviceability, mock-drill readiness and emergency plan ownership for every unit."
        breadcrumbs={[{ label: 'EHS', to: '/dashboard' }, { label: 'Emergency' }]}
        icon={<Siren className="h-4 w-4" />}
        badges={
          <Badge tone={summary.preparednessScore >= 80 ? 'success' : summary.preparednessScore >= 65 ? 'warning' : 'danger'} showDot>
            {summary.preparednessScore}/100 preparedness
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Preparedness score"
          value={summary.preparednessScore}
          icon={ClipboardList}
          tone={summary.preparednessScore >= 80 ? 'green' : summary.preparednessScore >= 65 ? 'amber' : 'red'}
          footer="Assets 40% / drills 35% / recency 25%"
        />
        <KpiCard label="Drills completed" value={formatNumber(summary.completed)} icon={Drill} tone="navy" footer={`${summary.totalDrills} planned`} />
        <KpiCard
          label="Days since drill"
          value={daysSinceLast ?? '-'}
          icon={Timer}
          tone={daysSinceLast === null ? 'amber' : daysSinceLast <= settings.target.daysSinceLastDrill ? 'green' : 'red'}
          footer={`Target <= ${settings.target.daysSinceLastDrill} days`}
        />
        <KpiCard
          label="Evacuation in target"
          value={`${drillPassRate.toFixed(0)}%`}
          icon={DoorOpen}
          tone={drillPassRate >= 80 ? 'green' : 'amber'}
          footer={`avg ${avgEvacuation}s`}
        />
        <KpiCard label="Assets due" value={formatNumber(summary.assets.due)} icon={CalendarCheck} tone={summary.assets.due ? 'amber' : 'green'} />
        <KpiCard
          label="Defective / repair"
          value={formatNumber(summary.assets.defective + summary.assets.underRepair)}
          icon={FileWarning}
          tone={unserviceableAssets ? 'red' : 'green'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="print-page xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Evacuation time versus target</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Slowest {Math.min(12, completedDrills.length)} completed drills in scope</p>
            </div>
          </CardHeader>
          <CardContent>
            <BarSeriesChart
              data={evacuationChart}
              xKey="label"
              horizontal
              height={300}
              suffix="s"
              series={[
                { key: 'target', label: 'Target', color: CHART_COLORS.slate },
                { key: 'actual', label: 'Actual', color: CHART_COLORS.teal },
              ]}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="print-page">
            <CardHeader>
              <div>
                <CardTitle>Preparedness</CardTitle>
                <p className="mt-0.5 text-xs text-ink-500">Weighted composite score</p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <ProgressCircle value={summary.preparednessScore} size={120} label="preparedness" target={80} />
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div>
                  <dt className="text-ink-500">Fire drills</dt>
                  <dd className="font-semibold text-ink-900 tabular-nums">{summary.fireDrills}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Emergency / mock</dt>
                  <dd className="font-semibold text-ink-900 tabular-nums">{summary.emergencyDrills}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Evacuation</dt>
                  <dd className="font-semibold text-ink-900 tabular-nums">{summary.evacuationDrills}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Upcoming</dt>
                  <dd className="font-semibold text-ink-900 tabular-nums">{summary.upcoming}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="print-page">
            <CardHeader>
              <div>
                <CardTitle>Asset serviceability</CardTitle>
                <p className="mt-0.5 text-xs text-ink-500">{formatNumber(summary.assets.total)} tracked assets</p>
              </div>
            </CardHeader>
            <CardContent>
              <DonutChart
                data={[
                  { name: 'Serviceable', value: summary.assets.serviceable },
                  { name: 'Due', value: summary.assets.due },
                  { name: 'Defective', value: summary.assets.defective },
                  { name: 'Under repair', value: summary.assets.underRepair },
                ].filter((d) => d.value > 0)}
                colors={[CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.red, CHART_COLORS.violet]}
                centerValue={`${summary.assets.total ? Math.round((summary.assets.serviceable / summary.assets.total) * 100) : 0}%`}
                centerLabel="serviceable"
                height={200}
              />
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 text-center">
                <div>
                  <p className="text-[10px] tracking-wider text-ink-400 uppercase">Exits</p>
                  <p className="text-base font-semibold text-ink-900 tabular-nums">{summary.exitCount}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-wider text-ink-400 uppercase">Extinguishers</p>
                  <p className="text-base font-semibold text-ink-900 tabular-nums">{summary.extinguisherCount}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-wider text-ink-400 uppercase">Assembly pts</p>
                  <p className="text-base font-semibold text-ink-900 tabular-nums">{summary.assemblyPoints}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="print-page">
          <CardHeader>
            <div>
              <CardTitle>Unit preparedness comparison</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Composite score against completed drill count</p>
            </div>
          </CardHeader>
          <CardContent>
            <ComboChart
              data={unitPreparedness as unknown as Record<string, unknown>[]}
              bars={[{ key: 'preparedness', label: 'Preparedness', color: CHART_COLORS.green }]}
              line={{ key: 'drills', label: 'Drills completed', color: CHART_COLORS.safety, axis: 'right' }}
              xKey="unitCode"
              height={280}
            />
          </CardContent>
        </Card>

        <Card className="print-page">
          <CardHeader>
            <div>
              <CardTitle>Drills conducted by month</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Fire, evacuation, emergency and mock drills</p>
            </div>
          </CardHeader>
          <CardContent>
            <BarSeriesChart data={drillByMonth} xKey="label" height={280} series={[{ key: 'drills', label: 'Drills', color: CHART_COLORS.safety }]} />
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="drills" count={drills.length}>
            <Flame className="h-3.5 w-3.5" />
            Drills
          </TabsTrigger>
          <TabsTrigger value="assets" count={assets.length}>
            <BellRing className="h-3.5 w-3.5" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="plans" count={plans.length}>
            <ClipboardList className="h-3.5 w-3.5" />
            Emergency plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drills">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Drill register</CardTitle>
                <p className="mt-0.5 text-xs text-ink-500">Evacuation timing, participation and warden sign-off</p>
              </div>
              <CardAction>
                <span className="text-xs text-ink-500 tabular-nums">
                  {drillsWithinTarget}/{completedDrills.length} within target
                </span>
              </CardAction>
            </CardHeader>
            <CardContent>
              <DataTable
                data={drills}
                columns={drillColumns}
                rowKey={(d) => d.id}
                onRowClick={(d) => setDrill(d)}
                searchPlaceholder="Search reference, unit, warden..."
                pageSize={settings.rowsPerPage}
                exportName="emergency-drills"
                exportTitle="Emergency Drill Register"
                emptyLabel="No drills recorded in this scope"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Emergency asset register</CardTitle>
                <p className="mt-0.5 text-xs text-ink-500">
                  {formatNumber(dueAssets)} due for inspection, {formatNumber(unserviceableAssets)} defective or under repair
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={assets}
                columns={assetColumns}
                rowKey={(a) => a.id}
                onRowClick={(a) => setAsset(a)}
                searchPlaceholder="Search code, type, location..."
                pageSize={settings.rowsPerPage}
                exportName="emergency-assets"
                exportTitle="Emergency Asset Register"
                emptyLabel="No emergency assets in this scope"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Emergency response plans</CardTitle>
                <p className="mt-0.5 text-xs text-ink-500">Average resource readiness {avgResourcesReady}%</p>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={plans}
                columns={planColumns}
                rowKey={(p) => p.id}
                onRowClick={(p) => setPlan(p)}
                searchPlaceholder="Search plan, owner..."
                pageSize={settings.rowsPerPage}
                exportName="emergency-plans"
                exportTitle="Emergency Response Plans"
                emptyLabel="No emergency plans for this scope"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent size="md">
          {drill ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>
                    {drill.drillNo} - {drill.type}
                  </DialogTitle>
                  <StatusBadge value={drill.status} size="xs" />
                </div>
                <DialogDescription>
                  {unitName(drill.unitId)} - {formatDate(drill.date)} at {drill.startTime}
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <DetailField label="Evacuation time">{drill.evacuationTimeSec}s</DetailField>
                  <DetailField label="Target">{drill.targetTimeSec}s</DetailField>
                  <DetailField label="Participants">
                    {drill.participants} of {drill.totalEmployees}
                  </DetailField>
                  <DetailField label="Result">{drill.result ?? '-'}</DetailField>
                  <DetailField label="Warden">{drill.wardenName}</DetailField>
                  <DetailField label="Assembly point" className="col-span-2">
                    {drill.assemblyPoint}
                  </DetailField>
                </dl>
                {drill.status === 'Completed' ? (
                  <Progress
                    label="Evacuation time against target"
                    value={drill.evacuationTimeSec}
                    max={drill.targetTimeSec * 1.5}
                    tone={drill.evacuationTimeSec <= drill.targetTimeSec ? 'green' : 'red'}
                  />
                ) : null}
                {drill.remarks ? (
                  <div className="rounded-lg border border-ink-100 bg-surface-2 p-3">
                    <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Remarks</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-700">{drill.remarks}</p>
                  </div>
                ) : null}
              </DialogBody>
              <DialogFooter>
                <Button variant="primary" onClick={() => setDrill(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!asset} onOpenChange={(o) => !o && setAsset(null)}>
        <DialogContent size="sm">
          {asset ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>
                    {asset.code} - {asset.kind}
                  </DialogTitle>
                  <StatusBadge value={asset.status} size="xs" />
                </div>
                <DialogDescription>{unitName(asset.unitId)}</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <dl className="grid grid-cols-2 gap-4">
                  <DetailField label="Location" className="col-span-2">
                    {asset.location}
                  </DetailField>
                  <DetailField label="Last inspected">{formatDate(asset.lastInspected)}</DetailField>
                  <DetailField label="Next inspection">{formatDate(asset.nextInspection)}</DetailField>
                </dl>
                {asset.nextInspection < DEMO_TODAY_ISO && asset.status !== 'Serviceable' ? (
                  <p className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Inspection is overdue. Raise a corrective action or log the service visit before the next shift.
                  </p>
                ) : null}
              </DialogBody>
              <DialogFooter>
                <Button variant="primary" onClick={() => setAsset(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!plan} onOpenChange={(o) => !o && setPlan(null)}>
        <DialogContent size="md">
          {plan ? (
            <>
              <DialogHeader>
                <DialogTitle>{plan.title}</DialogTitle>
                <DialogDescription>
                  {unitName(plan.unitId)} - owned by {plan.owner}
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4">
                <dl className="grid grid-cols-2 gap-4">
                  <DetailField label="Last mock drill">{formatDate(plan.lastMockDrill)}</DetailField>
                  <DetailField label="Next mock drill">{formatDate(plan.nextMockDrill)}</DetailField>
                  <DetailField label="Emergency contact">{plan.contactName}</DetailField>
                  <DetailField label="Phone" mono>
                    {plan.contactPhone}
                  </DetailField>
                </dl>
                <Progress
                  label="Resource readiness"
                  value={plan.resourcesReadyPct}
                  tone={plan.resourcesReadyPct >= 90 ? 'green' : plan.resourcesReadyPct >= 75 ? 'amber' : 'red'}
                />
              </DialogBody>
              <DialogFooter>
                <Button variant="primary" onClick={() => setPlan(null)}>
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

export default Emergency;
