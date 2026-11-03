import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Eye,
  Flame,
  GraduationCap,
  HardHat,
  Radar,
  ShieldCheck,
} from 'lucide-react';

import { useData } from '@/context/DataContext';
import { PageHeader } from '@/components/common/PageHeader';
import { GlobalFilterBar } from '@/components/common/GlobalFilterBar';
import { MiniMetric } from '@/components/common/UnitScorecard';
import { KpiCard } from '@/components/ui/kpi-card';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  StatusBadge,
} from '@/components/ui';
import { StatusDot } from '@/components/ui/badge';
import { ProgressCircle } from '@/components/ui/progress';
import { BarSeriesChart, ComboChart, DonutChart, TrendLineChart } from '@/components/charts';
import {
  capaSummary,
  emergencySummary,
  getUnitMetrics,
  inspectionSummary,
  monthlyTrend,
  nearMissSummary,
  observationSummary,
  previousPeriodRange,
} from '@/data/analytics';
import { CHART_COLORS, SERIES_COLORS } from '@/lib/theme';
import { formatCompact, formatDate, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export function UnitDetail() {
  const { unitId = '' } = useParams();
  const navigate = useNavigate();
  const {
    state,
    filter,
    settings,
    setUnitFilter,
  } = useData();

  const unit = state.units.find((u) => u.id === unitId);

  React.useEffect(() => {
    if (unit && filter.unitId !== unit.id) setUnitFilter(unit.id);
  }, [unit, filter.unitId, setUnitFilter]);

  const metrics = React.useMemo(
    () => (unit ? getUnitMetrics(state, unit.id, filter.range) : null),
    [state, unit, filter.range],
  );
  const prevMetrics = React.useMemo(
    () => (unit ? getUnitMetrics(state, unit.id, previousPeriodRange(filter.range)) : null),
    [state, unit, filter.range],
  );

  const trend = React.useMemo(() => monthlyTrend(state, unitId), [state, unitId]);
  const nearMiss = React.useMemo(() => nearMissSummary(state, filter.range, unitId), [state, filter.range, unitId]);
  const obs = React.useMemo(() => observationSummary(state, filter.range, unitId), [state, filter.range, unitId]);
  const capa = React.useMemo(() => capaSummary(state, filter.range, unitId), [state, filter.range, unitId]);
  const insp = React.useMemo(() => inspectionSummary(state, filter.range, unitId), [state, filter.range, unitId]);
  const emergency = React.useMemo(() => emergencySummary(state, unitId), [state, unitId]);

  if (!unit || !metrics || !prevMetrics) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title="Unit not found"
          description="The unit identifier in the URL does not match any unit in the dataset."
          actionLabel="Back to units"
          onAction={() => navigate('/units')}
        />
      </div>
    );
  }

  const indicators = [
    { key: 'ltifr', label: 'LTIFR', value: metrics.ltifr, previous: prevMetrics.ltifr, target: settings.target.ltifr, better: 'lower' },
    { key: 'trifr', label: 'TRIFR', value: metrics.trifr, previous: prevMetrics.trifr, target: settings.target.trifr, better: 'lower' },
    { key: 'severity', label: 'Severity rate', value: metrics.severityRate, previous: prevMetrics.severityRate, target: null, better: 'lower' },
    { key: 'training', label: 'Training %', value: metrics.trainingCompliance, previous: prevMetrics.trainingCompliance, target: settings.target.trainingCompliance, better: 'higher' },
    { key: 'ppe', label: 'PPE %', value: metrics.ppeCompliance, previous: prevMetrics.ppeCompliance, target: settings.target.ppeCompliance, better: 'higher' },
    { key: 'capa', label: 'CAPA on-time %', value: metrics.capaOnTimeClosure, previous: prevMetrics.capaOnTimeClosure, target: settings.target.capaOnTimeClosure, better: 'higher' },
    { key: 'insp', label: 'Inspection score', value: metrics.inspectionScore, previous: prevMetrics.inspectionScore, target: 85, better: 'higher' },
    { key: 'days', label: 'Avg lost days', value: metrics.lostDays / Math.max(metrics.incidents, 1), previous: prevMetrics.lostDays / Math.max(prevMetrics.incidents, 1), target: null, better: 'lower' },
  ] as const;
  const delta = (c: number, p: number) => (p === 0 ? 0 : ((c - p) / p) * 100);

  const recentIncidents = state.incidents
    .filter((i) => i.unitId === unit.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const openActions = state.correctiveActions
    .filter((c) => c.unitId === unit.id && c.status !== 'Completed')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${unit.code} · ${unit.name}`}
        description={`${unit.location} · ${formatNumber(unit.headcount)} employees · Safety head: ${unit.safetyHeadName} · Established ${unit.established}`}
        breadcrumbs={[
          { label: 'EHS', to: '/dashboard' },
          { label: 'Units', to: '/units' },
          { label: unit.code },
        ]}
        icon={<Building2 className="h-4 w-4" />}
        badges={
          <Badge
            tone={metrics.status === 'Good' ? 'success' : metrics.status === 'Critical' ? 'danger' : 'warning'}
            showDot
          >
            {metrics.status}
          </Badge>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => setUnitFilter('ALL')}>
            Clear unit scope
          </Button>
        }
        toolbar={<GlobalFilterBar />}
      />

      {metrics.status === 'Critical' ? (
        <Alert tone="danger" title="Unit is in the critical monitoring band">
          Injury frequency or governance backlog is outside tolerance. {metrics.overdueCapa} corrective action
          {metrics.overdueCapa === 1 ? ' is' : 's are'} overdue and{' '}
          {metrics.inspectionsFailed} inspection{metrics.inspectionsFailed === 1 ? '' : 's'} failed. Review the open
          actions below and confirm the unit safety head has a dated recovery plan.
        </Alert>
      ) : null}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard
          label="LTIFR"
          value={metrics.ltifr.toFixed(2)}
          tone={metrics.ltifr <= settings.target.ltifr ? 'green' : 'red'}
          trend={{ value: delta(metrics.ltifr, prevMetrics.ltifr), goodWhen: 'down', label: 'vs prev' }}
          target={{ label: `≤ ${settings.target.ltifr}`, met: metrics.ltifr <= settings.target.ltifr }}
        />
        <KpiCard
          label="TRIFR"
          value={metrics.trifr.toFixed(2)}
          tone={metrics.trifr <= settings.target.trifr ? 'green' : 'red'}
          target={{ label: `≤ ${settings.target.trifr}`, met: metrics.trifr <= settings.target.trifr }}
        />
        <KpiCard label="Incidents" value={metrics.incidents} tone="navy" footer={`${metrics.lostDays} days lost`} />
        <KpiCard label="Near Misses" value={metrics.nearMisses} tone="amber" footer={`${nearMiss.highPotential} high potential`} />
        <KpiCard
          label="Observations"
          value={metrics.observations}
          tone="blue"
          footer={`${obs.unsafeActs} unsafe acts`}
        />
        <KpiCard
          label="Overdue CAPA"
          value={metrics.overdueCapa}
          tone={metrics.overdueCapa > 0 ? 'red' : 'green'}
          footer={`${metrics.openCapa} open in total`}
        />
        <KpiCard
          label="Training"
          value={formatPercent(metrics.trainingCompliance)}
          tone={metrics.trainingCompliance >= settings.target.trainingCompliance ? 'green' : 'amber'}
          target={{
            label: `≥ ${settings.target.trainingCompliance}%`,
            met: metrics.trainingCompliance >= settings.target.trainingCompliance,
          }}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="print-page xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Monthly safety trend — {unit.code}</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Recordables, near misses and observation activity</p>
            </div>
          </CardHeader>
          <CardContent>
            <ComboChart
              data={trend as unknown as Record<string, unknown>[]}
              xKey="label"
              bars={[
                { key: 'recordable', label: 'Recordable', color: SERIES_COLORS.recordable },
                { key: 'nearMisses', label: 'Near misses', color: SERIES_COLORS.nearMisses },
              ]}
              line={{ key: 'safetyObservations', label: 'Observations', color: SERIES_COLORS.safetyObservations }}
              height={276}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unit profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-around">
              <ProgressCircle
                value={metrics.trainingCompliance}
                target={settings.target.trainingCompliance}
                label="Training"
                size={98}
              />
              <ProgressCircle value={metrics.ppeCompliance} target={settings.target.ppeCompliance} label="PPE" size={98} />
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-ink-100 pt-4">
              <MiniMetric label="Headcount" value={formatNumber(metrics.employees)} sub={`${formatCompact(metrics.manHours)} man-hrs`} />
              <MiniMetric label="Departments" value={unit.departments.length} sub={unit.departments.slice(0, 2).join(', ')} />
              <MiniMetric
                label="CAPA on-time"
                value={formatPercent(metrics.capaOnTimeClosure, 0)}
                tone={metrics.capaOnTimeClosure >= settings.target.capaOnTimeClosure ? 'success' : 'warning'}
              />
              <MiniMetric
                label="Inspection score"
                value={metrics.inspectionScore ? metrics.inspectionScore.toFixed(1) : '—'}
                tone={metrics.inspectionScore >= 85 ? 'success' : 'warning'}
                sub={`${insp.failed} failed`}
              />
            </div>
            <div className="border-t border-ink-100 pt-3">
              <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Departments</p>
              <div className="flex flex-wrap gap-1">
                {unit.departments.map((d) => (
                  <span key={d} className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-600">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Incident mix</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => navigate('/incidents')}>
                Open
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={Object.entries(
                state.incidents
                  .filter((i) => i.unitId === unit.id)
                  .reduce<Record<string, number>>((acc, i) => {
                    acc[i.incidentType] = (acc[i.incidentType] ?? 0) + 1;
                    return acc;
                  }, {}),
              )
                .map(([k, v]) => ({ name: k, value: v }))
                .sort((a, b) => b.value - a.value)}
              centerValue={String(metrics.incidents)}
              centerLabel="incidents"
              height={200}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Near-miss categories</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => navigate('/near-misses')}>
                Open
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <BarSeriesChart
              data={nearMiss.byCategory.slice(0, 6).map((c) => ({ label: c.category, total: c.count }))}
              xKey="label"
              horizontal
              height={216}
              series={[{ key: 'total', label: 'Near misses', color: CHART_COLORS.amber }]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance trajectory</CardTitle>
            <p className="text-[11px] text-ink-500">Training vs PPE by month</p>
          </CardHeader>
          <CardContent>
            <TrendLineChart
              data={trend as unknown as Record<string, unknown>[]}
              series={[
                { key: 'trainingCompliance', label: 'Training %', color: CHART_COLORS.green },
                { key: 'ppeCompliance', label: 'PPE %', color: CHART_COLORS.blue },
              ]}
              tooltipFormat="percent"
              suffix="%"
              height={216}
              yDomain={[60, 100]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Open work */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="print-page">
          <CardHeader>
            <div>
              <CardTitle>Open corrective actions</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">
                {capa.open} open · {capa.overdue} overdue · {formatPercent(metrics.capaOnTimeClosure, 0)} on-time closure
              </p>
            </div>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => navigate('/capa')}>
                All CAPA
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {openActions.length === 0 ? (
              <EmptyState compact title="No open corrective actions" description="All findings in this unit are closed." />
            ) : (
              <ul className="divide-y divide-ink-100">
                {openActions.map((c) => {
                  const overdue = c.dueDate < '2026-09-29' && c.status !== 'Completed';
                  return (
                    <li key={c.id} className="flex items-start gap-3 px-5 py-2.5 transition-colors hover:bg-ink-50">
                      <StatusDot value={c.priority} className="mt-1.5" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-ink-900">{c.finding}</p>
                        <p className="mt-0.5 text-[10px] text-ink-500">
                          {c.actionNo} · {c.responsiblePerson} · due {formatDate(c.dueDate)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge value={overdue ? 'Overdue' : c.status} size="xs" />
                        <span className="text-[9px] text-ink-400">{c.source}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="print-page">
          <CardHeader>
            <div>
              <CardTitle>Recent incidents</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Latest entries for {unit.code}</p>
            </div>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => navigate('/incidents')}>
                Register
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {recentIncidents.length === 0 ? (
              <EmptyState compact title="No incidents recorded" description="This unit has no incident entries in the dataset." />
            ) : (
              <ul className="divide-y divide-ink-100">
                {recentIncidents.map((i) => (
                  <li key={i.id} className="flex items-start gap-3 px-5 py-2.5">
                    <StatusDot value={i.severity} className="mt-1.5" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink-900">{i.description}</p>
                      <p className="mt-0.5 text-[10px] text-ink-500">
                        {i.incidentNo} · {formatDate(i.date)} · {i.department} · {i.area}
                      </p>
                    </div>
                    <StatusBadge value={i.investigationStatus} size="xs" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Definitions + quick nav */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="print-page">
          <CardHeader>
            <CardTitle>Rates for {unit.code}</CardTitle>
            <p className="text-[11px] text-ink-500">Compared to the previous period and corporate targets</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {indicators.map((ind) => {
              const met = ind.target === null ? null : ind.better === 'lower' ? ind.value <= ind.target : ind.value >= ind.target;
              return (
                <div key={ind.key} className="rounded-lg border border-ink-100 p-2.5">
                  <p className="text-[10px] font-semibold tracking-wide text-ink-500 uppercase">{ind.label}</p>
                  <p className="mt-0.5 text-lg leading-none font-semibold text-ink-900 tabular-nums">
                    {ind.value.toFixed(2)}
                  </p>
                  <p className="mt-1 text-[9px] text-ink-400">prev {ind.previous.toFixed(2)}</p>
                  <p
                    className={cn(
                      'mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold',
                      met === null
                        ? 'bg-ink-100 text-ink-600'
                        : met
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700',
                    )}
                  >
                    {met === null ? 'Tracking' : met ? 'On target' : 'Off target'}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unit records</CardTitle>
            <p className="text-[11px] text-ink-500">Jump to a module with the unit scope already applied</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {[
              { to: '/incidents', icon: AlertTriangle, label: 'Incidents', count: metrics.incidents },
              { to: '/near-misses', icon: Radar, label: 'Near Misses', count: metrics.nearMisses },
              { to: '/observations', icon: Eye, label: 'Observations', count: metrics.observations },
              { to: '/capa', icon: ClipboardCheck, label: 'CAPA', count: metrics.totalCapa },
              { to: '/inspections', icon: ClipboardList, label: 'Inspections', count: insp.completed + insp.pending },
              { to: '/training', icon: GraduationCap, label: 'Training', count: metrics.trainingTotal },
              { to: '/ppe', icon: HardHat, label: 'PPE', count: metrics.ppeAssessed },
              { to: '/emergency', icon: Flame, label: 'Emergency', count: emergency.assets.total },
              { to: '/reports', icon: ShieldCheck, label: 'Reports', count: state.reports.length },
            ].map((l) => (
              <button
                key={l.to}
                type="button"
                onClick={() => navigate(l.to)}
                className="flex items-center gap-2 rounded-lg border border-ink-200 p-2.5 text-left transition-colors hover:border-safety-300 hover:bg-safety-50/40"
              >
                <l.icon className="h-4 w-4 shrink-0 text-ink-500" />
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-medium text-ink-800">{l.label}</span>
                  <span className="block text-[10px] text-ink-400 tabular-nums">{l.count} records</span>
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center pt-1">
        <Button variant="outline" size="sm" onClick={() => navigate('/units')}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to all units
        </Button>
      </div>
    </div>
  );
}


