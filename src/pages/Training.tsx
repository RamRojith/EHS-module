import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileWarning,
  GraduationCap,
  Timer,
  UserRound,
  X,
} from 'lucide-react';

import { useData } from '@/context/DataContext';
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
  StatusBadge,
} from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarSeriesChart, DonutChart, HeatMatrix, TrendLineChart } from '@/components/charts';
import { trainingBreakdown, trainingStatusCounts, monthlyTrend } from '@/data/analytics';
import { CHART_COLORS } from '@/lib/theme';
import { MONTH_SHORT, formatDate, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { TrainingRecord, TrainingStatus } from '@/data/types';

const STATUS_ORDER: TrainingStatus[] = ['Completed', 'Pending', 'In Progress', 'Expired'];

export function Training() {
  const { state, settings, filter, unitCode } = useData();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = React.useState('compliance');
  const [detail, setDetail] = React.useState<TrainingRecord | null>(null);

  const unitId = filter.unitId;
  const inScope = React.useCallback(
    (r: TrainingRecord) => unitId === 'ALL' || r.unitId === unitId,
    [unitId],
  );

  const employeeDept = React.useCallback(
    (employeeId: string) => state.employees.find((e) => e.id === employeeId)?.department ?? '',
    [state.employees],
  );
  const employeeName = React.useCallback(
    (employeeId: string) => state.employees.find((e) => e.id === employeeId)?.name ?? 'Unknown',
    [state.employees],
  );
  const employeeUnit = React.useCallback(
    (employeeId: string) => state.employees.find((e) => e.id === employeeId)?.unitId ?? '',
    [state.employees],
  );

  const rows = React.useMemo(
    () =>
      state.trainingRecords
        .filter(inScope)
        .filter((r) => filter.department === 'ALL' || employeeDept(r.employeeId) === filter.department)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [state.trainingRecords, inScope, filter.department, employeeDept],
  );

  const trainingTitle = React.useCallback(
    (id: string) => state.trainings.find((t) => t.id === id)?.title ?? 'Unknown course',
    [state.trainings],
  );
  const trainingMeta = React.useCallback(
    (id: string) => state.trainings.find((t) => t.id === id),
    [state.trainings],
  );

  const counts = React.useMemo(() => trainingStatusCounts(rows), [rows]);
  const compliance = rows.length ? (counts.Completed / rows.length) * 100 : 0;
  const breakdown = React.useMemo(() => trainingBreakdown(state, filter.range, unitId), [state, filter.range, unitId]);
  const trend = React.useMemo(() => monthlyTrend(state, unitId), [state, unitId]);

  const focusEmployee = params.get('employee');
  const focus = focusEmployee ? state.employees.find((e) => e.id === focusEmployee) : null;
  const focusRecords = React.useMemo(
    () => (focusEmployee ? state.trainingRecords.filter((r) => r.employeeId === focusEmployee) : []),
    [state.trainingRecords, focusEmployee],
  );

  const clearFocus = () => {
    const next = new URLSearchParams(params);
    next.delete('employee');
    setParams(next, { replace: true });
  };

  /* unit x month compliance matrix */
  const months = React.useMemo(
    () => trend.map((t) => ({ key: t.month, label: MONTH_SHORT[Number(t.month.slice(5)) - 1] ?? t.month.slice(5) })),
    [trend],
  );
  const heatCells = React.useMemo(() => {
    const cells: Record<string, number> = {};
    state.units.forEach((u) => {
      months.forEach((m) => {
        const due = state.trainingRecords.filter(
          (r) => r.unitId === u.id && r.dueDate <= `${m.key}-31`,
        );
        const done = due.filter((r) => r.status === 'Completed' && (r.completedDate ?? '') <= `${m.key}-31`).length;
        cells[`${u.id}|${m.key}`] = due.length ? Math.round((done / due.length) * 100) : 0;
      });
    });
    return cells;
  }, [state.trainingRecords, state.units, months]);

  const expiring = React.useMemo(
    () => rows.filter((r) => r.status === 'Completed' && r.completedDate && r.completedDate >= '2026-07-01').slice(0, 400),
    [rows],
  );

  const recordColumns: Column<TrainingRecord>[] = [
    {
      key: 'employee',
      header: 'Employee',
      sortValue: (r) => employeeName(r.employeeId),
      exportValue: (r) => employeeName(r.employeeId),
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-900">{employeeName(r.employeeId)}</p>
          <p className="truncate text-[10px] text-ink-500">{employeeDept(r.employeeId)}</p>
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Unit',
      sortValue: (r) => unitCode(employeeUnit(r.employeeId)),
      exportValue: (r) => unitCode(employeeUnit(r.employeeId)),
      hideBelow: 'md',
      cell: (r) => <span className="text-ink-600">{unitCode(employeeUnit(r.employeeId))}</span>,
    },
    {
      key: 'title',
      header: 'Course',
      className: 'max-w-[20rem]',
      sortValue: (r) => trainingTitle(r.trainingId),
      exportValue: (r) => trainingTitle(r.trainingId),
      cell: (r) => <span className="block truncate text-ink-600" title={trainingTitle(r.trainingId)}>{trainingTitle(r.trainingId)}</span>,
    },
    {
      key: 'mode',
      header: 'Mode',
      sortValue: (r) => r.mode,
      exportValue: (r) => r.mode,
      hideBelow: 'lg',
      cell: (r) => <span className="whitespace-nowrap text-ink-600">{r.mode}</span>,
    },
    {
      key: 'dueDate',
      header: 'Due',
      sortValue: (r) => r.dueDate,
      exportValue: (r) => r.dueDate,
      cell: (r) => <span className="tabular-nums whitespace-nowrap text-ink-600">{formatDate(r.dueDate)}</span>,
    },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      sortValue: (r) => r.score ?? -1,
      exportValue: (r) => r.score ?? '',
      hideBelow: 'sm',
      cell: (r) => <span className="tabular-nums text-ink-600">{r.score ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => STATUS_ORDER.indexOf(r.status),
      exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="xs" />,
    },
  ];

  const catalogueColumns: Column<(typeof state.trainings)[number]>[] = [
    { key: 'code', header: 'Code', sortValue: (t) => t.code, exportValue: (t) => t.code, cell: (t) => <span className="font-medium text-ink-900">{t.code}</span> },
    {
      key: 'title',
      header: 'Title',
      className: 'max-w-[24rem]',
      sortValue: (t) => t.title,
      exportValue: (t) => t.title,
      cell: (t) => <span className="block truncate text-ink-600" title={t.title}>{t.title}</span>,
    },
    { key: 'category', header: 'Category', sortValue: (t) => t.category, exportValue: (t) => t.category, cell: (t) => <span className="whitespace-nowrap text-ink-600">{t.category}</span> },
    { key: 'mode', header: 'Mode', sortValue: (t) => t.mode, exportValue: (t) => t.mode, hideBelow: 'sm', cell: (t) => <span className="text-ink-600">{t.mode}</span> },
    { key: 'durationHours', header: 'Hours', align: 'right', sortValue: (t) => t.durationHours, exportValue: (t) => t.durationHours, cell: (t) => <span className="tabular-nums">{t.durationHours}</span> },
    { key: 'validityMonths', header: 'Validity (mo)', align: 'right', sortValue: (t) => t.validityMonths, exportValue: (t) => t.validityMonths, hideBelow: 'md', cell: (t) => <span className="tabular-nums">{t.validityMonths}</span> },
    { key: 'passMark', header: 'Pass mark', align: 'right', sortValue: (t) => t.passMark, exportValue: (t) => t.passMark, hideBelow: 'lg', cell: (t) => <span className="tabular-nums">{t.passMark}%</span> },
    {
      key: 'assignments',
      header: 'Assigned',
      align: 'right',
      sortValue: (t) => rows.filter((r) => r.trainingId === t.id).length,
      exportValue: (t) => rows.filter((r) => r.trainingId === t.id).length,
      cell: (t) => <span className="tabular-nums">{rows.filter((r) => r.trainingId === t.id).length}</span>,
    },
    {
      key: 'compliance',
      header: 'Compliance',
      sortValue: (t) => {
        const list = rows.filter((r) => r.trainingId === t.id);
        return list.length ? (list.filter((r) => r.status === 'Completed').length / list.length) * 100 : 0;
      },
      exportValue: (t) => {
        const list = rows.filter((r) => r.trainingId === t.id);
        return list.length ? `${(((list.filter((r) => r.status === 'Completed').length / list.length) * 100)).toFixed(1)}%` : 'n/a';
      },
      cell: (t) => {
        const list = rows.filter((r) => r.trainingId === t.id);
        const p = list.length ? (list.filter((r) => r.status === 'Completed').length / list.length) * 100 : 0;
        return (
          <span
            className={cn(
              'text-xs font-semibold tabular-nums',
              p >= settings.target.trainingCompliance ? 'text-emerald-700' : p >= settings.target.trainingCompliance - 5 ? 'text-amber-700' : 'text-red-700',
            )}
          >
            {list.length ? `${p.toFixed(0)}%` : '—'}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Training & Competency"
        description="Mandatory training assignments, validity tracking and completion evidence across every unit and department."
        breadcrumbs={[{ label: 'EHS', to: '/dashboard' }, { label: 'Training' }]}
        icon={<GraduationCap className="h-4 w-4" />}
        badges={
          <Badge tone={compliance >= settings.target.trainingCompliance ? 'success' : 'warning'} showDot>
            {formatPercent(compliance)} compliant
          </Badge>
        }
        toolbar={<GlobalFilterBar />}
      />

      {focus ? (
        <Card className="border-safety-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-800 text-sm font-semibold text-white">
                {focus.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <CardTitle>{focus.name}</CardTitle>
                <p className="mt-0.5 text-xs text-ink-500">
                  {focus.employeeCode} · {unitCode(focus.unitId)} · {focus.department} · {focus.designation}
                </p>
              </div>
            </div>
            <CardAction>
              <Button size="sm" variant="outline" onClick={clearFocus}>
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-ink-100 p-3">
              <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Assigned</p>
              <p className="mt-0.5 text-lg font-semibold text-ink-900 tabular-nums">{focusRecords.length}</p>
            </div>
            <div className="rounded-lg border border-ink-100 p-3">
              <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Completed</p>
              <p className="mt-0.5 text-lg font-semibold text-emerald-700 tabular-nums">
                {focusRecords.filter((r) => r.status === 'Completed').length}
              </p>
            </div>
            <div className="rounded-lg border border-ink-100 p-3">
              <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Pending</p>
              <p className="mt-0.5 text-lg font-semibold text-amber-700 tabular-nums">
                {focusRecords.filter((r) => r.status === 'Pending' || r.status === 'In Progress').length}
              </p>
            </div>
            <div className="rounded-lg border border-ink-100 p-3">
              <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Expired</p>
              <p className="mt-0.5 text-lg font-semibold text-red-700 tabular-nums">
                {focusRecords.filter((r) => r.status === 'Expired').length}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Assignments" value={rows.length} icon={GraduationCap} tone="navy" />
        <KpiCard
          label="Compliance"
          value={formatPercent(compliance)}
          tone={compliance >= settings.target.trainingCompliance ? 'green' : 'red'}
          target={{ label: `≥ ${settings.target.trainingCompliance}%`, met: compliance >= settings.target.trainingCompliance }}
        />
        <KpiCard label="Completed" value={counts.Completed} tone="green" icon={CheckCircle2} />
        <KpiCard label="Pending" value={counts.Pending} tone="blue" icon={Clock3} />
        <KpiCard label="In progress" value={counts['In Progress']} tone="amber" icon={Timer} />
        <KpiCard label="Expired" value={counts.Expired} tone={counts.Expired ? 'red' : 'green'} icon={FileWarning} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="compliance" count={breakdown.length}>
            <BookOpen className="h-3.5 w-3.5" />
            Category compliance
          </TabsTrigger>
          <TabsTrigger value="records" count={rows.length}>
            <UserRound className="h-3.5 w-3.5" />
            Employee records
          </TabsTrigger>
          <TabsTrigger value="catalogue" count={state.trainings.length}>
            <Award className="h-3.5 w-3.5" />
            Course catalogue
          </TabsTrigger>
          <TabsTrigger value="expiring" count={expiring.length}>
            <CalendarClock className="h-3.5 w-3.5" />
            Recently completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compliance">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card className="print-page">
                <CardHeader>
                  <div>
                    <CardTitle>Compliance by category</CardTitle>
                    <p className="mt-0.5 text-xs text-ink-500">Lowest compliance first</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <BarSeriesChart
                    data={breakdown.map((b) => ({ label: b.category, completed: b.completed, total: b.total }))}
                    xKey="label"
                    horizontal
                    height={320}
                    series={[{ key: 'completed', label: 'Completed', color: CHART_COLORS.green }]}
                    reference={{ value: settings.target.trainingCompliance, label: `Target ${settings.target.trainingCompliance}%` }}
                  />
                </CardContent>
              </Card>

              <Card className="print-page">
                <CardHeader>
                  <div>
                    <CardTitle>Status mix & trend</CardTitle>
                    <p className="mt-0.5 text-xs text-ink-500">Assignment status and month-on-month compliance</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DonutChart
                    data={STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => ({ name: s, value: counts[s] }))}
                    colors={[CHART_COLORS.green, CHART_COLORS.blue, CHART_COLORS.amber, CHART_COLORS.red]}
                    centerValue={String(rows.length)}
                    centerLabel="assignments"
                    height={200}
                  />
                  <TrendLineChart
                    data={trend as unknown as Record<string, unknown>[]}
                    xKey="label"
                    height={180}
                    tooltipFormat="percent"
                    suffix="%"
                    yDomain={[0, 100]}
                    series={[{ key: 'trainingCompliance', label: 'Compliance', color: CHART_COLORS.green }]}
                  />
                </CardContent>
              </Card>
            </div>

            <Card className="print-page">
              <CardHeader>
                <div>
                  <CardTitle>Compliance heat map</CardTitle>
                  <p className="mt-0.5 text-xs text-ink-500">Percentage of due training completed on time, by unit and month</p>
                </div>
              </CardHeader>
              <CardContent>
                <HeatMatrix
                  rows={state.units.map((u) => ({ key: u.id, label: u.code }))}
                  columns={months}
                  cells={heatCells}
                  format={(v) => (v === 0 ? '–' : `${v}%`)}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="records">
          <Card>
            <CardContent className="pt-4">
              <DataTable
                data={rows}
                columns={recordColumns}
                rowKey={(r) => r.id}
                onRowClick={(r) => setDetail(r)}
                searchPlaceholder="Search employee or course…"
                pageSize={settings.rowsPerPage}
                exportName="training-records"
                exportTitle="Training Records"
                emptyLabel="No training assignments in this scope"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalogue">
          <Card>
            <CardContent className="pt-4">
              <DataTable
                data={state.trainings}
                columns={catalogueColumns}
                rowKey={(t) => t.id}
                onRowClick={(t) => setDetail(state.trainingRecords.find((r) => r.trainingId === t.id) ?? null)}
                searchPlaceholder="Search course code or title…"
                exportName="training-catalogue"
                exportTitle="Training Catalogue"
                pageSize={settings.rowsPerPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring">
          <Card>
            <CardContent className="pt-4">
              <DataTable
                data={expiring}
                columns={recordColumns}
                rowKey={(r) => r.id}
                onRowClick={(r) => setDetail(r)}
                searchPlaceholder="Search employee or course…"
                pageSize={settings.rowsPerPage}
                exportName="training-recent-completions"
                exportTitle="Recently Completed Training"
                emptyLabel="No completions in the last quarter"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent size="md">
          {detail ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>{trainingTitle(detail.trainingId)}</DialogTitle>
                  <StatusBadge value={detail.status} size="xs" />
                </div>
                <DialogDescription>
                  {employeeName(detail.employeeId)} · {employeeDept(detail.employeeId)} · {unitCode(employeeUnit(detail.employeeId))}
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <DetailField label="Course code">{trainingMeta(detail.trainingId)?.code ?? '—'}</DetailField>
                  <DetailField label="Category">{trainingMeta(detail.trainingId)?.category ?? '—'}</DetailField>
                  <DetailField label="Mode">{detail.mode}</DetailField>
                  <DetailField label="Trainer">{detail.trainer}</DetailField>
                  <DetailField label="Assigned">{formatDate(detail.assignedDate)}</DetailField>
                  <DetailField label="Due">{formatDate(detail.dueDate)}</DetailField>
                  <DetailField label="Completed">{detail.completedDate ? formatDate(detail.completedDate) : '—'}</DetailField>
                  <DetailField label="Score">{detail.score ?? '—'}</DetailField>
                  <DetailField label="Pass mark">{trainingMeta(detail.trainingId)?.passMark ?? '—'}</DetailField>
                  <DetailField label="Validity">{trainingMeta(detail.trainingId)?.validityMonths ?? '—'} months</DetailField>
                  <DetailField label="Certificate" mono>{detail.certificateNo ?? '—'}</DetailField>
                </dl>
              </DialogBody>
              <DialogFooter>
                <Button variant="primary" onClick={() => setDetail(null)}>
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

export default Training;
