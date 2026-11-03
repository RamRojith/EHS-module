import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, Pencil, Plus, ThumbsUp, Trash2, TriangleAlert } from 'lucide-react';

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
import { BarSeriesChart, DonutChart } from '@/components/charts';
import { CHART_COLORS } from '@/lib/theme';
import { formatDate } from '@/lib/format';
import type { NearMissCategory, ObservationStatus, ObservationType, RiskLevel, SafetyObservation } from '@/data/types';

const TYPES: ObservationType[] = ['Unsafe Act', 'Unsafe Condition', 'Positive Observation'];
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
const STATUSES: ObservationStatus[] = ['Open', 'In Progress', 'Closed'];
const DEMO_TODAY = '2026-09-29';

interface FormState {
  unitId: string;
  department: string;
  date: string;
  observerName: string;
  location: string;
  type: ObservationType;
  category: NearMissCategory;
  description: string;
  riskLevel: RiskLevel;
  status: ObservationStatus;
  correctiveActionId: string;
}

export function Observations() {
  const { state, settings, filter, units, createObservation, updateObservation, deleteObservation, pushNotification } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [tblFilters, setTblFilters] = React.useState<Record<string, string>>({});
  const [detail, setDetail] = React.useState<SafetyObservation | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SafetyObservation | null>(null);
  const [toDelete, setToDelete] = React.useState<SafetyObservation | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const defaultUnit = filter.unitId !== 'ALL' ? filter.unitId : (user?.unitId ?? units[0]?.id ?? '');

  const emptyForm = (): FormState => ({
    unitId: defaultUnit,
    department: '',
    date: DEMO_TODAY,
    observerName: user?.name ?? '',
    location: '',
    type: 'Unsafe Condition',
    category: 'Housekeeping',
    description: '',
    riskLevel: 'Low',
    status: 'Open',
    correctiveActionId: '',
  });

  const [form, setForm] = React.useState<FormState>(emptyForm);

  const rows = React.useMemo(
    () =>
      state.observations
        .filter((o) => filter.unitId === 'ALL' || o.unitId === filter.unitId)
        .filter((o) => filter.department === 'ALL' || o.department === filter.department)
        .filter((o) => o.date >= filter.range.from && o.date <= filter.range.to)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.observations, filter.unitId, filter.department, filter.range.from, filter.range.to],
  );

  React.useEffect(() => {
    const openId = params.get('open');
    if (!openId) return;
    const row = state.observations.find((o) => o.id === openId);
    if (row) setDetail(row);
  }, [params, state.observations]);

  const deptOptions = React.useMemo(
    () => Array.from(new Set(state.employees.filter((e) => e.unitId === form.unitId).map((e) => e.department))).sort(),
    [state.employees, form.unitId],
  );

  const openCreate = () => {
    setEditing(null);
    setError(null);
    setForm({ ...emptyForm(), department: deptOptions[0] ?? '' });
    setFormOpen(true);
  };

  const openEdit = (row: SafetyObservation) => {
    setEditing(row);
    setError(null);
    setForm({
      unitId: row.unitId,
      department: row.department,
      date: row.date,
      observerName: row.observerName,
      location: row.location,
      type: row.type,
      category: row.category,
      description: row.description,
      riskLevel: row.riskLevel,
      status: row.status,
      correctiveActionId: row.correctiveActionId ?? '',
    });
    setFormOpen(true);
  };

  const save = () => {
    if (!form.unitId || !form.department || !form.location.trim() || !form.description.trim()) {
      setError('Unit, department, location and description are required.');
      return;
    }
    const payload = { ...form, correctiveActionId: form.correctiveActionId || null, closedDate: form.status === 'Closed' ? DEMO_TODAY : null };
    if (editing) {
      updateObservation(editing.id, payload);
      toast({ tone: 'success', title: 'Observation updated', description: editing.observationNo });
    } else {
      const created = createObservation(payload);
      pushNotification({
        severity: form.type === 'Positive Observation' ? 'Information' : form.riskLevel === 'High' ? 'Critical' : 'Warning',
        title: `New safety observation · ${form.type}`,
        message: `${form.location} — ${form.description.slice(0, 90)}`,
        unitId: form.unitId,
        module: 'System',
        link: `/observations?open=${created.id}`,
      });
      toast({ tone: 'success', title: 'Observation recorded', description: created.observationNo });
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

  const unsafeActs = rows.filter((o) => o.type === 'Unsafe Act').length;
  const unsafeConditions = rows.filter((o) => o.type === 'Unsafe Condition').length;
  const positive = rows.filter((o) => o.type === 'Positive Observation').length;

  const columns: Column<SafetyObservation>[] = [
    {
      key: 'observationNo',
      header: 'Reference',
      sortValue: (r) => r.observationNo,
      exportValue: (r) => r.observationNo,
      cell: (r) => <span className="font-medium text-ink-900">{r.observationNo}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      sortValue: (r) => r.date,
      exportValue: (r) => r.date,
      cell: (r) => <span className="tabular-nums whitespace-nowrap text-ink-600">{formatDate(r.date)}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      sortValue: (r) => r.type,
      exportValue: (r) => r.type,
      filterOptions: TYPES.map((t) => ({ value: t, label: t })),
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink-700">
          {r.type === 'Positive Observation' ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : r.type === 'Unsafe Act' ? (
            <TriangleAlert className="h-3.5 w-3.5 text-amber-500" />
          ) : (
            <Eye className="h-3.5 w-3.5 text-blue-500" />
          )}
          {r.type}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortValue: (r) => r.category,
      exportValue: (r) => r.category,
      filterOptions: CATEGORIES.map((c) => ({ value: c, label: c })),
      hideBelow: 'md',
      cell: (r) => <span className="text-ink-600">{r.category}</span>,
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
      key: 'riskLevel',
      header: 'Risk',
      sortValue: (r) => RISKS.length - RISKS.indexOf(r.riskLevel),
      exportValue: (r) => r.riskLevel,
      filterOptions: RISKS.map((r2) => ({ value: r2, label: r2 })),
      hideBelow: 'lg',
      cell: (r) => <StatusBadge value={r.riskLevel} size="xs" />,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="xs" />,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Safety Observations"
        description="Behaviour-based and condition-based observations captured on the floor. Positive observations reinforce good practice."
        breadcrumbs={[{ label: 'EHS', to: '/dashboard' }, { label: 'Observations' }]}
        icon={<Eye className="h-4 w-4" />}
        badges={<Badge tone={positive ? 'success' : 'neutral'} showDot>{positive} positive</Badge>}
        actions={
          <Button variant="accent" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Log observation
          </Button>
        }
        toolbar={<GlobalFilterBar />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Observations" value={rows.length} icon={Eye} tone="navy" />
        <KpiCard label="Unsafe acts" value={unsafeActs} tone="amber" icon={TriangleAlert} />
        <KpiCard label="Unsafe conditions" value={unsafeConditions} tone="orange" />
        <KpiCard label="Positive" value={positive} tone="green" icon={ThumbsUp} />
        <KpiCard label="Open" value={rows.filter((o) => o.status !== 'Closed').length} tone={rows.some((o) => o.status !== 'Closed') ? 'blue' : 'green'} />
        <KpiCard label="Closed" value={rows.filter((o) => o.status === 'Closed').length} tone="green" icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="print-page">
          <CardHeader>
            <div>
              <CardTitle>Observation mix</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Act, condition and positive split</p>
            </div>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={TYPES.map((t) => ({ name: t, value: rows.filter((o) => o.type === t).length })).filter((d) => d.value > 0)}
              colors={[CHART_COLORS.amber, CHART_COLORS.blue, CHART_COLORS.green]}
              centerValue={String(rows.length)}
              centerLabel="observations"
              height={260}
            />
          </CardContent>
        </Card>

        <Card className="print-page xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Top categories</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Where observations concentrate</p>
            </div>
          </CardHeader>
          <CardContent>
            <BarSeriesChart
              data={CATEGORIES.map((c) => ({ label: c, total: rows.filter((o) => o.category === c).length })).filter((r) => r.total > 0).sort((a, b) => b.total - a.total)}
              xKey="label"
              horizontal
              height={260}
              series={[{ key: 'total', label: 'Observations', color: CHART_COLORS.blue }]}
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
            onRowClick={(r) => setDetail(r)}
            searchPlaceholder="Search reference, description, observer…"
            filters={[
              { key: 'department', label: 'Department', options: Array.from(new Set(rows.map((r) => r.department))).sort().map((d) => ({ value: d, label: d })), allLabel: 'All departments' },
            ]}
            filterValues={tblFilters}
            onFilterChange={(k, v) => setTblFilters((s) => ({ ...s, [k]: v }))}
            exportName="safety-observations"
            exportTitle="Safety Observations"
            pageSize={settings.rowsPerPage}
            emptyLabel="No observations in this scope"
          />
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && closeDetail()}>
        <DialogContent size="md">
          {detail ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>{detail.observationNo}</DialogTitle>
                  <StatusBadge value={detail.type} size="xs" />
                  <StatusBadge value={detail.status} size="xs" />
                </div>
                <DialogDescription>{detail.description}</DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <DetailField label="Date">{formatDate(detail.date)}</DetailField>
                  <DetailField label="Observer">{detail.observerName}</DetailField>
                  <DetailField label="Department">{detail.department}</DetailField>
                  <DetailField label="Location">{detail.location}</DetailField>
                  <DetailField label="Category">{detail.category}</DetailField>
                  <DetailField label="Risk"><StatusBadge value={detail.riskLevel} size="xs" /></DetailField>
                  <DetailField label="Closed on">{detail.closedDate ? formatDate(detail.closedDate) : '—'}</DetailField>
                  <DetailField label="Linked CAPA">{detail.correctiveActionId ?? '—'}</DetailField>
                </dl>
              </DialogBody>
              <DialogFooter>
                <Button variant="ghost" onClick={closeDetail}>
                  Close
                </Button>
                <Button variant="outline" onClick={() => { setToDelete(detail); closeDetail(); }}>
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.observationNo}` : 'Log a safety observation'}</DialogTitle>
            <DialogDescription>Record what was observed, the risk it carries and the follow-up assigned.</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="ob-unit">Unit *</Label>
              <Select id="ob-unit" value={form.unitId} onValueChange={(v) => setForm((f) => ({ ...f, unitId: v, department: '' }))} options={units.map((u) => ({ value: u.id, label: `${u.code} · ${u.shortName}` }))} />
            </Field>
            <Field>
              <Label htmlFor="ob-dept">Department *</Label>
              <Select id="ob-dept" value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: v }))} placeholder="Select department" options={deptOptions.map((d) => ({ value: d, label: d }))} />
            </Field>
            <Field>
              <Label htmlFor="ob-date">Date *</Label>
              <Input id="ob-date" type="date" value={form.date} max={DEMO_TODAY} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field>
              <Label htmlFor="ob-observer">Observer</Label>
              <Input id="ob-observer" value={form.observerName} onChange={(e) => setForm((f) => ({ ...f, observerName: e.target.value }))} />
            </Field>
            <Field>
              <Label htmlFor="ob-type">Observation type</Label>
              <Select id="ob-type" value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as ObservationType }))} options={TYPES.map((t) => ({ value: t, label: t }))} />
            </Field>
            <Field>
              <Label htmlFor="ob-cat">Category</Label>
              <Select id="ob-cat" value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as NearMissCategory }))} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
            </Field>
            <Field>
              <Label htmlFor="ob-loc">Location *</Label>
              <Input id="ob-loc" value={form.location} placeholder="e.g. Winding section" onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </Field>
            <Field>
              <Label htmlFor="ob-risk">Risk level</Label>
              <Select id="ob-risk" value={form.riskLevel} onValueChange={(v) => setForm((f) => ({ ...f, riskLevel: v as RiskLevel }))} options={RISKS.map((r) => ({ value: r, label: r }))} />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="ob-desc">Description *</Label>
              <Textarea id="ob-desc" value={form.description} placeholder="Describe the act, condition or positive behaviour observed" onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </Field>
            <Field>
              <Label htmlFor="ob-status">Status</Label>
              <Select id="ob-status" value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as ObservationStatus }))} options={STATUSES.map((s) => ({ value: s, label: s }))} />
            </Field>
            <Field>
              <Label htmlFor="ob-capa">Linked CAPA reference</Label>
              <Input id="ob-capa" value={form.correctiveActionId} placeholder="e.g. CAPA-0007" onChange={(e) => setForm((f) => ({ ...f, correctiveActionId: e.target.value }))} />
            </Field>
            {error ? <FieldError className="sm:col-span-2">{error}</FieldError> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              {editing ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {editing ? 'Save changes' : 'Record observation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete observation?"
        description={`${toDelete?.observationNo ?? ''} will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          if (toDelete) {
            deleteObservation(toDelete.id);
            toast({ tone: 'error', title: 'Observation deleted', description: toDelete.observationNo });
          }
          setToDelete(null);
        }}
      />
    </div>
  );
}

export default Observations;
