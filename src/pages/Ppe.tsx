import * as React from 'react';
import { Award, HardHat, ShieldCheck, TrendingDown, TrendingUp, TriangleAlert, Users } from 'lucide-react';

import { useData } from '@/context/DataContext';
import { PageHeader, DetailField } from '@/components/common/PageHeader';
import { GlobalFilterBar } from '@/components/common/GlobalFilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { KpiCard } from '@/components/ui/kpi-card';
import {
  Badge,
  Card,
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
  Button,
} from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarSeriesChart, DonutChart } from '@/components/charts';
import { ppeByDepartment, ppeItemBreakdown } from '@/data/analytics';
import { CHART_COLORS } from '@/lib/theme';
import { formatDate, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PpeCompliance } from '@/data/types';

export function Ppe() {
  const { state, settings, filter, unitCode } = useData();
  const [tab, setTab] = React.useState('items');
  const [detail, setDetail] = React.useState<PpeCompliance | null>(null);

  const unitId = filter.unitId;

  const rows = React.useMemo(
    () =>
      state.ppeCompliance
        .filter((p) => unitId === 'ALL' || p.unitId === unitId)
        .filter((p) => filter.department === 'ALL' || p.department === filter.department)
        .sort((a, b) => a.compliant / Math.max(1, a.assessed) - b.compliant / Math.max(1, b.assessed)),
    [state.ppeCompliance, unitId, filter.department],
  );

  const byItem = React.useMemo(() => ppeItemBreakdown(state, unitId), [state, unitId]);
  const byDepartment = React.useMemo(() => ppeByDepartment(state, unitId), [state, unitId]);

  const assessed = rows.reduce((a, r) => a + r.assessed, 0);
  const compliant = rows.reduce((a, r) => a + r.compliant, 0);
  const nonCompliant = rows.reduce((a, r) => a + r.nonCompliant, 0);
  const penalties = rows.reduce((a, r) => a + r.penaltyPoints, 0);
  const compliance = assessed ? (compliant / assessed) * 100 : 0;
  const worstItem = byItem.slice().sort((a, b) => a.compliance - b.compliance)[0];
  const belowTarget = byDepartment.filter((d) => d.compliance < settings.target.ppeCompliance).length;

  const columns: Column<PpeCompliance>[] = [
    {
      key: 'unit',
      header: 'Unit',
      sortValue: (r) => unitCode(r.unitId),
      exportValue: (r) => unitCode(r.unitId),
      cell: (r) => <span className="font-medium text-ink-900">{unitCode(r.unitId)}</span>,
    },
    {
      key: 'department',
      header: 'Department',
      sortValue: (r) => r.department,
      exportValue: (r) => r.department,
      cell: (r) => <span className="text-ink-700">{r.department}</span>,
    },
    {
      key: 'item',
      header: 'Item',
      sortValue: (r) => r.item,
      exportValue: (r) => r.item,
      filterOptions: byItem.map((i) => ({ value: i.item, label: i.item })),
      cell: (r) => <span className="whitespace-nowrap text-ink-700">{r.item}</span>,
    },
    {
      key: 'assessed',
      header: 'Assessed',
      align: 'right',
      sortValue: (r) => r.assessed,
      exportValue: (r) => r.assessed,
      cell: (r) => <span className="tabular-nums text-ink-600">{formatNumber(r.assessed)}</span>,
    },
    {
      key: 'nonCompliant',
      header: 'Non-compliant',
      align: 'right',
      sortValue: (r) => r.nonCompliant,
      exportValue: (r) => r.nonCompliant,
      cell: (r) => <span className={cn('tabular-nums', r.nonCompliant > 0 && 'font-semibold text-red-600')}>{r.nonCompliant}</span>,
    },
    {
      key: 'compliance',
      header: 'Compliance',
      align: 'right',
      sortValue: (r) => (r.assessed ? (r.compliant / r.assessed) * 100 : 0),
      exportValue: (r) => (r.assessed ? `${((r.compliant / r.assessed) * 100).toFixed(1)}%` : 'n/a'),
      cell: (r) => {
        const p = r.assessed ? (r.compliant / r.assessed) * 100 : 0;
        return (
          <span
            className={cn(
              'text-xs font-semibold tabular-nums',
              p >= settings.target.ppeCompliance ? 'text-emerald-700' : p >= settings.target.ppeCompliance - 5 ? 'text-amber-700' : 'text-red-700',
            )}
          >
            {p.toFixed(1)}%
          </span>
        );
      },
    },
    {
      key: 'trend',
      header: 'MoM',
      align: 'right',
      sortValue: (r) => r.trend,
      exportValue: (r) => r.trend,
      hideBelow: 'lg',
      cell: (r) => (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
            r.trend > 0 ? 'text-emerald-700' : r.trend < 0 ? 'text-red-700' : 'text-ink-500',
          )}
        >
          {r.trend > 0 ? <TrendingUp className="h-3 w-3" /> : r.trend < 0 ? <TrendingDown className="h-3 w-3" /> : null}
          {r.trend > 0 ? '+' : ''}
          {r.trend}pp
        </span>
      ),
    },
    {
      key: 'penaltyPoints',
      header: 'Penalty pts',
      align: 'right',
      sortValue: (r) => r.penaltyPoints,
      exportValue: (r) => r.penaltyPoints,
      hideBelow: 'md',
      cell: (r) => <span className="tabular-nums text-ink-600">{r.penaltyPoints}</span>,
    },
    {
      key: 'lastAuditDate',
      header: 'Last audit',
      sortValue: (r) => r.lastAuditDate,
      exportValue: (r) => r.lastAuditDate,
      cell: (r) => <span className="tabular-nums whitespace-nowrap text-ink-600">{formatDate(r.lastAuditDate)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="PPE Compliance"
        description="Monthly PPE audits by unit, department and item — with non-compliance counts, penalty points and month-on-month movement."
        breadcrumbs={[{ label: 'EHS', to: '/dashboard' }, { label: 'PPE' }]}
        icon={<HardHat className="h-4 w-4" />}
        badges={
          <Badge tone={compliance >= settings.target.ppeCompliance ? 'success' : 'warning'} showDot>
            {formatPercent(compliance)} compliant
          </Badge>
        }
        toolbar={<GlobalFilterBar />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Compliance" value={formatPercent(compliance)} icon={ShieldCheck} tone={compliance >= settings.target.ppeCompliance ? 'green' : 'red'} target={{ label: `≥ ${settings.target.ppeCompliance}%`, met: compliance >= settings.target.ppeCompliance }} />
        <KpiCard label="Assessments" value={formatNumber(assessed)} icon={Users} tone="navy" />
        <KpiCard label="Non-compliant" value={formatNumber(nonCompliant)} tone={nonCompliant ? 'red' : 'green'} icon={TriangleAlert} />
        <KpiCard label="Penalty points" value={formatNumber(penalties)} tone={penalties ? 'amber' : 'green'} />
        <KpiCard label="Departments below target" value={belowTarget} tone={belowTarget ? 'red' : 'green'} />
        <KpiCard
          label="Weakest item"
          value={worstItem ? worstItem.item.replace('Safety ', '') : '—'}
          footer={worstItem ? `${worstItem.compliance.toFixed(1)}% compliance` : undefined}
          tone="orange"
          icon={Award}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="items" count={byItem.length}>
            <HardHat className="h-3.5 w-3.5" />
            By item
          </TabsTrigger>
          <TabsTrigger value="departments" count={byDepartment.length}>
            <Users className="h-3.5 w-3.5" />
            By department
          </TabsTrigger>
          <TabsTrigger value="audits" count={rows.length}>
            <ShieldCheck className="h-3.5 w-3.5" />
            Audit records
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="print-page xl:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>Compliance by PPE item</CardTitle>
                  <p className="mt-0.5 text-xs text-ink-500">Assessed population versus compliant population</p>
                </div>
              </CardHeader>
              <CardContent>
                <BarSeriesChart
                  data={byItem.map((i) => ({ label: i.item, compliant: i.compliant, nonCompliant: i.nonCompliant }))}
                  xKey="label"
                  horizontal
                  stacked
                  height={320}
                  series={[
                    { key: 'compliant', label: 'Compliant', color: CHART_COLORS.green },
                    { key: 'nonCompliant', label: 'Non-compliant', color: CHART_COLORS.red },
                  ]}
                />
              </CardContent>
            </Card>

            <Card className="print-page">
              <CardHeader>
                <div>
                  <CardTitle>Non-compliance share</CardTitle>
                  <p className="mt-0.5 text-xs text-ink-500">Where the failures sit</p>
                </div>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={byItem
                    .filter((i) => i.nonCompliant > 0)
                    .sort((a, b) => b.nonCompliant - a.nonCompliant)
                    .map((i) => ({ name: i.item, value: i.nonCompliant }))}
                  centerValue={formatNumber(nonCompliant)}
                  centerLabel="failures"
                  height={300}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="departments">
          <Card className="print-page">
            <CardHeader>
              <div>
                <CardTitle>Department compliance ranking</CardTitle>
                <p className="mt-0.5 text-xs text-ink-500">Lowest compliance first</p>
              </div>
            </CardHeader>
            <CardContent>
              <BarSeriesChart
                data={byDepartment.slice(0, 14).map((d) => ({ label: `${d.unitCode} · ${d.department}`, compliant: d.assessed - d.nonCompliant, nonCompliant: d.nonCompliant }))}
                xKey="label"
                horizontal
                stacked
                height={360}
                series={[
                  { key: 'compliant', label: 'Compliant', color: CHART_COLORS.green },
                  { key: 'nonCompliant', label: 'Non-compliant', color: CHART_COLORS.red },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits">
          <Card>
            <CardContent className="pt-4">
              <DataTable
                data={rows}
                columns={columns}
                rowKey={(r) => r.id}
                onRowClick={(r) => setDetail(r)}
                searchPlaceholder="Search unit, department, item…"
                pageSize={settings.rowsPerPage}
                exportName="ppe-audit-records"
                exportTitle="PPE Audit Records"
                emptyLabel="No PPE audit records in this scope"
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
                  <DialogTitle>
                    {unitCode(detail.unitId)} · {detail.item}
                  </DialogTitle>
                  <StatusBadge
                    value={detail.assessed && detail.compliant / detail.assessed >= settings.target.ppeCompliance ? 'Compliant' : 'Non-Compliant'}
                    size="xs"
                  />
                </div>
                <DialogDescription>
                  {detail.department} · audited by {detail.auditor} on {formatDate(detail.lastAuditDate)}
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <DetailField label="Assessed">{formatNumber(detail.assessed)}</DetailField>
                  <DetailField label="Compliant">{formatNumber(detail.compliant)}</DetailField>
                  <DetailField label="Non-compliant">{formatNumber(detail.nonCompliant)}</DetailField>
                  <DetailField label="Penalty points">{formatNumber(detail.penaltyPoints)}</DetailField>
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

export default Ppe;
