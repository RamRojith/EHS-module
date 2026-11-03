import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertOctagon,
  CheckCheck,
  ClipboardCheck,
  ClipboardList,
  ListChecks,
  PlayCircle,
  ShieldAlert,
  Star,
  XCircle,
} from 'lucide-react';

import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui';
import { PageHeader, DetailField } from '@/components/common/PageHeader';
import { GlobalFilterBar } from '@/components/common/GlobalFilterBar';
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
  Field,
  FieldError,
  FieldHint,
  Input,
  Label,
  Progress,
  Select,
  StatusBadge,
  Textarea,
} from '@/components/ui';
import { BarSeriesChart, ComboChart, DonutChart } from '@/components/charts';
import { DEMO_TODAY_ISO, inspectionSummary, monthlyTrend } from '@/data/analytics';
import { CHART_COLORS } from '@/lib/theme';
import { formatDate, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Result, SafetyInspection } from '@/data/types';

const RESULTS: Result[] = ['Pass', 'Conditional Pass', 'Fail'];

const CHECKLIST = [
  'Machine guards & interlocks intact',
  'Emergency stops accessible and tested',
  'Fire extinguishers unobstructed and in date',
  'Emergency exits and escape routes clear',
  'PPE availability and correct usage',
  'Housekeeping and aisle marking',
  'Chemical storage and labelling',
  'Electrical panel access and earthing',
];

export function Inspections() {
  const { state, settings, filter, unitCode, completeInspection } = useData();
  const { can } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [tblFilters, setTblFilters] = React.useState<Record<string, string>>({});
  const [detail, setDetail] = React.useState<SafetyInspection | null>(null);
  const [completing, setCompleting] = React.useState<SafetyInspection | null>(null);
  const [draft, setDraft] = React.useState({ score: '', result: 'Pass' as Result, findings: '' });
  const [error, setError] = React.useState('');

  const unitId = filter.unitId;
  const canEdit = can('edit');

  /* deep link ?open=<inspectionNo> */
  React.useEffect(() => {
    const open = params.get('open');
    if (!open) return;
    const match = state.inspections.find((i) => i.id === open || i.inspectionNo === open);
    if (match) setDetail(match);
    const next = new URLSearchParams(params);
    next.delete('open');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = React.useMemo(
    () =>
      state.inspections
        .filter((i) => unitId === 'ALL' || i.unitId === unitId)
        .filter((i) => filter.department === 'ALL' || i.department === filter.department)
        .sort((a, b) => (b.date ?? b.scheduledDate).localeCompare(a.date ?? a.scheduledDate)),
    [state.inspections, unitId, filter.department],
  );

  const summary = React.useMemo(() => inspectionSummary(state, filter.range, unitId), [state, filter.range, unitId]);
  const trend = React.useMemo(() => monthlyTrend(state, unitId), [state, unitId]);

  const unitScores = React.useMemo(
    () =>
      state.units
        .map((u) => {
          const list = state.inspections.filter((i) => i.unitId === u.id && i.score !== null);
          const score = list.length ? Math.round(list.reduce((a, i) => a + (i.score ?? 0), 0) / list.length) : 0;
          const findings = list.reduce((a, i) => a + i.criticalFindings + i.majorFindings, 0);
          return { unitCode: u.code, unitName: u.name, score, findings, count: list.length };
        })
        .filter((u) => u.count > 0)
        .sort((a, b) => b.score - a.score),
    [state.units, state.inspections],
  );

  const openComplete = (i: SafetyInspection) => {
    setCompleting(i);
    setDraft({ score: '', result: 'Pass', findings: i.findings });
    setError('');
  };

  const submitComplete = () => {
    if (!completing) return;
    const score = Number(draft.score);
    if (!draft.score.trim() || Number.isNaN(score) || score < 0 || score > completing.maxScore) {
      setError(`Enter a score between 0 and ${completing.maxScore}.`);
      return;
    }
    if (score < completing.maxScore * 0.4 && draft.result === 'Pass') {
      setError('A score this low cannot be recorded as a pass.');
      return;
    }
    completeInspection(completing.id, draft.result, score, draft.findings);
    toast({
      tone: 'success',
      title: `${completing.inspectionNo} closed as ${draft.result}`,
      description: `${unitCode(completing.unitId)} · ${completing.area} · ${score}/${completing.maxScore}`,
    });
    setCompleting(null);
    setDetail((d) => (d && d.id === completing.id ? { ...d, status: draft.result === 'Fail' ? 'Failed' : 'Completed', result: draft.result, score, findings: draft.findings, date: DEMO_TODAY_ISO } : d));
  };

  const columns: Column<SafetyInspection>[] = [
    {
      key: 'inspectionNo',
      header: 'Ref',
      sortValue: (i) => i.inspectionNo,
      exportValue: (i) => i.inspectionNo,
      cell: (i) => <span className="font-medium whitespace-nowrap text-ink-900">{i.inspectionNo}</span>,
    },
    {
      key: 'unit',
      header: 'Unit',
      sortValue: (i) => unitCode(i.unitId),
      exportValue: (i) => unitCode(i.unitId),
      cell: (i) => <span className="text-ink-700">{unitCode(i.unitId)}</span>,
    },
    {
      key: 'area',
      header: 'Area / Category',
      className: 'max-w-[18rem]',
      sortValue: (i) => i.area,
      exportValue: (i) => i.area,
      cell: (i) => (
        <div className="min-w-0">
          <p className="truncate text-ink-800">{i.area}</p>
          <p className="truncate text-[10px] text-ink-500">{i.category}</p>
        </div>
      ),
    },
    {
      key: 'scheduledDate',
      header: 'Date',
      sortValue: (i) => i.date ?? i.scheduledDate,
      exportValue: (i) => i.date ?? i.scheduledDate,
      cell: (i) => <span className="tabular-nums whitespace-nowrap text-ink-600">{formatDate(i.date ?? i.scheduledDate)}</span>,
    },
    {
      key: 'inspectorName',
      header: 'Inspector',
      sortValue: (i) => i.inspectorName,
      exportValue: (i) => i.inspectorName,
      hideBelow: 'lg',
      cell: (i) => <span className="text-ink-600">{i.inspectorName}</span>,
    },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      sortValue: (i) => i.score ?? -1,
      exportValue: (i) => (i.score === null ? '' : `${i.score}/${i.maxScore}`),
      cell: (i) =>
        i.score === null ? (
          <span className="text-ink-400">—</span>
        ) : (
          <span
            className={cn(
              'text-xs font-semibold tabular-nums',
              i.score / i.maxScore >= 0.9 ? 'text-emerald-700' : i.score / i.maxScore >= 0.75 ? 'text-amber-700' : 'text-red-700',
            )}
          >
            {i.score}/{i.maxScore}
          </span>
        ),
    },
    {
      key: 'findings',
      header: 'Findings',
      align: 'right',
      sortValue: (i) => i.criticalFindings + i.majorFindings + i.minorFindings,
      exportValue: (i) => `${i.criticalFindings} critical, ${i.majorFindings} major, ${i.minorFindings} minor`,
      hideBelow: 'md',
      cell: (i) => (
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          {i.criticalFindings > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-700">
              <AlertOctagon className="h-3 w-3" />
              {i.criticalFindings}
            </span>
          ) : null}
          {i.majorFindings > 0 ? <span className="text-[11px] font-medium text-amber-700 tabular-nums">{i.majorFindings}M</span> : null}
          {i.minorFindings > 0 ? <span className="text-[11px] text-ink-500 tabular-nums">{i.minorFindings}m</span> : null}
          {i.criticalFindings + i.majorFindings + i.minorFindings === 0 ? <span className="text-[11px] text-ink-400">Nil</span> : null}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (i) => i.status,
      exportValue: (i) => i.status,
      cell: (i) => <StatusBadge value={i.status} size="xs" />,
    },
  ];

  const selectedResult = completing
    ? draft.result === 'Fail' || Number(draft.score || 0) < completing.maxScore * 0.4
      ? 'Fail'
      : draft.result
    : 'Pass';

  return (
    <div className="space-y-4">
      <PageHeader
        title="Safety Inspections"
        description="Scheduled and completed inspections, scoring, findings severity and closure — filtered to the active scope."
        breadcrumbs={[{ label: 'EHS', to: '/dashboard' }, { label: 'Inspections' }]}
        icon={<ClipboardCheck className="h-4 w-4" />}
        badges={
          <Badge tone={summary.failed ? 'danger' : 'success'} showDot>
            {summary.failed ? `${summary.failed} failed` : 'No failures'}
          </Badge>
        }
        toolbar={<GlobalFilterBar />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Inspections" value={formatNumber(summary.scheduled)} icon={ClipboardList} tone="navy" footer="scheduled in scope" />
        <KpiCard label="Completed" value={formatNumber(summary.completed)} icon={CheckCheck} tone="green" />
        <KpiCard label="Pending" value={formatNumber(summary.pending)} icon={PlayCircle} tone="blue" />
        <KpiCard label="Failed" value={formatNumber(summary.failed)} tone={summary.failed ? 'red' : 'green'} icon={XCircle} />
        <KpiCard
          label="Average score"
          value={`${summary.avgScore}%`}
          icon={Star}
          tone={summary.avgScore >= 85 ? 'green' : summary.avgScore >= 75 ? 'amber' : 'red'}
        />
        <KpiCard label="Critical findings" value={formatNumber(summary.criticalFindings)} tone={summary.criticalFindings ? 'red' : 'green'} icon={ShieldAlert} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="print-page xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Average score by category</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Weakest categories first · bar length shows the count of inspections</p>
            </div>
          </CardHeader>
          <CardContent>
            <BarSeriesChart
              data={summary.byCategory.map((c) => ({ label: c.category, avgScore: c.avgScore, failed: c.failed }))}
              xKey="label"
              horizontal
              height={320}
              suffix="%"
              series={[{ key: 'avgScore', label: 'Avg score', color: CHART_COLORS.teal }]}
            />
            <p className="mt-2 text-[11px] text-ink-500">
              Corporate benchmark is 85%. Categories below the amber line-of-sight value need an action plan.
            </p>
          </CardContent>
        </Card>

        <Card className="print-page">
          <CardHeader>
            <div>
              <CardTitle>Status mix</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Completed, pending and failed</p>
            </div>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={[
                { name: 'Completed', value: summary.completed },
                { name: 'Pending', value: summary.pending },
                { name: 'Failed', value: summary.failed },
              ].filter((d) => d.value > 0)}
              colors={[CHART_COLORS.green, CHART_COLORS.blue, CHART_COLORS.red]}
              centerValue={String(summary.scheduled)}
              centerLabel="inspections"
              height={300}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="print-page">
          <CardHeader>
            <div>
              <CardTitle>Unit scorecard</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Average inspection score and open findings per unit</p>
            </div>
          </CardHeader>
          <CardContent>
            <ComboChart
              data={unitScores as unknown as Record<string, unknown>[]}
              bars={[{ key: 'score', label: 'Avg score', color: CHART_COLORS.teal }]}
              line={{ key: 'findings', label: 'Open findings', color: CHART_COLORS.red, axis: 'right' }}
              xKey="unitCode"
              height={280}
            />
          </CardContent>
        </Card>

        <Card className="print-page">
          <CardHeader>
            <div>
              <CardTitle>Monthly inspection activity</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Near-miss reporting and inspection completion side by side</p>
            </div>
          </CardHeader>
          <CardContent>
            <BarSeriesChart
              data={trend as unknown as Record<string, unknown>[]}
              xKey="label"
              height={280}
              series={[
                { key: 'inspections', label: 'Inspections', color: CHART_COLORS.teal },
                { key: 'incidents', label: 'Incidents', color: CHART_COLORS.red },
                { key: 'nearMisses', label: 'Near misses', color: CHART_COLORS.amber },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Inspection register</CardTitle>
            <p className="mt-0.5 text-xs text-ink-500">Select a row for the full checklist, findings and closure</p>
          </div>
          <CardAction>
            <span className="text-xs text-ink-500 tabular-nums">{rows.length} records</span>
          </CardAction>
        </CardHeader>
        <CardContent>
          <DataTable
            data={rows}
            columns={columns}
            rowKey={(i) => i.id}
            onRowClick={(i) => setDetail(i)}
            searchPlaceholder="Search reference, area, inspector…"
            pageSize={settings.rowsPerPage}
            exportName="inspection-register"
            exportTitle="Safety Inspection Register"
            filters={[
              {
                key: 'unit',
                label: 'Unit',
                allLabel: 'All units',
                options: state.units.map((u) => ({ value: u.code, label: `${u.code} · ${u.shortName}` })),
              },
              {
                key: 'category',
                label: 'Category',
                allLabel: 'All categories',
                options: summary.byCategory.map((c) => ({ value: c.category, label: c.category })),
              },
              {
                key: 'status',
                label: 'Status',
                allLabel: 'All statuses',
                options: [
                  { value: 'Completed', label: 'Completed' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Failed', label: 'Failed' },
                  { value: 'Scheduled', label: 'Scheduled' },
                ],
              },
            ]}
            filterValues={Object.fromEntries(Object.entries(tblFilters).map(([k, v]) => [k, v ?? 'ALL']))}
            onFilterChange={(key, value) => setTblFilters((f) => ({ ...f, [key]: value }))}
            emptyLabel="No inspections in this scope"
          />
        </CardContent>
      </Card>

      {/* ------------------------------ detail ------------------------------ */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent size="lg">
          {detail ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>
                    {detail.inspectionNo} · {detail.area}
                  </DialogTitle>
                  <StatusBadge value={detail.status} size="xs" />
                  {detail.result ? (
                    <Badge tone={detail.result === 'Pass' ? 'success' : detail.result === 'Fail' ? 'danger' : 'warning'} size="xs">
                      {detail.result}
                    </Badge>
                  ) : null}
                </div>
                <DialogDescription>
                  {unitCode(detail.unitId)} · {detail.department} · {detail.category} · inspector {detail.inspectorName}
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <DetailField label="Scheduled">{formatDate(detail.scheduledDate)}</DetailField>
                  <DetailField label="Conducted">{detail.date ? formatDate(detail.date) : 'Not yet'}</DetailField>
                  <DetailField label="Next due">{formatDate(detail.nextDueDate)}</DetailField>
                  <DetailField label="Score">{detail.score === null ? '—' : `${detail.score} / ${detail.maxScore}`}</DetailField>
                </div>

                {detail.score !== null ? (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-ink-700">Score achieved</span>
                      <span className="tabular-nums text-ink-500">{formatPercent((detail.score / detail.maxScore) * 100)}</span>
                    </div>
                    <Progress
                      value={detail.score}
                      max={detail.maxScore}
                      className="h-2"
                      tone={(detail.score / detail.maxScore) * 100 >= 85 ? 'green' : (detail.score / detail.maxScore) * 100 >= 70 ? 'amber' : 'red'}
                    />
                  </div>
                ) : null}

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Critical', value: detail.criticalFindings, tone: 'text-red-700' },
                    { label: 'Major', value: detail.majorFindings, tone: 'text-amber-700' },
                    { label: 'Minor', value: detail.minorFindings, tone: 'text-ink-700' },
                  ].map((f) => (
                    <div key={f.label} className="rounded-lg border border-ink-100 p-3 text-center">
                      <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">{f.label}</p>
                      <p className={cn('mt-0.5 text-xl font-semibold tabular-nums', f.value > 0 ? f.tone : 'text-ink-400')}>{f.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-ink-500 uppercase">
                    <ListChecks className="h-3.5 w-3.5" />
                    Checklist {detail.checklistCompleted}/{detail.checklistTotal}
                  </p>
                  <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {CHECKLIST.map((c, idx) => {
                      const done = idx < Math.round((detail.checklistCompleted / Math.max(1, detail.checklistTotal)) * CHECKLIST.length);
                      return (
                        <li key={c} className="flex items-start gap-2 text-xs">
                          {done ? (
                            <CheckCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          ) : (
                            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-300" />
                          )}
                          <span className={done ? 'text-ink-700' : 'text-ink-400'}>{c}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {detail.findings ? (
                  <div className="rounded-lg border border-ink-100 bg-surface-2 p-3">
                    <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Findings</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-700">{detail.findings}</p>
                  </div>
                ) : null}
              </DialogBody>
              <DialogFooter>
                {detail.status !== 'Completed' && detail.status !== 'Failed' && canEdit ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      openComplete(detail);
                      setDetail(null);
                    }}
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Record result
                  </Button>
                ) : null}
                <Button variant="outline" onClick={() => setDetail(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ---------------------------- complete ----------------------------- */}
      <Dialog open={!!completing} onOpenChange={(o) => !o && setCompleting(null)}>
        <DialogContent size="md">
          {completing ? (
            <>
              <DialogHeader>
                <DialogTitle>Record inspection result</DialogTitle>
                <DialogDescription>
                  {completing.inspectionNo} · {completing.area} · {unitCode(completing.unitId)}
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4">
                <Field>
                  <Label htmlFor="insp-score">
                    Score <span className="text-ink-400">(out of {completing.maxScore})</span>
                  </Label>
                  <Input
                    id="insp-score"
                    type="number"
                    min={0}
                    max={completing.maxScore}
                    value={draft.score}
                    onChange={(e) => setDraft((d) => ({ ...d, score: e.target.value }))}
                    placeholder="e.g. 42"
                  />
                </Field>
                <Field>
                  <Label htmlFor="insp-result">Result</Label>
                  <Select
                    id="insp-result"
                    value={selectedResult}
                    onValueChange={(v) => setDraft((d) => ({ ...d, result: v as Result }))}
                    options={RESULTS.map((r) => ({ value: r, label: r }))}
                  />
                  <FieldHint>
                    A score below 40% is automatically recorded as a failure and escalates the findings to CAPA.
                  </FieldHint>
                </Field>
                <Field>
                  <Label htmlFor="insp-findings">Findings summary</Label>
                  <Textarea
                    id="insp-findings"
                    rows={4}
                    value={draft.findings}
                    onChange={(e) => setDraft((d) => ({ ...d, findings: e.target.value }))}
                    placeholder="Describe the observations, immediate controls and follow-up owner…"
                  />
                </Field>
                {error ? <FieldError>{error}</FieldError> : null}
              </DialogBody>
              <DialogFooter>
                <Button variant="primary" onClick={submitComplete}>
                  Save result
                </Button>
                <Button variant="outline" onClick={() => setCompleting(null)}>
                  Cancel
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Inspections;
