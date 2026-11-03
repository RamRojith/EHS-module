import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, PauseCircle, Pencil, Plus, ShieldX, Trash2, TriangleAlert } from 'lucide-react';

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
import { formatCompact, formatDate, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CapaStatus, CorrectiveAction, Priority } from '@/data/types';

const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];
const STATUSES: CapaStatus[] = ['Open', 'In Progress', 'Completed', 'Overdue'];
const SOURCES = ['Incident', 'Near Miss', 'Safety Observation', 'Inspection', 'Audit'] as const;
const DEMO_TODAY = '2026-09-29';

interface FormState {
  unitId: string;
  department: string;
  finding: string;
  source: CorrectiveAction['source'];
  sourceRef: string;
  raisedDate: string;
  dueDate: string;
  targetDate: string;
  responsiblePerson: string;
  responsibleId: string;
  priority: Priority;
  status: CapaStatus;
  rootCause: string;
  cost: number;
  notes: string;
}

export function Capa() {
  const { state, settings, filter, units, unitCode, createCapa, updateCapa, deleteCapa, pushNotification } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [tblFilters, setTblFilters] = React.useState<Record<string, string>>({});
  const [detail, setDetail] = React.useState<CorrectiveAction | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CorrectiveAction | null>(null);
  const [toDelete, setToDelete] = React.useState<CorrectiveAction | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const defaultUnit = filter.unitId !== 'ALL' ? filter.unitId : (user?.unitId ?? units[0]?.id ?? '');

  const emptyForm = (): FormState => ({
    unitId: defaultUnit,
    department: '',
    finding: '',
    source: 'Inspection',
    sourceRef: '',
    raisedDate: DEMO_TODAY,
    dueDate: DEMO_TODAY,
    targetDate: DEMO_TODAY,
    responsiblePerson: user?.name ?? '',
    responsibleId: user?.id ?? '',
    priority: 'Medium',
    status: 'Open',
    rootCause: '',
    cost: 0,
    notes: '',
  });

  const [form, setForm] = React.useState<FormState>(emptyForm);

  const rows = React.useMemo(
    () =>
      state.correctiveActions
        .filter((c) => filter.unitId === 'ALL' || c.unitId === filter.unitId)
        .filter((c) => filter.department === 'ALL' || c.department === filter.department)
        .filter((c) => c.raisedDate <= filter.range.to && c.dueDate >= filter.range.from)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [state.correctiveActions, filter.unitId, filter.department, filter.range.from, filter.range.to],
  );

  React.useEffect(() => {
    const openId = params.get('open');
    if (!openId) return;
    const row = state.correctiveActions.find((c) => c.id === openId);
    if (row) setDetail(row);
  }, [params, state.correctiveActions]);

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

  const openEdit = (row: CorrectiveAction) => {
    setEditing(row);
    setError(null);
    setForm({
      unitId: row.unitId,
      department: row.department,
      finding: row.finding,
      source: row.source,
      sourceRef: row.sourceRef,
      raisedDate: row.raisedDate,
      dueDate: row.dueDate,
      targetDate: row.targetDate,
      responsiblePerson: row.responsiblePerson,
      responsibleId: row.responsibleId,
      priority: row.priority,
      status: row.status,
      rootCause: row.rootCause,
      cost: row.cost,
      notes: row.notes,
    });
    setFormOpen(true);
  };

  const save = () => {
    if (!form.unitId || !form.department || !form.finding.trim() || !form.dueDate) {
      setError('Unit, department, finding and due date are required.');
      return;
    }
    if (editing) {
      updateCapa(editing.id, { ...form });
      toast({ tone: 'success', title: 'Action updated', description: editing.actionNo });
    } else {
      const created = createCapa({
        ...form,
        sourceRef: form.sourceRef,
        completedDate: null,
        verificationStatus: 'Pending Verification',
        effectiveness: null,
      });
      pushNotification({
        severity: form.priority === 'High' ? 'Critical' : 'Warning',
        title: `New corrective action · ${form.priority} priority`,
        message: `${form.finding.slice(0, 90)} — due ${formatDate(form.dueDate)}`,
        unitId: form.unitId,
        module: 'CAPA',
        link: `/capa?open=${created.id}`,
      });
      toast({ tone: 'success', title: 'Corrective action raised', description: created.actionNo });
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

  const patch = (p: Partial<CorrectiveAction>, message: string) => {
    if (!detail) return;
    updateCapa(detail.id, p);
    setDetail({ ...detail, ...p });
    toast({ tone: 'success', title: 'Action updated', description: detail.actionNo });
    if (p.status === 'Completed' || p.verificationStatus === 'Rejected') {
      pushNotification({
        severity: 'Information',
        title: `${detail.actionNo} · ${message}`,
        message: `${detail.finding.slice(0, 90)} (${detail.responsiblePerson})`,
        unitId: detail.unitId,
        module: 'CAPA',
        link: `/capa?open=${detail.id}`,
      });
    }
  };

  const overdue = rows.filter((c) => c.status === 'Overdue');
  const openCount = rows.filter((c) => c.status !== 'Completed').length;
  const completedRows = rows.filter((c) => c.status === 'Completed' && c.completedDate);
  const onTime = completedRows.filter((c) => c.completedDate! <= c.dueDate).length;
  const onTimePct = completedRows.length ? (onTime / completedRows.length) * 100 : 0;
  const exposure = rows.filter((c) => c.status !== 'Completed').reduce((a, c) => a + c.cost, 0);

  const byUnit = units
    .map((u) => ({
      label: u.code,
      open: rows.filter((c) => c.unitId === u.id && c.status === 'Open' || c.unitId === u.id && c.status === 'In Progress').length,
      overdue: rows.filter((c) => c.unitId === u.id && c.status === 'Overdue').length,
    }))
    .filter((r) => r.open + r.overdue > 0);

  const columns: Column<CorrectiveAction>[] = [
    {
      key: 'actionNo',
      header: 'Action',
      sortValue: (r) => r.actionNo,
      exportValue: (r) => r.actionNo,
      cell: (r) => <span className="font-medium text-ink-900">{r.actionNo}</span>,
    },
    {
      key: 'finding',
      header: 'Finding',
      className: 'max-w-[24rem]',
      sortValue: (r) => r.finding,
      exportValue: (r) => r.finding,
      cell: (r) => <span className="block truncate text-ink-600" title={r.finding}>{r.finding}</span>,
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
      key: 'source',
      header: 'Source',
      sortValue: (r) => r.source,
      exportValue: (r) => r.source,
      filterOptions: SOURCES.map((s) => ({ value: s, label: s })),
      hideBelow: 'lg',
      cell: (r) => <span className="whitespace-nowrap text-ink-600">{r.source}</span>,
    },
    {
      key: 'priority',
      header: 'Priority',
      sortValue: (r) => PRIORITIES.indexOf(r.priority),
      exportValue: (r) => r.priority,
      filterOptions: PRIORITIES.map((p) => ({ value: p, label: p })),
      cell: (r) => <StatusBadge value={r.priority} size="xs" />,
    },
    {
      key: 'responsiblePerson',
      header: 'Owner',
      sortValue: (r) => r.responsiblePerson,
      exportValue: (r) => r.responsiblePerson,
      hideBelow: 'lg',
      cell: (r) => <span className="truncate text-ink-600">{r.responsiblePerson}</span>,
    },
    {
      key: 'dueDate',
      header: 'Due',
      sortValue: (r) => r.dueDate,
      exportValue: (r) => r.dueDate,
      cell: (r) => (
        <span className={cn('tabular-nums whitespace-nowrap', r.status === 'Overdue' && 'font-semibold text-red-600')}>
          {formatDate(r.dueDate)}
        </span>
      ),
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
        title="Corrective & Preventive Actions"
        description="Every finding from incidents, near misses, observations, inspections and audits flows into a tracked action with an owner, due date and effectiveness check."
        breadcrumbs={[{ label: 'EHS', to: '/dashboard' }, { label: 'CAPA' }]}
        icon={<ClipboardCheck className="h-4 w-4" />}
        badges={<Badge tone={overdue.length ? 'danger' : 'success'} showDot>{overdue.length} overdue</Badge>}
        actions={
          <Button variant="accent" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Raise action
          </Button>
        }
        toolbar={<GlobalFilterBar />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Actions" value={rows.length} icon={ClipboardCheck} tone="navy" />
        <KpiCard label="Open" value={rows.filter((c) => c.status === 'Open').length} tone="blue" />
        <KpiCard label="In progress" value={rows.filter((c) => c.status === 'In Progress').length} tone="amber" icon={PauseCircle} />
        <KpiCard label="Overdue" value={overdue.length} tone={overdue.length ? 'red' : 'green'} icon={TriangleAlert} />
        <KpiCard
          label="On-time closure"
          value={formatPercent(onTimePct, 0)}
          tone={onTimePct >= settings.target.capaOnTimeClosure ? 'green' : 'amber'}
          target={{ label: `≥ ${settings.target.capaOnTimeClosure}%`, met: onTimePct >= settings.target.capaOnTimeClosure }}
        />
        <KpiCard label="Open exposure" value={formatCompact(exposure)} unit="₹" tone="slate" footer={`${openCount} still open`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="print-page xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Open actions by unit</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Overdue actions highlighted in red</p>
            </div>
          </CardHeader>
          <CardContent>
            <BarSeriesChart
              data={byUnit}
              xKey="label"
              stacked
              height={280}
              series={[
                { key: 'open', label: 'Open / in progress', color: CHART_COLORS.navy },
                { key: 'overdue', label: 'Overdue', color: CHART_COLORS.red },
              ]}
            />
          </CardContent>
        </Card>

        <Card className="print-page">
          <CardHeader>
            <div>
              <CardTitle>By priority</CardTitle>
              <p className="mt-0.5 text-xs text-ink-500">Where the backlog is concentrated</p>
            </div>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={PRIORITIES.map((p) => ({ name: p, value: rows.filter((c) => c.priority === p && c.status !== 'Completed').length })).filter((d) => d.value > 0)}
              colors={[CHART_COLORS.red, CHART_COLORS.amber, CHART_COLORS.slate]}
              centerValue={String(openCount)}
              centerLabel="open"
              height={280}
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
            searchPlaceholder="Search action, finding, owner…"
            filters={[
              { key: 'department', label: 'Department', options: Array.from(new Set(rows.map((r) => r.department))).sort().map((d) => ({ value: d, label: d })), allLabel: 'All departments' },
            ]}
            filterValues={tblFilters}
            onFilterChange={(k, v) => setTblFilters((s) => ({ ...s, [k]: v }))}
            exportName="capa-register"
            exportTitle="Corrective Action Register"
            pageSize={settings.rowsPerPage}
            emptyLabel="No corrective actions in this scope"
            footerSummary={`${formatNumber(exposure)} open exposure`}
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
                  <DialogTitle>{detail.actionNo}</DialogTitle>
                  <StatusBadge value={detail.priority} size="xs" />
                  <StatusBadge value={detail.status} size="xs" />
                  <StatusBadge value={detail.verificationStatus} size="xs" />
                </div>
                <DialogDescription>{detail.finding}</DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <DetailField label="Unit">{unitCode(detail.unitId)}</DetailField>
                  <DetailField label="Department">{detail.department}</DetailField>
                  <DetailField label="Source">{detail.source} · {detail.sourceRef || '—'}</DetailField>
                  <DetailField label="Raised">{formatDate(detail.raisedDate)}</DetailField>
                  <DetailField label="Due">{formatDate(detail.dueDate)}</DetailField>
                  <DetailField label="Target date">{formatDate(detail.targetDate)}</DetailField>
                  <DetailField label="Owner">{detail.responsiblePerson}</DetailField>
                  <DetailField label="Completed">{detail.completedDate ? formatDate(detail.completedDate) : '—'}</DetailField>
                  <DetailField label="Effectiveness"><StatusBadge value={detail.effectiveness ?? 'Not yet assessed'} size="xs" /></DetailField>
                  <DetailField label="Cost">₹{formatNumber(detail.cost)}</DetailField>
                </dl>

                <div className="rounded-lg border border-ink-200 p-3.5">
                  <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Root cause</p>
                  <p className="mt-1 text-sm text-ink-700">{detail.rootCause || 'Not recorded.'}</p>
                </div>
                {detail.notes ? (
                  <div className="rounded-lg border border-ink-200 p-3.5">
                    <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Notes</p>
                    <p className="mt-1 text-sm text-ink-700">{detail.notes}</p>
                  </div>
                ) : null}
              </DialogBody>
              <DialogFooter className="flex-wrap">
                <Button variant="ghost" onClick={closeDetail}>Close</Button>
                <Button variant="outline" onClick={() => { setToDelete(detail); closeDetail(); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
                <Button variant="outline" onClick={() => { openEdit(detail); closeDetail(); }}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                {detail.status === 'Open' ? (
                  <Button variant="secondary" onClick={() => patch({ status: 'In Progress' }, 'started')}>
                    <PauseCircle className="h-3.5 w-3.5" />
                    Start work
                  </Button>
                ) : null}
                {detail.status !== 'Completed' ? (
                  <Button variant="primary" onClick={() => patch({ status: 'Completed', completedDate: DEMO_TODAY, verificationStatus: 'Verified', effectiveness: 'Effective' }, 'completed and verified')}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark complete
                  </Button>
                ) : null}
                {detail.status === 'Completed' && detail.verificationStatus !== 'Rejected' ? (
                  <Button variant="danger" onClick={() => patch({ status: 'In Progress', completedDate: null, verificationStatus: 'Rejected', effectiveness: 'Not Effective' }, 'verification rejected')}>
                    <ShieldX className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Create / edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.actionNo}` : 'Raise a corrective action'}</DialogTitle>
            <DialogDescription>Link the action to its source record so the audit trail stays intact.</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="ca-unit">Unit *</Label>
              <Select id="ca-unit" value={form.unitId} onValueChange={(v) => setForm((f) => ({ ...f, unitId: v, department: '' }))} options={units.map((u) => ({ value: u.id, label: `${u.code} · ${u.shortName}` }))} />
            </Field>
            <Field>
              <Label htmlFor="ca-dept">Department *</Label>
              <Select id="ca-dept" value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: v }))} placeholder="Select department" options={deptOptions.map((d) => ({ value: d, label: d }))} />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="ca-finding">Finding / action required *</Label>
              <Textarea id="ca-finding" value={form.finding} placeholder="State the corrective action in measurable terms" onChange={(e) => setForm((f) => ({ ...f, finding: e.target.value }))} />
            </Field>
            <Field>
              <Label htmlFor="ca-source">Source</Label>
              <Select id="ca-source" value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v as CorrectiveAction['source'] }))} options={SOURCES.map((s) => ({ value: s, label: s }))} />
            </Field>
            <Field>
              <Label htmlFor="ca-ref">Source reference</Label>
              <Input id="ca-ref" value={form.sourceRef} placeholder="e.g. INS-0031" onChange={(e) => setForm((f) => ({ ...f, sourceRef: e.target.value }))} />
            </Field>
            <Field>
              <Label htmlFor="ca-raised">Raised on</Label>
              <Input id="ca-raised" type="date" value={form.raisedDate} max={DEMO_TODAY} onChange={(e) => setForm((f) => ({ ...f, raisedDate: e.target.value }))} />
            </Field>
            <Field>
              <Label htmlFor="ca-due">Due date *</Label>
              <Input id="ca-due" type="date" value={form.dueDate} min={DEMO_TODAY} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </Field>
            <Field>
              <Label htmlFor="ca-target">Target completion</Label>
              <Input id="ca-target" type="date" value={form.targetDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} />
            </Field>
            <Field>
              <Label htmlFor="ca-priority">Priority</Label>
              <Select id="ca-priority" value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as Priority }))} options={PRIORITIES.map((p) => ({ value: p, label: p }))} />
            </Field>
            <Field>
              <Label htmlFor="ca-owner">Responsible person</Label>
              <Input id="ca-owner" value={form.responsiblePerson} onChange={(e) => setForm((f) => ({ ...f, responsiblePerson: e.target.value, responsibleId: '' }))} />
            </Field>
            <Field>
              <Label htmlFor="ca-status">Status</Label>
              <Select id="ca-status" value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as CapaStatus }))} options={STATUSES.map((s) => ({ value: s, label: s }))} />
            </Field>
            <Field>
              <Label htmlFor="ca-cost">Estimated cost (₹)</Label>
              <Input id="ca-cost" type="number" min={0} value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: Number(e.target.value) }))} />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="ca-root">Root cause</Label>
              <Textarea id="ca-root" value={form.rootCause} onChange={(e) => setForm((f) => ({ ...f, rootCause: e.target.value }))} />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="ca-notes">Notes</Label>
              <Textarea id="ca-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </Field>
            {error ? <FieldError className="sm:col-span-2">{error}</FieldError> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save}>
              {editing ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {editing ? 'Save changes' : 'Raise action'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete corrective action?"
        description={`${toDelete?.actionNo ?? ''} will be permanently removed from the CAPA register.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          if (toDelete) {
            deleteCapa(toDelete.id);
            toast({ tone: 'error', title: 'Action deleted', description: toDelete.actionNo });
          }
          setToDelete(null);
        }}
      />
    </div>
  );
}

export default Capa;
