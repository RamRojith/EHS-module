import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Info, ShieldCheck, Users } from 'lucide-react';

import { useData } from '@/context/DataContext';
import { PageHeader } from '@/components/common/PageHeader';
import { GlobalFilterBar } from '@/components/common/GlobalFilterBar';
import { UnitScorecard, StatusDistribution, MiniMetric } from '@/components/common/UnitScorecard';
import { KpiCard } from '@/components/ui/kpi-card';
import { Card, CardAction, CardContent, CardHeader, CardTitle, Button, Alert } from '@/components/ui';
import { ProgressCircle } from '@/components/ui/progress';
import { BarSeriesChart, ComboChart, DonutChart, HeatMatrix, TrendLineChart } from '@/components/charts';
import { buildIndicators, getAllUnitMetrics, monthlyTrend, previousPeriodRange, type UnitMetrics } from '@/data/analytics';
import { CHART_COLORS, SERIES_COLORS } from '@/lib/theme';
import { MONTH_SHORT } from '@/lib/format';
import { formatCompact, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export function CorporateSafety() {
  const { corporate, previousCorporate, unitMetrics, state, filter, settings } = useData();
  const navigate = useNavigate();

  const prevRange = React.useMemo(() => previousPeriodRange(filter.range), [filter.range]);
  const prevMetrics = React.useMemo(() => getAllUnitMetrics(state, prevRange), [state, prevRange]);

  const trend = React.useMemo(() => monthlyTrend(state, 'ALL'), [state]);
  const indicators = React.useMemo(
    () => buildIndicators(corporate, previousCorporate, settings.target),
    [corporate, previousCorporate, settings.target],
  );

  /* ----------------------------- heat matrix --------------------------- */
  const months = React.useMemo(
    () =>
      Array.from(new Set(trend.map((t) => t.month)))
        .sort()
        .map((m) => ({ key: m, label: MONTH_SHORT[Number(m.slice(5)) - 1] ?? m.slice(5) })),
    [trend],
  );

  const ltifrHeat = React.useMemo(() => {
    const cells: Record<string, number> = {};
    months.forEach(({ key: m }) => {
      unitMetrics.forEach((u) => {
        const monthly = state.incidents.filter(
          (i) =>
            i.unitId === u.unitId &&
            i.date.startsWith(m) &&
            (i.incidentType === 'Lost Time Injury' || i.incidentType === 'Medical Treatment'),
        ).length;
        const hours = state.manHours[`${u.unitId}|${m}`] ?? 0;
        cells[`${u.unitId}|${m}`] = hours > 0 ? Number(((monthly * 1_000_000) / hours).toFixed(1)) : 0;
      });
    });
    return cells;
  }, [months, unitMetrics, state]);

  const observationHeat = React.useMemo(() => {
    const cells: Record<string, number> = {};
    months.forEach(({ key: m }) => {
      unitMetrics.forEach((u) => {
        cells[`${u.unitId}|${m}`] = state.observations.filter((o) => o.unitId === u.unitId && o.date.startsWith(m)).length;
      });
    });
    return cells;
  }, [months, unitMetrics, state.observations]);

  const scatter = React.useMemo(
    () =>
      unitMetrics.map((m) => ({
        label: m.unitCode,
        ltifr: Number(m.ltifr.toFixed(2)),
        training: Number(m.trainingCompliance.toFixed(1)),
        ppe: Number(m.ppeCompliance.toFixed(1)),
        headcount: m.employees,
        status: m.status,
      })),
    [unitMetrics],
  );

  const compliance = React.useMemo(
    () =>
      unitMetrics.map((m) => ({
        label: m.unitCode,
        Training: Number(m.trainingCompliance.toFixed(1)),
        PPE: Number(m.ppeCompliance.toFixed(1)),
      })),
    [unitMetrics],
  );

  const delta = (current: number, previous: number) => (previous === 0 ? 0 : ((current - previous) / previous) * 100);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Corporate Safety Performance"
        description={`Consolidated view across ${corporate.unitCount} spinning units and ${formatNumber(corporate.employees)} employees. All rates are recomputed from the underlying registers for the selected period.`}
        breadcrumbs={[{ label: 'EHS', to: '/dashboard' }, { label: 'Corporate Safety' }]}
        icon={<Building2 className="h-4 w-4" />}
        badges={
          <span className="text-[11px] text-ink-500">
            {formatCompact(corporate.manHours)} man-hours in period
          </span>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
            Open reports
          </Button>
        }
        toolbar={<GlobalFilterBar showUnit={false} />}
      />

      <Alert tone="info" variant="left-bar" icon={<Info className="h-4 w-4" />}>
        <span className="font-medium">Reading this screen:</span> the monitoring band is a triage aid built from a single
        explainable risk score (injury frequency, CAPA backlog, open incidents, failed inspections, training and PPE
        compliance). It is not a ranking of unit safety performance.
      </Alert>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard
          label="LTIFR"
          value={corporate.ltifr.toFixed(2)}
          tone={corporate.ltifr <= settings.target.ltifr ? 'green' : 'red'}
          trend={{ value: delta(corporate.ltifr, previousCorporate.ltifr), goodWhen: 'down', label: 'vs prev' }}
          target={{ label: `≤ ${settings.target.ltifr}`, met: corporate.ltifr <= settings.target.ltifr }}
        />
        <KpiCard
          label="TRIFR"
          value={corporate.trifr.toFixed(2)}
          tone={corporate.trifr <= settings.target.trifr ? 'green' : 'red'}
          trend={{ value: delta(corporate.trifr, previousCorporate.trifr), goodWhen: 'down', label: 'vs prev' }}
          target={{ label: `≤ ${settings.target.trifr}`, met: corporate.trifr <= settings.target.trifr }}
        />
        <KpiCard
          label="Recordable"
          value={formatNumber(corporate.recordableCases)}
          tone="navy"
          footer={`${corporate.lostDays} days lost`}
        />
        <KpiCard label="Near Misses" value={formatNumber(corporate.nearMisses)} tone="amber" footer="Leading indicator" />
        <KpiCard label="Observations" value={formatNumber(corporate.observations)} tone="blue" footer="Unsafe acts + conditions" />
        <KpiCard
          label="CAPA On-Time"
          value={formatPercent(corporate.capaOnTimeClosure, 0)}
          tone={corporate.capaOnTimeClosure >= settings.target.capaOnTimeClosure ? 'green' : 'amber'}
          target={{ label: `≥ ${settings.target.capaOnTimeClosure}%`, met: corporate.capaOnTimeClosure >= settings.target.capaOnTimeClosure }}
          footer={`${corporate.overdueCapa} overdue`}
        />
        <KpiCard
          label="Headcount"
          value={formatNumber(corporate.employees)}
          tone="slate"
          icon={Users}
          footer={`${formatCompact(corporate.manHours)} man-hrs`}
        />
      </div>

      {/* Scorecard */}
      <Card className="print-page">
        <CardHeader>
          <div>
            <CardTitle>Unit scorecard — all {corporate.unitCount} units</CardTitle>
            <p className="mt-0.5 text-xs text-ink-500">Click any row to open that unit's dashboard</p>
          </div>
          <CardAction>
            <StatusDistribution counts={corporate.statusCount} />
          </CardAction>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <UnitScorecard
            metrics={unitMetrics}
            targets={settings.target}
            caption="Compliance bars are measured against the corporate targets configured in Settings."
          />
        </CardContent>
      </Card>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="print-page xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Monthly trend — injuries vs near misses</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">2026 financial year to date</p>
            </div>
          </CardHeader>
          <CardContent>
            <ComboChart
              data={trend as unknown as Record<string, unknown>[]}
              xKey="label"
              bars={[
                { key: 'lostTimeInjuries', label: 'Lost time injuries', color: SERIES_COLORS.lostTimeInjuries },
                { key: 'firstAid', label: 'First aid', color: SERIES_COLORS.firstAid },
                { key: 'nearMisses', label: 'Near misses', color: SERIES_COLORS.nearMisses },
              ]}
              line={{ key: 'safetyObservations', label: 'Observations', color: SERIES_COLORS.safetyObservations }}
              height={300}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance by unit</CardTitle>
            <p className="text-[11px] text-ink-500">vs corporate target</p>
          </CardHeader>
          <CardContent>
            <BarSeriesChart
              data={compliance}
              xKey="label"
              series={[
                { key: 'Training', label: 'Training', color: CHART_COLORS.green },
                { key: 'PPE', label: 'PPE', color: CHART_COLORS.blue },
              ]}
              height={300}
              reference={{ value: settings.target.trainingCompliance, label: `Target ${settings.target.trainingCompliance}%` }}
              suffix="%"
            />
          </CardContent>
        </Card>
      </div>

      {/* Heat maps */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="print-page">
          <CardHeader>
            <div>
              <CardTitle>LTIFR heat map</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Monthly injury frequency by unit — darker means worse</p>
            </div>
          </CardHeader>
          <CardContent>
            <HeatMatrix
              rows={unitMetrics.map((m) => ({ key: m.unitId, label: m.unitCode }))}
              columns={months}
              cells={ltifrHeat}
              format={(v) => (v === 0 ? '–' : v.toFixed(1))}
            />
          </CardContent>
        </Card>

        <Card className="print-page">
          <CardHeader>
            <div>
              <CardTitle>Observation activity heat map</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Monthly observations raised by unit</p>
            </div>
          </CardHeader>
          <CardContent>
            <HeatMatrix
              rows={unitMetrics.map((m) => ({ key: m.unitId, label: m.unitCode }))}
              columns={months}
              cells={observationHeat}
            />
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Incident type mix</CardTitle>
            <p className="text-[11px] text-ink-500">All units combined</p>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={Object.entries(corporate.incidentByType)
                .map(([k, v]) => ({ name: k, value: v }))
                .sort((a, b) => b.value - a.value)}
              centerValue={String(corporate.incidents)}
              centerLabel="incidents"
              height={230}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Severity distribution</CardTitle>
            <p className="text-[11px] text-ink-500">By assessed severity</p>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={(['Critical', 'High', 'Medium', 'Low'] as const).map((s) => ({
                name: s,
                value: corporate.incidentBySeverity[s] ?? 0,
                color:
                  s === 'Critical'
                    ? CHART_COLORS.red
                    : s === 'High'
                      ? CHART_COLORS.safety
                      : s === 'Medium'
                        ? CHART_COLORS.amber
                        : CHART_COLORS.green,
              }))}
              centerValue={String(corporate.incidents)}
              centerLabel="incidents"
              height={230}
            />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Relative exposure profile</CardTitle>
            <p className="text-[11px] text-ink-500">Each unit indexed to the highest value in the campus (100 = worst)</p>
          </CardHeader>
          <CardContent>
            <BarSeriesChart
              data={scatter.map((s) => ({ label: s.label, ltifr: s.ltifr }))}
              xKey="label"
              height={280}
              series={[{ key: 'ltifr', label: 'LTIFR (per 1M hrs)', color: CHART_COLORS.safety }]}
              reference={{ value: settings.target.ltifr, label: `Target ${settings.target.ltifr}` }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Compliance + definitions */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Training & PPE compliance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-around gap-6">
            <ProgressCircle
              value={corporate.trainingCompliance}
              target={settings.target.trainingCompliance}
              label="Training compliant"
              sublabel={`${formatNumber(corporate.trainingCompleted)} completed`}
              size={124}
            />
            <ProgressCircle
              value={corporate.ppeCompliance}
              target={settings.target.ppeCompliance}
              label="PPE compliant"
              sublabel={`${formatNumber(corporate.ppeAssessed - corporate.ppeNonCompliant)} compliant`}
              size={124}
            />
            <div className="grid flex-1 grid-cols-2 gap-3">
              <MiniMetric label="Training expired" value={formatNumber(corporate.trainingExpired)} tone="danger" sub="certificates lapsed" />
              <MiniMetric label="Training pending" value={formatNumber(corporate.trainingPending)} tone="warning" sub="awaiting completion" />
              <MiniMetric label="PPE non-compliant" value={formatNumber(corporate.ppeNonCompliant)} tone="warning" sub="assessments failed" />
              <MiniMetric label="Readiness" value={formatPercent(corporate.emergencyReadiness, 0)} tone="success" sub="emergency score" />
            </div>
          </CardContent>
        </Card>

        <Card className="print-page">
          <CardHeader>
            <div>
              <CardTitle>Rate definitions & targets</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Shared by every screen in the module</p>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {indicators.map((ind) => {
              const met = ind.direction === 'lower-is-better' ? ind.value <= ind.target : ind.value >= ind.target;
              return (
                <div key={ind.key} className="rounded-lg border border-ink-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold tracking-wide text-ink-700 uppercase">{ind.label}</p>
                      <p className="text-[10px] text-ink-400">{ind.full}</p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                        met ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
                      )}
                    >
                      {met ? 'On target' : 'Off target'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-lg leading-none font-semibold text-ink-900 tabular-nums">
                    {ind.value.toFixed(2)}
                    <span className="ml-1 text-[10px] font-normal text-ink-400">
                      target {ind.direction === 'lower-is-better' ? '≤' : '≥'} {ind.target}
                    </span>
                  </p>
                  <p className="mt-1.5 text-[10px] leading-snug text-ink-500">{ind.description}</p>
                  <p className="mt-1 font-mono text-[9px] text-ink-400">{ind.formula}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Previous period comparison */}
      <Card className="print-page">
        <CardHeader>
          <div>
            <CardTitle>Unit movement vs previous period</CardTitle>
            <p className="mt-0.5 text-xs text-ink-500">
              Change in LTIFR between {prevRange.from} and {prevRange.to}
            </p>
          </div>
          <CardAction>
            <span className="flex items-center gap-1 text-[10px] text-ink-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              {formatNumber(scatter.length)} units
            </span>
          </CardAction>
        </CardHeader>
        <CardContent>
          <TrendLineChart
            data={unitMetrics.map((m) => {
              const prev = prevMetrics.find((p) => p.unitId === m.unitId);
              return {
                label: m.unitCode,
                current: Number(m.ltifr.toFixed(2)),
                previous: Number((prev?.ltifr ?? 0).toFixed(2)),
              };
            })}
            xKey="label"
            height={260}
            series={[
              { key: 'current', label: 'Current period', color: CHART_COLORS.safety },
              { key: 'previous', label: 'Previous period', color: CHART_COLORS.slate },
            ]}
          />
        </CardContent>
      </Card>

      {/* Unit quick links */}
      <Card>
        <CardHeader>
          <CardTitle>Unit detail shortcuts</CardTitle>
          <p className="text-[11px] text-ink-500">Headcount, location and safety head for each unit</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {state.units.map((u) => {
            const m = unitMetrics.find((x) => x.unitId === u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => navigate(`/units/${u.id}`)}
                className="rounded-lg border border-ink-200 p-3 text-left transition-all hover:border-safety-300 hover:shadow-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-900">{u.code}</p>
                  {m ? (
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[9px] font-semibold',
                        m.status === 'Good'
                          ? 'bg-emerald-50 text-emerald-700'
                          : m.status === 'Critical'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700',
                      )}
                    >
                      {m.status}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-ink-500">{u.name}</p>
                <dl className="mt-2 space-y-0.5 text-[10px] text-ink-500">
                  <div className="flex justify-between">
                    <dt>Location</dt>
                    <dd className="font-medium text-ink-700">{u.location}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Headcount</dt>
                    <dd className="font-medium text-ink-700">{formatNumber(u.headcount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Safety head</dt>
                    <dd className="truncate font-medium text-ink-700">{u.safetyHeadName}</dd>
                  </div>
                </dl>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

export type { UnitMetrics };
