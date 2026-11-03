import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Eye,
  Flame,
  GraduationCap,
  HardHat,
  Radar,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';

import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/common/PageHeader';
import { GlobalFilterBar } from '@/components/common/GlobalFilterBar';
import { UnitScorecard, StatusDistribution, MiniMetric } from '@/components/common/UnitScorecard';
import { KpiCard } from '@/components/ui/kpi-card';
import { Badge, Card, CardAction, CardContent, CardHeader, CardTitle, Button, StatusBadge } from '@/components/ui';
import { StatusDot } from '@/components/ui/badge';
import { Progress, ProgressCircle } from '@/components/ui/progress';
import { BarSeriesChart, ComboChart, DonutChart, ChartLegend } from '@/components/charts';
import {
  buildIndicators,
  capaSummary,
  emergencySummary,
  inspectionSummary,
  monthlyTrend,
  nearMissSummary,
  observationSummary,
  STATUS_ORDER,
} from '@/data/analytics';
import { CHART_COLORS, SERIES_COLORS } from '@/lib/theme';
import { formatCompact, formatDate, formatNumber, formatPercent, relativeTime, titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';

export function Dashboard() {
  const { corporate, previousCorporate, unitMetrics, state, filter, settings, unreadNotificationCount } = useData();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const trend = React.useMemo(() => monthlyTrend(state, filter.unitId), [state, filter.unitId]);
  const nearMiss = React.useMemo(
    () => nearMissSummary(state, filter.range, filter.unitId),
    [state, filter.range, filter.unitId],
  );
  const obs = React.useMemo(
    () => observationSummary(state, filter.range, filter.unitId),
    [state, filter.range, filter.unitId],
  );
  const capa = React.useMemo(() => capaSummary(state, filter.range, filter.unitId), [state, filter.range, filter.unitId]);
  const insp = React.useMemo(
    () => inspectionSummary(state, filter.range, filter.unitId),
    [state, filter.range, filter.unitId],
  );
  const emergency = React.useMemo(() => emergencySummary(state, filter.unitId), [state, filter.unitId]);

  const indicators = React.useMemo(
    () => buildIndicators(corporate, previousCorporate, settings.target),
    [corporate, previousCorporate, settings.target],
  );

  const recentIncidents = React.useMemo(
    () =>
      [...state.incidents]
        .filter((i) => filter.unitId === 'ALL' || i.unitId === filter.unitId)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [state.incidents, filter.unitId],
  );

  const alertFeed = React.useMemo(
    () => state.notifications.filter((n) => !n.read).slice(0, 5),
    [state.notifications],
  );

  const scoped = filter.unitId !== 'ALL';
  const scopeLabel = scoped
    ? state.units.find((u) => u.id === filter.unitId)?.code ?? 'Unit'
    : 'Campus-wide';

  const delta = (current: number, previous: number) => (previous === 0 ? 0 : ((current - previous) / previous) * 100);

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Good ${greeting()}, ${user?.name.split(' ')[0] ?? 'there'}`}
        description={`${role?.name} · ${scopeLabel} · ${formatDate(filter.range.from)} – ${formatDate(filter.range.to)}`}
        breadcrumbs={[{ label: 'EHS', to: '/dashboard' }, { label: 'Dashboard' }]}
        badges={
          <Badge tone={corporate.status === 'Good' ? 'success' : corporate.status === 'Critical' ? 'danger' : 'warning'} showDot>
            {corporate.status}
          </Badge>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/units')}>
            All units
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        }
        toolbar={<GlobalFilterBar />}
      />

      {/* --------------------------- executive attention -------------------- */}
      {!scoped && unitMetrics.some((m) => m.status === 'Critical') ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-red-600" />
          <p className="min-w-0 flex-1 text-xs text-red-800">
            <span className="font-semibold">
              {unitMetrics.filter((m) => m.status === 'Critical').length} unit
              {unitMetrics.filter((m) => m.status === 'Critical').length === 1 ? '' : 's'} need immediate attention.
            </span>{' '}
            Prioritise units with overdue corrective actions and lost-time injuries.
          </p>
          <Button size="sm" variant="danger" onClick={() => navigate('/capa')}>
            Review overdue CAPA ({capa.overdue})
          </Button>
        </div>
      ) : null}

      {/* -------------------------------- KPI row --------------------------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <KpiCard
          label="LTIFR"
          value={corporate.ltifr.toFixed(2)}
          unit="per 1M hrs"
          icon={ShieldCheck}
          tone={corporate.ltifr <= settings.target.ltifr ? 'green' : corporate.ltifr <= settings.target.ltifr * 1.25 ? 'amber' : 'red'}
          trend={{ value: delta(corporate.ltifr, previousCorporate.ltifr), goodWhen: 'down', label: 'vs prev period' }}
          target={{ label: `≤ ${settings.target.ltifr}`, met: corporate.ltifr <= settings.target.ltifr }}
          hint="Lost Time Injuries × 1,000,000 ÷ total man-hours worked. Lower is better."
          onClick={() => navigate('/corporate')}
        />
        <KpiCard
          label="TRIFR"
          value={corporate.trifr.toFixed(2)}
          unit="per 1M hrs"
          icon={AlertTriangle}
          tone={corporate.trifr <= settings.target.trifr ? 'green' : corporate.trifr <= settings.target.trifr * 1.25 ? 'amber' : 'red'}
          trend={{ value: delta(corporate.trifr, previousCorporate.trifr), goodWhen: 'down', label: 'vs prev period' }}
          target={{ label: `≤ ${settings.target.trifr}`, met: corporate.trifr <= settings.target.trifr }}
          hint="Total Recordable Frequency Rate — recordable cases × 1,000,000 ÷ man-hours."
          onClick={() => navigate('/corporate')}
        />
        <KpiCard
          label="Incidents"
          value={formatNumber(corporate.incidents)}
          icon={AlertTriangle}
          tone="navy"
          trend={{ value: delta(corporate.incidents, previousCorporate.incidents), goodWhen: 'down', label: 'in period' }}
          footer={`${corporate.lostTimeInjuries} LTI · ${corporate.recordableCases} recordable`}
          onClick={() => navigate('/incidents')}
        />
        <KpiCard
          label="Near Misses"
          value={formatNumber(corporate.nearMisses)}
          icon={Radar}
          tone="amber"
          trend={{ value: delta(corporate.nearMisses, previousCorporate.nearMisses), goodWhen: 'up', label: 'reporting rate' }}
          footer={`${nearMiss.highPotential} high potential`}
          hint="Near misses are a leading indicator. An increase usually means better reporting culture."
          onClick={() => navigate('/near-misses')}
        />
        <KpiCard
          label="Open CAPA"
          value={formatNumber(corporate.openCapa)}
          icon={ClipboardCheck}
          tone={corporate.openCapa === 0 ? 'green' : corporate.overdueCapa > 0 ? 'red' : 'blue'}
          footer={<span className={cn(corporate.overdueCapa > 0 && 'font-semibold text-red-600')}>{corporate.overdueCapa} overdue</span>}
          onClick={() => navigate('/capa')}
        />
        <KpiCard
          label="Training"
          value={formatPercent(corporate.trainingCompliance)}
          icon={GraduationCap}
          tone={corporate.trainingCompliance >= settings.target.trainingCompliance ? 'green' : 'amber'}
          trend={{
            value: delta(corporate.trainingCompliance, previousCorporate.trainingCompliance),
            goodWhen: 'up',
            label: 'vs prev',
          }}
          target={{ label: `≥ ${settings.target.trainingCompliance}%`, met: corporate.trainingCompliance >= settings.target.trainingCompliance }}
          footer={`${formatNumber(corporate.trainingExpired)} expired`}
          onClick={() => navigate('/training')}
        />
      </div>

      {/* ------------------------------- main grid ------------------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Trend */}
        <Card className="xl:col-span-2 print-page">
          <CardHeader>
            <div>
              <CardTitle>Safety performance trend</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Monthly recordables vs near misses and observation activity</p>
            </div>
            <CardAction>
              <ChartLegend
                labels={[
                  { key: 'recordable', label: 'Recordable', color: SERIES_COLORS.recordable },
                  { key: 'nearMisses', label: 'Near Misses', color: SERIES_COLORS.nearMisses },
                  { key: 'safetyObservations', label: 'Observations', color: SERIES_COLORS.safetyObservations },
                ]}
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            <ComboChart
              data={trend as unknown as Record<string, unknown>[]}
              xKey="label"
              bars={[
                { key: 'recordable', label: 'Recordable cases', color: SERIES_COLORS.recordable },
                { key: 'nearMisses', label: 'Near misses', color: SERIES_COLORS.nearMisses },
              ]}
              line={{ key: 'safetyObservations', label: 'Observations', color: SERIES_COLORS.safetyObservations }}
              height={288}
            />
          </CardContent>
        </Card>

        {/* Status distribution + compliance */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Operational monitoring band</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Triage aid, not a league table</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusDistribution
              counts={corporate.statusCount}
              onSelect={(s) => {
                const target = [...unitMetrics].sort((a, b) => STATUS_ORDER[b.status] - STATUS_ORDER[a.status]).find((m) => m.status === s);
                if (target) navigate(`/units/${target.unitId}`);
              }}
            />

            <div className="grid grid-cols-2 gap-3 border-t border-ink-100 pt-4">
              <ProgressCircle
                value={corporate.trainingCompliance}
                target={settings.target.trainingCompliance}
                label="Training compliant"
                sublabel={`target ${settings.target.trainingCompliance}%`}
                size={104}
              />
              <ProgressCircle
                value={corporate.ppeCompliance}
                target={settings.target.ppeCompliance}
                label="PPE compliant"
                sublabel={`target ${settings.target.ppeCompliance}%`}
                size={104}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-ink-100 pt-4">
              <MiniMetric label="Headcount" value={formatNumber(corporate.employees)} icon={Users} sub={`${formatCompact(corporate.manHours)} man-hrs`} />
              <MiniMetric label="Units monitored" value={corporate.unitCount} icon={Building2} sub="Spinning operations" />
              <MiniMetric
                label="Emergency readiness"
                value={formatPercent(emergency.preparednessScore, 0)}
                tone={emergency.preparednessScore >= 85 ? 'success' : 'warning'}
                sub={`${emergency.assets.due} assets due`}
              />
              <MiniMetric
                label="Drill compliance"
                value={formatPercent(emergency.completed > 0 ? (emergency.completed / Math.max(1, emergency.totalDrills)) * 100 : 0, 0)}
                sub={`${emergency.completed}/${emergency.totalDrills} conducted`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------- unit scorecard + alerts ----------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="print-page xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{scoped ? 'Unit scorecard' : 'All unit scorecard'}</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Sorted by LTIFR — highest injury frequency first</p>
            </div>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => navigate('/units')}>
                View units
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <UnitScorecard
              metrics={unitMetrics}
              targets={settings.target}
              caption={`Targets — LTIFR ≤ ${settings.target.ltifr} · Training ≥ ${settings.target.trainingCompliance}% · PPE ≥ ${settings.target.ppeCompliance}%`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Requires attention</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">{unreadNotificationCount} unread alerts</p>
            </div>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => navigate('/notifications')}>
                All
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertFeed.length === 0 ? (
              <p className="py-8 text-center text-xs text-ink-400">No open alerts. All clear.</p>
            ) : (
              alertFeed.map((n) => (
                <Link
                  key={n.id}
                  to={n.link || '/notifications'}
                  className="flex gap-2.5 rounded-lg border border-ink-100 p-2.5 transition-colors hover:border-ink-200 hover:bg-ink-50"
                >
                  <StatusDot value={n.severity} className="mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink-900">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-500">{n.message}</p>
                    <p className="mt-1 text-[10px] text-ink-400">{relativeTime(n.createdAt)}</p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* --------------------------- breakdown row ------------------------- */}
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
              data={Object.entries(corporate.incidentByType)
                .map(([k, v]) => ({ name: k, value: v }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 7)}
              centerValue={String(corporate.incidents)}
              centerLabel="incidents"
              height={196}
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
            <CardTitle>Corrective actions by unit</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => navigate('/capa')}>
                Open
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <BarSeriesChart
              data={capa.byUnit.map((u) => ({ label: u.unitCode, open: u.open, overdue: u.overdue }))}
              xKey="label"
              stacked
              height={216}
              series={[
                { key: 'open', label: 'Open / in progress', color: CHART_COLORS.blue },
                { key: 'overdue', label: 'Overdue', color: CHART_COLORS.red },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------- recent activity ---------------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="print-page xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Recent incidents</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Latest entries across the incident register</p>
            </div>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => navigate('/incidents')}>
                Register
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="data-grid-scroll overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-50">
                  <tr className="border-b border-ink-200">
                    {['Incident', 'Date', 'Unit', 'Type', 'Severity', 'Status'].map((h, i) => (
                      <th
                        key={h}
                        scope="col"
                        className={cn(
                          'h-9 px-3 text-[10px] font-semibold tracking-wide text-ink-500 uppercase',
                          i >= 2 ? 'text-right' : 'text-left',
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentIncidents.map((i) => (
                    <tr
                      key={i.id}
                      onClick={() => navigate(`/incidents?open=${i.id}`)}
                      className="cursor-pointer border-b border-ink-100 transition-colors last:border-0 hover:bg-safety-50/40"
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-mono text-[12px] font-medium text-navy-800">{i.incidentNo}</p>
                        <p className="max-w-64 truncate text-[10px] text-ink-500">{i.description}</p>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] whitespace-nowrap text-ink-600">{formatDate(i.date)}</td>
                      <td className="px-3 py-2.5 text-right text-[12px] font-medium text-ink-800">
                        {state.units.find((u) => u.id === i.unitId)?.code}
                      </td>
                      <td className="hidden px-3 py-2.5 text-right text-[11px] text-ink-600 sm:table-cell">
                        {i.incidentType}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <StatusBadge value={i.severity} size="xs" />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <StatusBadge value={i.status} size="xs" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Module health</CardTitle>
            <p className="text-[11px] text-ink-500">Open work by module</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ModuleLink to="/observations" icon={Eye} label="Safety observations" open={obs.open} total={obs.total} />
            <ModuleLink
              to="/inspections"
              icon={ClipboardList}
              label="Inspections pending"
              open={insp.pending + insp.failed}
              total={insp.scheduled || insp.completed + insp.pending + insp.failed}
              danger={insp.failed > 0}
            />
            <ModuleLink
              to="/capa"
              icon={ClipboardCheck}
              label="Corrective actions"
              open={capa.open + capa.inProgress}
              total={capa.total}
              danger={capa.overdue > 0}
            />
            <ModuleLink
              to="/training"
              icon={GraduationCap}
              label="Training pending / expired"
              open={corporate.trainingPending + corporate.trainingExpired}
              total={corporate.trainingTotal}
              danger={corporate.trainingExpired > 0}
            />
            <ModuleLink
              to="/ppe"
              icon={HardHat}
              label="PPE non-compliance"
              open={corporate.ppeNonCompliant}
              total={corporate.ppeAssessed}
            />
            <ModuleLink
              to="/emergency"
              icon={Flame}
              label="Emergency assets due"
              open={emergency.assets.due + emergency.assets.defective}
              total={emergency.assets.total}
              danger={emergency.assets.defective > 0}
            />

            <div className="border-t border-ink-100 pt-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-ink-500">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Next scheduled drill
                </span>
                <span className="font-medium text-ink-800">
                  {emergency.nextDrill ? formatDate(emergency.nextDrill.date) : 'None planned'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------ KPI glossary ---------------------- */}
      <Card className="print-page">
        <CardHeader>
          <div>
            <CardTitle>Indicator definitions</CardTitle>
            <p className="mt-0.5 text-xs text-ink-500">
              Every rate on this screen is computed live from the register records using these formulas
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {indicators.map((ind) => {
            const met = ind.direction === 'lower-is-better' ? ind.value <= ind.target : ind.value >= ind.target;
            const improving =
              ind.direction === 'lower-is-better' ? ind.value <= ind.previous : ind.value >= ind.previous;
            return (
              <div key={ind.key} className="rounded-lg border border-ink-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-semibold tracking-wide text-ink-600 uppercase">{ind.label}</p>
                  <StatusDot value={met ? 'Good' : 'Critical'} />
                </div>
                <p className="mt-1 text-lg leading-none font-semibold text-ink-900 tabular-nums">
                  {ind.value.toFixed(2)}
                  <span className="ml-1 text-[10px] font-normal text-ink-400">{ind.unit}</span>
                </p>
                <p className="mt-1 flex items-center gap-1 text-[10px]">
                  {improving ? (
                    <TrendingDown className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <TrendingUp className="h-3 w-3 text-red-500" />
                  )}
                  <span className="text-ink-500">previous {ind.previous.toFixed(2)}</span>
                </p>
                <p className="mt-1.5 text-[10px] leading-snug text-ink-400">{titleCase(ind.formula)}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function ModuleLink({
  to,
  icon: Icon,
  label,
  open,
  total,
  danger,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  open: number;
  total: number;
  danger?: boolean;
}) {
  const pct = total > 0 ? (open / total) * 100 : 0;
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border border-ink-100 px-3 py-2.5 transition-colors hover:border-ink-200 hover:bg-ink-50"
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          danger ? 'bg-red-50 text-red-600' : 'bg-ink-100 text-ink-600',
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-ink-800">{label}</span>
          <span className={cn('shrink-0 text-xs font-semibold tabular-nums', danger ? 'text-red-600' : 'text-ink-900')}>
            {formatNumber(open)}
          </span>
        </span>
        <Progress
          value={100 - pct}
          size="sm"
          className="mt-1.5"
          tone={danger ? 'red' : pct > 30 ? 'amber' : 'green'}
          target={100}
        />
      </span>
    </Link>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
