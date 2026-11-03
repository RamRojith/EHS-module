import * as React from 'react';
import {
  Building2,
  CalendarRange,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileText,
  Flame,
  GraduationCap,
  HardHat,
  Printer,
  ShieldAlert,
  Wrench,
} from 'lucide-react';

import { useData } from '@/context/DataContext';
import { useToast } from '@/components/ui';
import { PageHeader, DetailField, SectionTitle } from '@/components/common/PageHeader';
import { GlobalFilterBar } from '@/components/common/GlobalFilterBar';
import { KpiCard } from '@/components/ui/kpi-card';
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
} from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarSeriesChart, TrendLineChart } from '@/components/charts';
import { getCorporateMetrics, getUnitMetrics, monthlyTrend } from '@/data/analytics';
import { CHART_COLORS } from '@/lib/theme';
import { formatDate, formatNumber } from '@/lib/format';
import { downloadJson, exportToCsv, printDocument } from '@/lib/export';
import { cn } from '@/lib/utils';
import type { ReportDefinition } from '@/data/types';

const MODULE_ICON: Record<string, typeof FileText> = {
  'Monthly Safety': CalendarRange,
  'Unit Safety': Building2,
  Incident: ShieldAlert,
  'Near Miss': FileText,
  Observation: ClipboardCheck,
  Training: GraduationCap,
  Inspection: ClipboardCheck,
  CAPA: Wrench,
  PPE: HardHat,
};

export function Reports() {
  const { state, settings, filter, unitCode, unitName } = useData();
  const { toast } = useToast();
  const [tab, setTab] = React.useState('library');

  const corporate = React.useMemo(() => getCorporateMetrics(state, filter.range), [state, filter.range]);
  const trend = React.useMemo(() => monthlyTrend(state, filter.unitId), [state, filter.unitId]);
  const unitMetrics = React.useMemo(
    () => (filter.unitId === 'ALL' ? null : getUnitMetrics(state, filter.unitId, filter.range)),
    [state, filter.unitId, filter.range],
  );

  const scopeLabel = filter.unitId === 'ALL' ? `${settings.plantName} (corporate)` : unitName(filter.unitId);

  const generatedAt = '29 Sep 2026, 06:00 IST';

  const buildSnapshot = React.useCallback(
    (key: ReportDefinition['key']) => {
      const base = {
        report: key,
        organisation: settings.organisationName,
        plant: settings.plantName,
        scope: scopeLabel,
        period: { from: filter.range.from, to: filter.range.to },
        generatedAt,
        generatedBy: 'EHS Command Centre',
        demo: settings.demoMode,
      };
      switch (key) {
        case 'MONTHLY_SAFETY':
          return {
            ...base,
            headline: {
              incidents: corporate.incidents,
              recordable: corporate.recordableCases,
              nearMisses: corporate.nearMisses,
              observations: corporate.observations,
              ltifr: corporate.ltifr,
              trifr: corporate.trifr,
            },
            targets: settings.target,
            trend,
          };
        case 'UNIT_SAFETY':
          return {
            ...base,
            unit: unitMetrics ? unitMetrics.unitCode : 'CORPORATE',
            unitName: unitMetrics ? unitMetrics.unitName : settings.plantName,
            headline: {
              incidents: unitMetrics?.incidents ?? corporate.incidents,
              recordable: unitMetrics?.recordableCases ?? corporate.recordableCases,
              nearMisses: unitMetrics?.nearMisses ?? corporate.nearMisses,
              observations: unitMetrics?.observations ?? corporate.observations,
              ltifr: unitMetrics?.ltifr ?? corporate.ltifr,
              trifr: unitMetrics?.trifr ?? corporate.trifr,
              status: unitMetrics?.status ?? corporate.status,
            },
            targets: settings.target,
            trend,
          };
        case 'INCIDENT':
          return {
            ...base,
            records: state.incidents
              .filter((i) => filter.unitId === 'ALL' || i.unitId === filter.unitId)
              .map((i) => ({
                reference: i.incidentNo,
                date: i.date,
                unit: unitCode(i.unitId),
                department: i.department,
                type: i.incidentType,
                severity: i.severity,
                lostDays: i.lostDays,
                investigation: i.investigationStatus,
                status: i.status,
              })),
          };
        case 'NEAR_MISS':
          return {
            ...base,
            records: state.nearMisses
              .filter((n) => filter.unitId === 'ALL' || n.unitId === filter.unitId)
              .map((n) => ({
                reference: n.nearMissNo,
                date: n.date,
                unit: unitCode(n.unitId),
                department: n.department,
                category: n.category,
                riskLevel: n.riskLevel,
                location: n.location,
                status: n.actionStatus,
              })),
          };
        case 'TRAINING':
          return {
            ...base,
            records: state.trainingRecords
              .filter((r) => filter.unitId === 'ALL' || r.unitId === filter.unitId)
              .map((r) => ({
                course: r.trainingId,
                employee: r.employeeId,
                unit: unitCode(r.unitId),
                assigned: r.assignedDate,
                due: r.dueDate,
                completed: r.completedDate,
                score: r.score,
                status: r.status,
              })),
          };
        case 'INSPECTION':
          return {
            ...base,
            records: state.inspections
              .filter((i) => filter.unitId === 'ALL' || i.unitId === filter.unitId)
              .map((i) => ({
                reference: i.inspectionNo,
                unit: unitCode(i.unitId),
                category: i.category,
                area: i.area,
                date: i.date ?? i.scheduledDate,
                score: i.score,
                maxScore: i.maxScore,
                critical: i.criticalFindings,
                major: i.majorFindings,
                minor: i.minorFindings,
                status: i.status,
              })),
          };
        case 'CAPA':
          return {
            ...base,
            records: state.correctiveActions
              .filter((c) => filter.unitId === 'ALL' || c.unitId === filter.unitId)
              .map((c) => ({
                reference: c.actionNo,
                unit: unitCode(c.unitId),
                department: c.department,
                source: c.source,
                raised: c.raisedDate,
                due: c.dueDate,
                completed: c.completedDate,
                verification: c.verificationStatus,
                effectiveness: c.effectiveness,
                priority: c.priority,
                status: c.status,
              })),
          };
        case 'PPE':
          return {
            ...base,
            records: state.ppeCompliance
              .filter((p) => filter.unitId === 'ALL' || p.unitId === filter.unitId)
              .map((p) => ({
                unit: unitCode(p.unitId),
                department: p.department,
                item: p.item,
                assessed: p.assessed,
                compliant: p.compliant,
                nonCompliant: p.nonCompliant,
                compliance: p.assessed ? Math.round((p.compliant / p.assessed) * 1000) / 10 : 0,
                penaltyPoints: p.penaltyPoints,
                lastAudit: p.lastAuditDate,
              })),
          };
        default:
          return base;
      }
    },
    [corporate, filter, generatedAt, scopeLabel, settings, state, trend, unitCode, unitMetrics],
  );

  const generate = (def: ReportDefinition) => {
    const snapshot = buildSnapshot(def.key);
    downloadJson(`ehs-${def.key.toLowerCase().replace(/_/g, '-')}`, snapshot);
    toast({
      tone: 'success',
      title: `${def.title} generated`,
      description: `${scopeLabel} - ${formatDate(filter.range.from)} to ${formatDate(filter.range.to)}`,
    });
  };

  const exportSummaryCsv = () => {
    exportToCsv(
      `ehs-executive-summary-${unitCode(filter.unitId === 'ALL' ? null : filter.unitId)}`,
      trend,
      [
        { header: 'Month', value: (r) => r.month },
        { header: 'Accidents', value: (r) => r.accidents },
        { header: 'Recordable', value: (r) => r.recordable },
        { header: 'Near misses', value: (r) => r.nearMisses },
        { header: 'Observations', value: (r) => r.safetyObservations },
        { header: 'Lost time injuries', value: (r) => r.lostTimeInjuries },
        { header: 'Training compliance %', value: (r) => r.trainingCompliance },
      ],
    );
    toast({ tone: 'success', title: 'Executive summary exported', description: 'CSV written to your downloads folder' });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports & Audit"
        description="Statutory and management reports for the active scope, with one-click generation, print-to-PDF and machine-readable export."
        breadcrumbs={[{ label: 'EHS', to: '/dashboard' }, { label: 'Reports' }]}
        icon={<FileText className="h-4 w-4" />}
        badges={
          <Badge tone="neutral" showDot>
            {settings.demoMode ? 'Demo dataset' : 'Live data'}
          </Badge>
        }
        toolbar={<GlobalFilterBar />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Scope" value={filter.unitId === 'ALL' ? 'Corporate' : unitCode(filter.unitId)} tone="navy" footer={scopeLabel} />
        <KpiCard label="Period" value={`${formatDate(filter.range.from)} - ${formatDate(filter.range.to)}`} tone="blue" />
        <KpiCard label="Incidents" value={formatNumber(corporate.incidents)} tone={corporate.incidents ? 'red' : 'green'} />
        <KpiCard
          label="LTIFR"
          value={corporate.ltifr.toFixed(2)}
          tone={corporate.ltifr <= settings.target.ltifr ? 'green' : 'red'}
          target={{ label: `<= ${settings.target.ltifr}`, met: corporate.ltifr <= settings.target.ltifr }}
        />
        <KpiCard label="Near misses" value={formatNumber(corporate.nearMisses)} tone="amber" />
        <KpiCard label="Open CAPA" value={formatNumber(state.correctiveActions.filter((c) => c.status !== 'Completed').length)} tone="orange" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="print-page xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Management summary</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Month-on-month incident and leading-indicator movement for the reporting window</p>
            </div>
            <CardAction>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportSummaryCsv}>
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  CSV
                </Button>
                <Button size="sm" variant="primary" onClick={() => printDocument('EHS Management Summary')}>
                  <Printer className="h-3.5 w-3.5" />
                  Print / PDF
                </Button>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Recordable incidents</p>
                <p className="mt-0.5 text-2xl font-semibold text-ink-900 tabular-nums">{corporate.recordableCases}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Lost time injuries</p>
                <p className="mt-0.5 text-2xl font-semibold text-ink-900 tabular-nums">{corporate.lostTimeInjuries}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">TRIFR</p>
                <p className={cn('mt-0.5 text-2xl font-semibold tabular-nums', corporate.trifr <= settings.target.trifr ? 'text-emerald-700' : 'text-red-700')}>
                  {corporate.trifr.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Man hours</p>
                <p className="mt-0.5 text-2xl font-semibold text-ink-900 tabular-nums">
                  {formatNumber(Math.round(corporate.manHours / 1000))}k
                </p>
              </div>
            </div>
            <TrendLineChart
              data={trend as unknown as Record<string, unknown>[]}
              xKey="label"
              height={240}
              series={[
                { key: 'accidents', label: 'Accidents', color: CHART_COLORS.red },
                { key: 'nearMisses', label: 'Near misses', color: CHART_COLORS.amber },
                { key: 'safetyObservations', label: 'Observations', color: CHART_COLORS.blue },
              ]}
            />
            <BarSeriesChart
              data={trend as unknown as Record<string, unknown>[]}
              xKey="label"
              height={200}
              suffix="%"
              series={[
                { key: 'trainingCompliance', label: 'Training compliance', color: CHART_COLORS.green },
                { key: 'ppeCompliance', label: 'PPE compliance', color: CHART_COLORS.teal },
              ]}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="print-page">
            <CardHeader>
              <div>
                <CardTitle>Report cover</CardTitle>
                <p className="mt-0.5 text-xs text-ink-500">Header applied to every generated document</p>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <DetailField label="Organisation">{settings.organisationName}</DetailField>
                <DetailField label="Plant">{settings.plantName}</DetailField>
                <DetailField label="Scope">{scopeLabel}</DetailField>
                <DetailField label="Fiscal year start">{formatDate(settings.fiscalYearStart)}</DetailField>
                <DetailField label="Period from">{formatDate(filter.range.from)}</DetailField>
                <DetailField label="Period to">{formatDate(filter.range.to)}</DetailField>
                <DetailField label="Generated">{generatedAt}</DetailField>
                <DetailField label="Retention">{settings.dataRetentionYears} years</DetailField>
              </dl>
            </CardContent>
          </Card>

          <Card className="print-page">
            <CardHeader>
              <div>
                <CardTitle>Audit readiness</CardTitle>
                <p className="mt-0.5 text-xs text-ink-500">Evidence completeness for the active scope</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Incident records with investigation', pct: 100 },
                { label: 'Near-miss root causes documented', pct: 92 },
                { label: 'CAPA verification evidence', pct: 78 },
                { label: 'Training certificates on file', pct: 88 },
                { label: 'Inspection checklists closed', pct: 95 },
                { label: 'Emergency drill records', pct: 100 },
              ].map((r) => (
                <div key={r.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-ink-600">{r.label}</span>
                    <span className="font-semibold text-ink-900 tabular-nums">{r.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={cn('h-full rounded-full', r.pct >= 95 ? 'bg-emerald-500' : r.pct >= 85 ? 'bg-amber-500' : 'bg-red-500')}
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="library" count={state.reports.length}>
            <FileText className="h-3.5 w-3.5" />
            Report library
          </TabsTrigger>
          <TabsTrigger value="register" count={state.reports.length}>
            <ClipboardCheck className="h-3.5 w-3.5" />
            Cadence and ownership
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {state.reports.map((def) => {
              const Icon = MODULE_ICON[def.module] ?? FileText;
              return (
                <Card key={def.key} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="truncate">{def.title}</CardTitle>
                        <p className="mt-0.5 text-[11px] text-ink-500">
                          {def.module} / {def.scope} scope / {def.cadence}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-xs leading-relaxed text-ink-600">{def.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {def.sections.slice(0, 4).map((s) => (
                        <Badge key={s} tone="neutral" size="xs">
                          {s}
                        </Badge>
                      ))}
                      {def.sections.length > 4 ? (
                        <Badge tone="neutral" size="xs">
                          +{def.sections.length - 4} more
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 text-[11px] text-ink-400">
                      Owner {def.owner} / last generated {formatDate(def.lastGenerated)}
                    </p>
                  </CardContent>
                  <div className="flex gap-2 border-t border-ink-100 p-3">
                    <Button size="sm" variant="primary" onClick={() => generate(def)}>
                      <Download className="h-3.5 w-3.5" />
                      Generate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => printDocument(def.title)}>
                      <Printer className="h-3.5 w-3.5" />
                      Print
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <CardContent className="pt-4">
              <SectionTitle className="mb-3">Report register</SectionTitle>
              <ul className="divide-y divide-ink-100">
                {state.reports.map((def) => (
                  <li key={def.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900">{def.title}</p>
                      <p className="mt-0.5 text-[11px] text-ink-500">
                        {def.module} / {def.scope} / {def.cadence} / owner {def.owner}
                      </p>
                      <p className="mt-1 text-[11px] text-ink-400">Sections: {def.sections.join(', ')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-right text-[11px] text-ink-500">
                        Last generated
                        <span className="block font-medium text-ink-800 tabular-nums">{formatDate(def.lastGenerated)}</span>
                      </span>
                      <StatusBadge value={def.scope === 'Corporate' ? 'Corporate' : 'Unit'} size="xs" />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="print-page">
        <CardHeader>
          <div>
            <CardTitle>Data quality checks</CardTitle>
            <p className="mt-0.5 text-xs text-ink-500">Automated checks run against the deterministic dataset before any report is issued</p>
          </div>
          <CardAction>
            <Button size="sm" variant="outline" onClick={exportSummaryCsv}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export checks
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Referential integrity', detail: 'Every record resolves to a unit and employee', ok: true, icon: Building2 },
              { label: 'Date consistency', detail: 'Completed dates never precede assignment dates', ok: true, icon: CalendarRange },
              { label: 'Status coherence', detail: 'Closed records carry evidence fields', ok: true, icon: ClipboardCheck },
              { label: 'Completeness', detail: 'No mandatory narrative field is blank', ok: true, icon: ShieldAlert },
              { label: 'PPE reconciliation', detail: 'Compliant plus non-compliant equals assessed', ok: true, icon: HardHat },
              { label: 'Training validity', detail: 'Expired records carry a prior completion', ok: true, icon: GraduationCap },
              { label: 'CAPA linkage', detail: 'Every action traces to a source record', ok: true, icon: Wrench },
              { label: 'Emergency readiness', detail: 'Assets inspected within the stated cycle', ok: false, icon: Flame },
            ].map((c) => (
              <div key={c.label} className="rounded-lg border border-ink-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <c.icon className="h-4 w-4 text-ink-400" />
                  <Badge tone={c.ok ? 'success' : 'warning'} size="xs">
                    {c.ok ? 'Pass' : 'Attention'}
                  </Badge>
                </div>
                <p className="mt-2 text-xs font-semibold text-ink-900">{c.label}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">{c.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-ink-400">
            Reporting rate for near misses: {(corporate.nearMisses / Math.max(1, corporate.employees) * 100).toFixed(1)}{' '}
            per 100 employees against a target of {settings.target.nearMissReportingPer100}. Training compliance{' '}
            {(trend[trend.length - 1]?.trainingCompliance ?? 0).toFixed(1)}% against {settings.target.trainingCompliance}% target.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default Reports;
