import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  MapPin,
  ShieldAlert,
  Timer,
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
import { BarSeriesChart, DonutChart, TrendAreaChart } from '@/components/charts';
import { CHART_COLORS, TONE_STYLES } from '@/lib/theme';
import { formatDate, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Incident } from '@/data/types';

const INCIDENT_TYPES = [
  'First Aid',
  'Medical Treatment',
  'Lost Time Injury',
  'Near Miss',
  'Property Damage',
  'Fire Incident',
  'Unsafe Condition',
  'Unsafe Act',
] as const;

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

export function Incidents() {
  const { state, settings, filter, corporate, unitCode } = useData();
  const [params, setParams] = useSearchParams();
  const [tblFilters, setTblFilters] = React.useState<Record<string, string>>({});
  const [selected, setSelected] = React.useState<Incident | null>(null);

  const openId = params.get('open');

  const within = React.useCallback(
    (d: string) => d >= filter.range.from && d <= filter.range.to,
    [filter.range.from, filter.range.to],
  );

  const rows = React.useMemo(
    () =>
      state.incidents
        .filter((i) => filter.unitId === 'ALL' || i.unitId === filter.unitId)
        .filter((i) => filter.department === 'ALL' || i.department === filter.department)
        .filter((i) => filter.severity === 'ALL' || i.severity === filter.severity)
        .filter((i) => filter.incidentType === 'ALL' || i.incidentType === filter.incidentType)
        .filter((i) => within(i.date))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.incidents, filter.unitId, filter.department, filter.severity, filter.incidentType, within],
  );

  React.useEffect(() => {
    if (!openId) return;
    const row = state.incidents.find((i) => i.id === openId);
    if (row) setSelected(row);
  }, [openId, state.incidents]);

  const closeDetail = () => {
    setSelected(null);
    if (params.get('open')) {
      const next = new URLSearchParams(params);
      next.delete('open');
      setParams(next, { replace: true });
    }
  };

  const recordables = rows.filter((i) => i.incidentType === 'Lost Time Injury' || i.incidentType === 'Medical Treatment');
  const lostDays = rows.reduce((a, i) => a + i.lostDays, 0);
  const openInvestigations = rows.filter((i) => i.investigationStatus !== 'Closed').length;
  const highSeverity = rows.filter((i) => i.severity === 'Critical' || i.severity === 'High').length;

  const typeMix = INCIDENT_TYPES.map((t) => ({
    name: t,
    value: rows.filter((i) => i.incidentType === t).length,
  })).filter((d) => d.value > 0);

  const severityMix = SEVERITIES.map((s) => ({
    label: s,
    total: rows.filter((i) => i.severity === s).length,
  }));

  const trend = React.useMemo(() => {
    const map = new Map<string, { label: string; recordable: number; firstAid: number; lostDays: number }>();
    rows.forEach((i) => {
      const key = i.date.slice(0, 7);
      const cur = map.get(key) ?? { label: new Date(`${key}-01`).toLocaleDateString('en-GB', { month: 'short' }), recordable: 0, firstAid: 0, lostDays: 0 };
      if (i.incidentType === 'Lost Time Injury' || i.incidentType === 'Medical Treatment') cur.recordable += 1;
      if (i.incidentType === 'First Aid') cur.firstAid += 1;
      cur.lostDays += i.lostDays;
      map.set(key, cur);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [rows]);

  const columns: Column<Incident>[] = [
    {
      key: 'incidentNo',
      header: 'Incident',
      sortValue: (r) => r.incidentNo,
      exportValue: (r) => r.incidentNo,
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE_STYLES[r.severity === 'Critical' || r.severity === 'High' ? 'danger' : r.severity === 'Medium' ? 'warning' : 'neutral'].dot)} />
          <span className="font-medium text-ink-900">{r.incidentNo}</span>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortValue: (r) => r.date,
      exportValue: (r) => r.date,
      cell: (r) => <span className="whitespace-nowrap tabular-nums text-ink-600">{formatDate(r.date)}</span>,
    },
    {
      key: 'unit',
      header: 'Unit',
      sortValue: (r) => unitCode(r.unitId),
      exportValue: (r) => unitCode(r.unitId),
      hideBelow: 'md',
      cell: (r) => <span className="text-ink-600">{unitCode(r.unitId)}</span>,
    },
    {
      key: 'incidentType',
      header: 'Type',
      sortValue: (r) => r.incidentType,
      exportValue: (r) => r.incidentType,
      filterOptions: INCIDENT_TYPES.map((t) => ({ value: t, label: t })),
      cell: (r) => <span className="whitespace-nowrap text-ink-700">{r.incidentType}</span>,
    },
    {
      key: 'severity',
      header: 'Severity',
      sortValue: (r) => r.severity,
      exportValue: (r) => r.severity,
      filterOptions: SEVERITIES.map((s) => ({ value: s, label: s })),
      cell: (r) => <StatusBadge value={r.severity} size="xs" />,
    },
    {
      key: 'department',
      header: 'Department',
      sortValue: (r) => r.department,
      exportValue: (r) => r.department,
      hideBelow: 'lg',
      cell: (r) => <span className="text-ink-600">{r.department}</span>,
    },
    {
      key: 'lostDays',
      header: 'Lost days',
      align: 'right',
      sortValue: (r) => r.lostDays,
      exportValue: (r) => r.lostDays,
      hideBelow: 'sm',
      cell: (r) => <span className={cn('tabular-nums', r.lostDays > 0 && 'font-semibold text-red-600')}>{r.lostDays}</span>,
    },
    {
      key: 'investigationStatus',
      header: 'Investigation',
      sortValue: (r) => r.investigationStatus,
      exportValue: (r) => r.investigationStatus,
      cell: (r) => <StatusBadge value={r.investigationStatus} size="xs" />,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Incident Register"
        description="Every reported incident across the campus — injuries, property damage, fire and unsafe events — with investigation status and lost-time impact."
        breadcrumbs={[{ label: 'EHS', to: '/dashboard' }, { label: 'Incidents' }]}
        icon={<AlertTriangle className="h-4 w-4" />}
        badges={<Badge tone={recordables.length ? 'warning' : 'success'} showDot>{rows.length} in scope</Badge>}
        toolbar={<GlobalFilterBar />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Incidents" value={rows.length} icon={AlertTriangle} tone="navy" />
        <KpiCard label="Recordable cases" value={recordables.length} tone="orange" footer="MTI + LTI" />
        <KpiCard label="Lost days" value={formatNumber(lostDays)} tone={lostDays > 0 ? 'red' : 'green'} icon={Timer} />
        <KpiCard label="High / critical" value={highSeverity} tone={highSeverity > 0 ? 'red' : 'green'} icon={ShieldAlert} />
        <KpiCard label="Open investigations" value={openInvestigations} tone={openInvestigations > 0 ? 'amber' : 'green'} icon={ClipboardList} />
        <KpiCard
          label="LTIFR"
          value={corporate.ltifr.toFixed(2)}
          tone={corporate.ltifr <= settings.target.ltifr ? 'green' : 'red'}
          target={{ label: `≤ ${settings.target.ltifr}`, met: corporate.ltifr <= settings.target.ltifr }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="print-page">
          <CardHeader>
            <div>
              <CardTitle>Incident type mix</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Distribution across the selected scope</p>
            </div>
          </CardHeader>
          <CardContent>
            {typeMix.length ? (
              <DonutChart data={typeMix} centerValue={String(rows.length)} centerLabel="incidents" height={240} />
            ) : (
              <div className="flex h-60 items-center justify-center text-xs text-ink-400">No incidents in this selection</div>
            )}
          </CardContent>
        </Card>

        <Card className="print-page">
          <CardHeader>
            <div>
              <CardTitle>Severity profile</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Potential harm classification</p>
            </div>
          </CardHeader>
          <CardContent>
            <BarSeriesChart
              data={severityMix}
              xKey="label"
              height={240}
              series={[{ key: 'total', label: 'Incidents', color: CHART_COLORS.safety }]}
            />
          </CardContent>
        </Card>

        <Card className="print-page">
          <CardHeader>
            <div>
              <CardTitle>Monthly recordables</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Recordable cases and first-aid cases</p>
            </div>
          </CardHeader>
          <CardContent>
            <TrendAreaChart
              data={trend}
              height={240}
              series={[
                { key: 'recordable', label: 'Recordable', color: CHART_COLORS.navy },
                { key: 'firstAid', label: 'First aid', color: CHART_COLORS.violet },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <DataTable
            data={rows}
            columns={columns}
            rowKey={(r) => r.id}
            onRowClick={(r) => setSelected(r)}
            searchPlaceholder="Search incident no, description, area…"
            filters={[
              { key: 'department', label: 'Department', options: Array.from(new Set(rows.map((r) => r.department))).sort().map((d) => ({ value: d, label: d })), allLabel: 'All departments' },
            ]}
            filterValues={tblFilters}
            onFilterChange={(k, v) => setTblFilters((s) => ({ ...s, [k]: v }))}
            exportName="incident-register"
            exportTitle="Incident Register"
            pageSize={settings.rowsPerPage}
            emptyLabel="No incidents match the current scope"
            footerSummary={`${formatNumber(lostDays)} lost days in scope`}
          />
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && closeDetail()}>
        <DialogContent size="lg">
          {selected ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>{selected.incidentNo}</DialogTitle>
                  <StatusBadge value={selected.severity} size="xs" />
                  <StatusBadge value={selected.status} size="xs" />
                </div>
                <DialogDescription>{selected.description}</DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-5">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <DetailField label="Unit">{unitCode(selected.unitId)}</DetailField>
                  <DetailField label="Department">{selected.department}</DetailField>
                  <DetailField label="Incident type">{selected.incidentType}</DetailField>
                  <DetailField label="Date">{formatDate(selected.date)} · {selected.time}</DetailField>
                  <DetailField label="Reported">{formatDate(selected.reportedDate)}</DetailField>
                  <DetailField label="Shift">{selected.workShift}</DetailField>
                  <DetailField label="Location"><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-ink-400" />{selected.location}</span></DetailField>
                  <DetailField label="Area">{selected.area}</DetailField>
                  <DetailField label="Injury part">{selected.injuryPart ?? '—'}</DetailField>
                  <DetailField label="Lost days">{selected.lostDays}</DetailField>
                  <DetailField label="Reported by">{selected.reportedByName}</DetailField>
                  <DetailField label="Investigation"><StatusBadge value={selected.investigationStatus} size="xs" /></DetailField>
                </dl>

                <div className="space-y-3">
                  <div className="rounded-lg border border-ink-200 p-3.5">
                    <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Immediate action taken</p>
                    <p className="mt-1 text-sm text-ink-700">{selected.immediateAction}</p>
                  </div>
                  <div className="rounded-lg border border-ink-200 p-3.5">
                    <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Root cause</p>
                    <p className="mt-1 text-sm text-ink-700">{selected.rootCause}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Recorded in the EHS log on {formatDate(selected.reportedDate)}
                    {selected.correctiveActionId ? (
                      <span className="ml-auto flex items-center gap-1">
                        <ClipboardList className="h-3.5 w-3.5" />
                        Linked CAPA: <span className="font-medium text-navy-700">{selected.correctiveActionId}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={closeDetail}>
                  Close
                </Button>
                <Button variant="primary" onClick={closeDetail}>
                  <ClipboardList className="h-3.5 w-3.5" />
                  View in register
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Incidents;
