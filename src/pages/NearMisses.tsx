import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Pencil,
  Plus,
  Radar,
  Trash2,
  TriangleAlert,
} from 'lucide-react';

import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
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
  ConfirmDialog,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldError,
  Input,
  Label,
  Select,
  StatusBadge,
  Textarea,
  useToast,
} from '@/components/ui';
import { BarSeriesChart, DonutChart, TrendAreaChart } from '@/components/charts';
import { CHART_COLORS } from '@/lib/theme';
import { formatDate } from '@/lib/format';
import type { NearMiss, NearMissCategory, NearMissStatus, RiskLevel } from '@/data/types';

const CATEGORIES: NearMissCategory[] = [
  'Machine Safety',
  'Electrical',
  'Fire',
  'PPE',
  'Material Handling',
  'Working at Height',
  'Housekeeping',
  'Chemical',
  'Ergonomics',
];
const RISKS: RiskLevel[] = ['High', 'Medium', 'Low'];
const STATUSES: NearMissStatus[] = ['Open', 'Under Analysis', 'Action Taken', 'Closed'];

interface FormState {
  unitId: string;
  department: string;
  date: string;
  location: string;
  category: NearMissCategory;
  description: string;
  potentialConsequence: string;
  riskLevel: RiskLevel;
  reportedByName: string;
  reportedById: string;
  actionTaken: string;
  actionStatus: NearMissStatus;
  linkedIncidentId: string;
}

const DEMO_TODAY = '2026-09-29';

export function NearMisses() {
  const { state, settings, filter, units, corporate, createNearMiss, updateNearMiss, deleteNearMiss } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [tblFilters, setTblFilters] = React.useState<Record<string, string>>({});
  const [detail, setDetail] = React.useState<NearMiss | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<NearMiss | null>(null);
  const [toDelete, setToDelete] = React.useState<NearMiss | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const defaultUnit = filter.unitId !== 'ALL' ? filter.unitId : (user?.unitId ?? units[0]?.id ?? '');

  const emptyForm = (): FormState => ({
    unitId: defaultUnit,
    department: '',
    date: DEMO_TODAY,
    location: '',
    category: 'Machine Safety',
    description: '',
    potentialConsequence: '',
    riskLevel: 'Medium',
    reportedByName: user?.name ?? '',
    reportedById: user?.id ?? '',
    actionTaken: '',
    actionStatus: 'Open',
    linkedIncidentId: '',
  });

  const [form, setForm] = React.useState<FormState>(emptyForm);

  const rows = React.useMemo(
    () =>
      state.nearMisses
        .filter((n) => filter.unitId === 'ALL' || n.unitId === filter.unitId)
        .filter((n) => filter.department === 'ALL' || n.department === filter.department)
        .filter((n) => n.date >= filter.range.from && n.date <= filter.range.to)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.nearMisses, filter.unitId, filter.department, filter.range.from, filter.range.to],
  );

  React.useEffect(() => {
    const openId = params.get('open');
    if (!openId) return;
    const row = state.nearMisses.find((n) => n.id === openId);
    if (row) setDetail(row);
  }, [params, state.nearMisses]);

  const deptOptions = React.useMemo(
    () =>
      Array.from(
        new Set(state.employees.filter((e) => e.unitId === form.unitId).map((e) => e.department)),
      ).sort(),
    [state.employees, form.unitId],
  );

  const openCreate = () => {
    setEditing(null);
    setError(null);
    setForm({ ...emptyForm(), department: deptOptions[0] ?? '' });
    setFormOpen(true);
  };

  const openEdit = (row: NearMiss) => {
    setEditing(row);
    setError(null);
    setForm({
      unitId: row.unitId,
      department: row.department,
      date: row.date,
      location: row.location,
      category: row.category,
      description: row.description,
      potentialConsequence: row.potentialConsequence,
      riskLevel: row.riskLevel,
      reportedByName: row.reportedByName,
      reportedById: row.reportedById,
      actionTaken: row.actionTaken,
      actionStatus: row.actionStatus,
      linkedIncidentId: row.linkedIncidentId ?? '',
    });
    setFormOpen(true);
  };

  const save = () => {
    if (!form.unitId || !form.department || !form.location.trim() || !form.description.trim()) {
      setError('Unit, department, location and description are required.');
      return;
    }
    const payload = {
      ...form,
      linkedIncidentId: form.linkedIncidentId || null,
    };
    if (editing) {
      updateNearMiss(editing.id, payload);
      toast({ tone: 'success', title: 'Near miss updated', description: editing.nearMissNo });
      setDetail((d) => (d && d.id === editing.id ? { ...d, ...payload } : d));
    } else {
      const created = createNearMiss(payload);
      toast({ tone: 'success', title: 'Near miss reported', description: created.nearMissNo });
    }
    setFormOpen(false);
  };

  const closeDetail = () => {
    setDetail(null);
    if (params.get('open')) {
      const next = new URLSearchParams(params);
      next.delete('open');
      setParams(next, { replace: true });
    }
  };

  const highPotential = rows.filter((n) => n.riskLevel === 'High').length;
  const openRows = rows.filter((n) => n.actionStatus === 'Open' || n.actionStatus === 'Under Analysis').length;

  const columns: Column<NearMiss>[] = [
    {
      key: 'nearMissNo',
      header: 'Reference',
      sortValue: (r) => r.nearMissNo,
      exportValue: (r) => r.nearMissNo,
      cell: (r) => <span className="font-medium text-ink-900">{r.nearMissNo}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      sortValue: (r) => r.date,
      exportValue: (r) => r.date,
      cell: (r) => <span className="tabular-nums whitespace-nowrap text-ink-600">{formatDate(r.date)}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      sortValue: (r) => r.category,
      exportValue: (r) => r.category,
      filterOptions: CATEGORIES.map((c) => ({ value: c, label: c })),
      cell: (r) => <span className="whitespace-nowrap text-ink-700">{r.category}</span>,
    },
    {
      key: 'riskLevel',
      header: 'Risk',
      sortValue: (r) => RISKS.length - RISKS.indexOf(r.riskLevel),
      exportValue: (r) => r.riskLevel,
      filterOptions: RISKS.map((r2) => ({ value: r2, label: r2 })),
      cell: (r) => <StatusBadge value={r.riskLevel} size="xs" />,
    },
    {
      key: 'description',
      header: 'Description',
      className: 'max-w-[22rem]',
      sortValue: (r) => r.description,
      exportValue: (r) => r.description,
      cell: (r) => <span className="block truncate text-ink-600" title={r.description}>{r.description}</span>,
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
      key: 'actionStatus',
      header: 'Status',
      sortValue: (r) => r.actionStatus,
      exportValue: (r) => r.actionStatus,
      cell: (r) => <StatusBadge value={r.actionStatus} size="xs" />,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Near Miss Register"
        description="Capture close calls and hazardous observations before they become injuries. Every entry is risk-ranked and routed to a corrective action."
        breadcrumbs={[{ label: 'EHS', to: '/dashboard' }, { label: 'Near Misses' }]}
        icon={<Radar className="h-4 w-4" />}
        badges={<Badge tone={highPotential ? 'danger' : 'success'} showDot>{highPotential} high potential</Badge>}
        actions={
          <Button variant="accent" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Report near miss
          </Button>
        }
        toolbar={<GlobalFilterBar />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <KpiCard label="Near misses" value={rows.length} icon={Radar} tone="navy" />
        <KpiCard label="High potential" value={highPotential} tone={highPotential ? 'red' : 'green'} icon={TriangleAlert} />
        <KpiCard label="Open / analysing" value={openRows} tone={openRows ? 'amber' : 'green'} />
        <KpiCard label="Action taken" value={rows.filter((n) => n.actionStatus === 'Action Taken').length} tone="blue" />
        <KpiCard label="Closed" value={rows.filter((n) => n.actionStatus === 'Closed').length} tone="green" />
        <KpiCard
          label="Reporting rate"
          value={(rows.length / Math.max(1, corporate.employees) * 100).toFixed(1)}
          unit="per 100"
          tone="slate"
          target={{ label: `≥ ${settings.target.nearMissReportingPer100}`, met: (rows.length / Math.max(1, corporate.employees)) * 100 >= settings.target.nearMissReportingPer100 }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="print-page xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Near misses by category</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Where close calls are being observed</p>
            </div>
          </CardHeader>
          <CardContent>
            <BarSeriesChart
              data={CATEGORIES.map((c) => ({
                label: c,
                total: rows.filter((n) => n.category === c).length,
                high: rows.filter((n) => n.category === c && n.riskLevel === 'High').length,
              })).filter((r) => r.total > 0)}
              xKey="label"
              horizontal
              height={300}
              series={[
                { key: 'total', label: 'Total', color: CHART_COLORS.amber },
                { key: 'high', label: 'High risk', color: CHART_COLORS.red },
              ]}
            />
          </CardContent>
        </Card>

        <Card className="print-page">
          <CardHeader>
            <div>
              <CardTitle>Risk distribution</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Potential severity</p>
            </div>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={RISKS.map((r) => ({ name: r, value: rows.filter((n) => n.riskLevel === r).length })).filter((d) => d.value > 0)}
              colors={[CHART_COLORS.red, CHART_COLORS.amber, CHART_COLORS.green]}
              centerValue={String(rows.length)}
              centerLabel="near misses"
              height={280}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="print-page">
        <CardHeader>
          <div>
            <CardTitle>Reporting trend</CardTitle>
            <p className="mt-0.5 text-xs text-ink-500">Higher reporting volumes generally indicate a healthier safety culture</p>
          </div>
        </CardHeader>
        <CardContent>
          <TrendAreaChart
            stacked={false}
            height={240}
            data={(() => {
              const map = new Map<string, { label: string; reported: number; highRisk: number }>();
              rows.forEach((n) => {
                const key = n.date.slice(0, 7);
                const cur = map.get(key) ?? { label: new Date(`${key}-01`).toLocaleDateString('en-GB', { month: 'short' }), reported: 0, highRisk: 0 };
                cur.reported += 1;
                if (n.riskLevel === 'High') cur.highRisk += 1;
                map.set(key, cur);
              });
              return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
            })()}
            series={[
              { key: 'reported', label: 'Reported', color: CHART_COLORS.amber },
              { key: 'highRisk', label: 'High risk', color: CHART_COLORS.red },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <DataTable
            data={rows}
            columns={columns}
            rowKey={(r) => r.id}
            onRowClick={(r) => setDetail(r)}
            searchPlaceholder="Search reference, description, category…"
            filters={[
              { key: 'department', label: 'Department', options: Array.from(new Set(rows.map((r) => r.department))).sort().map((d) => ({ value: d, label: d })), allLabel: 'All departments' },
            ]}
            filterValues={tblFilters}
            onFilterChange={(k, v) => setTblFilters((s) => ({ ...s, [k]: v }))}
            exportName="near-miss-register"
            exportTitle="Near Miss Register"
            pageSize={settings.rowsPerPage}
            emptyLabel="No near misses in this scope"
          />
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && closeDetail()}>
        <DialogContent size="lg">
          {detail ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>{detail.nearMissNo}</DialogTitle>
                  <StatusBadge value={detail.riskLevel} size="xs" />
                  <StatusBadge value={detail.actionStatus} size="xs" />
                </div>
                <DialogDescription>{detail.description}</DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <DetailField label="Date">{formatDate(detail.date)}</DetailField>
                  <DetailField label="Category">{detail.category}</DetailField>
                  <DetailField label="Department">{detail.department}</DetailField>
                  <DetailField label="Location">{detail.location}</DetailField>
                  <DetailField label="Reported by">{detail.reportedByName}</DetailField>
                  <DetailField label="Linked incident">{detail.linkedIncidentId ?? '—'}</DetailField>
                </dl>
                <div className="rounded-lg border border-ink-200 p-3.5">
                  <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Potential consequence</p>
                  <p className="mt-1 text-sm text-ink-700">{detail.potentialConsequence}</p>
                </div>
                <div className="rounded-lg border border-ink-200 p-3.5">
                  <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Action taken</p>
                  <p className="mt-1 text-sm text-ink-700">{detail.actionTaken || 'No action recorded yet.'}</p>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDetail(null)}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setToDelete(detail);
                    closeDetail();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
                <Button variant="primary" onClick={() => { openEdit(detail); closeDetail(); }}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit record
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Create / edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.nearMissNo}` : 'Report a near miss'}</DialogTitle>
            <DialogDescription>
              Capture the close call while details are fresh. Fields marked with an asterisk are required.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="nm-unit">Unit *</Label>
              <Select
                id="nm-unit"
                value={form.unitId}
                onValueChange={(v) => setForm((f) => ({ ...f, unitId: v, department: '' }))}
                options={units.map((u) => ({ value: u.id, label: `${u.code} · ${u.shortName}` }))}
              />
            </Field>
            <Field>
              <Label htmlFor="nm-dept">Department *</Label>
              <Select
                id="nm-dept"
                value={form.department}
                onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}
                placeholder="Select department"
                options={deptOptions.map((d) => ({ value: d, label: d }))}
              />
            </Field>
            <Field>
              <Label htmlFor="nm-date">Date *</Label>
              <Input id="nm-date" type="date" value={form.date} max={DEMO_TODAY} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field>
              <Label htmlFor="nm-loc">Location *</Label>
              <Input id="nm-loc" value={form.location} placeholder="e.g. Ring frame section B" onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </Field>
            <Field>
              <Label htmlFor="nm-cat">Category</Label>
              <Select id="nm-cat" value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as NearMissCategory }))} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
            </Field>
            <Field>
              <Label htmlFor="nm-risk">Risk level</Label>
              <Select id="nm-risk" value={form.riskLevel} onValueChange={(v) => setForm((f) => ({ ...f, riskLevel: v as RiskLevel }))} options={RISKS.map((r) => ({ value: r, label: r }))} />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="nm-desc">Description *</Label>
              <Textarea id="nm-desc" value={form.description} placeholder="What happened, and how close was it to causing harm?" onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="nm-cons">Potential consequence</Label>
              <Textarea id="nm-cons" value={form.potentialConsequence} placeholder="Worst credible outcome if it had gone wrong" onChange={(e) => setForm((f) => ({ ...f, potentialConsequence: e.target.value }))} />
            </Field>
            <Field>
              <Label htmlFor="nm-reporter">Reported by</Label>
              <Input id="nm-reporter" value={form.reportedByName} onChange={(e) => setForm((f) => ({ ...f, reportedByName: e.target.value }))} />
            </Field>
            <Field>
              <Label htmlFor="nm-status">Action status</Label>
              <Select id="nm-status" value={form.actionStatus} onValueChange={(v) => setForm((f) => ({ ...f, actionStatus: v as NearMissStatus }))} options={STATUSES.map((s) => ({ value: s, label: s }))} />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="nm-action">Action taken</Label>
              <Textarea id="nm-action" value={form.actionTaken} placeholder="Interim controls, corrections or follow-up assigned" onChange={(e) => setForm((f) => ({ ...f, actionTaken: e.target.value }))} />
            </Field>
            {error ? <FieldError className="sm:col-span-2">{error}</FieldError> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              {editing ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {editing ? 'Save changes' : 'Report near miss'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete near-miss record?"
        description={`${toDelete?.nearMissNo ?? ''} will be permanently removed from the register. This cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          if (toDelete) {
            deleteNearMiss(toDelete.id);
            toast({ tone: 'error', title: 'Near miss deleted', description: toDelete.nearMissNo });
          }
          setToDelete(null);
        }}
      />
    </div>
  );
}
