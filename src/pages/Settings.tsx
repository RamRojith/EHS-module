import * as React from 'react';
import {
  BellRing,
  Building2,
  Database,
  Gauge,
  LayoutGrid,
  RotateCcw,
  Save,
  ShieldCheck,
  Timer,
  TriangleAlert,
} from 'lucide-react';

import { useData } from '@/context/DataContext';
import { useToast } from '@/components/ui';
import { PageHeader, SectionTitle } from '@/components/common/PageHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldHint,
  Input,
  Select,
  Switch,
} from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEFAULT_SETTINGS } from '@/data/settings';
import { RANGE_PRESETS } from '@/data/analytics';
import { formatDate } from '@/lib/format';

const TARGET_HELP: Record<string, string> = {
  ltifr: 'Lost time injury frequency rate per million man hours. Lower is better.',
  trifr: 'Total recordable injury frequency rate per million man hours. Lower is better.',
  trainingCompliance: 'Share of due training assignments completed on time.',
  ppeCompliance: 'Share of assessed PPE observations that are compliant.',
  capaOnTimeClosure: 'Share of corrective actions closed on or before the due date.',
  nearMissReportingPer100: 'Near misses reported per 100 employees. Higher is better.',
  daysSinceLastDrill: 'Maximum permitted days since the last completed drill.',
};

export function Settings() {
  const { state, settings, updateSettings, resetFilter, recordCount } = useData();
  const { toast } = useToast();
  const [tab, setTab] = React.useState('organisation');
  const [draft, setDraft] = React.useState(settings);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    if (!dirty) setDraft(settings);
  }, [settings, dirty]);

  const patch = (next: Partial<typeof draft>) => {
    setDraft((d) => ({ ...d, ...next }));
    setDirty(true);
  };

  const patchTarget = (key: keyof typeof settings.target, value: number) => {
    setDraft((d) => ({ ...d, target: { ...d.target, [key]: value } }));
    setDirty(true);
  };

  const patchNotification = (key: keyof typeof settings.notifications, value: boolean | string) => {
    setDraft((d) => ({ ...d, notifications: { ...d.notifications, [key]: value } }));
    setDirty(true);
  };

  const patchEscalation = (key: keyof typeof settings.escalation, value: number | string) => {
    setDraft((d) => ({ ...d, escalation: { ...d.escalation, [key]: value } }));
    setDirty(true);
  };

  const save = () => {
    updateSettings({
      organisationName: draft.organisationName.trim() || DEFAULT_SETTINGS.organisationName,
      plantName: draft.plantName.trim() || DEFAULT_SETTINGS.plantName,
      fiscalYearStart: draft.fiscalYearStart,
      dataRetentionYears: draft.dataRetentionYears,
      target: draft.target,
      notifications: draft.notifications,
      escalation: draft.escalation,
      rowsPerPage: draft.rowsPerPage,
      demoMode: draft.demoMode,
    });
    setDirty(false);
    toast({ tone: 'success', title: 'Settings saved', description: 'Targets and notification rules are now live for every screen.' });
  };

  const revert = () => {
    setDraft(settings);
    setDirty(false);
    toast({ tone: 'info', title: 'Reverted to saved values' });
  };

  const restoreDefaults = () => {
    setDraft((d) => ({ ...d, target: DEFAULT_SETTINGS.target, escalation: DEFAULT_SETTINGS.escalation, notifications: DEFAULT_SETTINGS.notifications }));
    setDirty(true);
    toast({ tone: 'info', title: 'Defaults loaded', description: 'Review the values and save to apply them.' });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Plant identity, performance targets, escalation matrix and notification rules used across the whole module."
        breadcrumbs={[{ label: 'EHS', to: '/dashboard' }, { label: 'Settings' }]}
        icon={<LayoutGrid className="h-4 w-4" />}
        badges={dirty ? <Badge tone="warning" showDot>Unsaved changes</Badge> : <Badge tone="success" showDot>In sync</Badge>}
        toolbar={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={revert} disabled={!dirty}>
              <RotateCcw className="h-3.5 w-3.5" />
              Revert
            </Button>
            <Button variant="primary" size="sm" onClick={save} disabled={!dirty}>
              <Save className="h-3.5 w-3.5" />
              Save changes
            </Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="organisation">
            <Building2 className="h-3.5 w-3.5" />
            Organisation
          </TabsTrigger>
          <TabsTrigger value="targets" count={Object.keys(draft.target).length}>
            <Gauge className="h-3.5 w-3.5" />
            Targets
          </TabsTrigger>
          <TabsTrigger value="escalation">
            <Timer className="h-3.5 w-3.5" />
            Escalation
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <BellRing className="h-3.5 w-3.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database className="h-3.5 w-3.5" />
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organisation">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>Plant identity</CardTitle>
                  <p className="mt-0.5 text-xs text-ink-500">Printed on every report, certificate and notification</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <label className="text-xs font-medium text-ink-700" htmlFor="org-name">
                      Organisation
                    </label>
                    <Input id="org-name" value={draft.organisationName} onChange={(e) => patch({ organisationName: e.target.value })} />
                  </Field>
                  <Field>
                    <label className="text-xs font-medium text-ink-700" htmlFor="plant-name">
                      Plant / site
                    </label>
                    <Input id="plant-name" value={draft.plantName} onChange={(e) => patch({ plantName: e.target.value })} />
                  </Field>
                  <Field>
                    <label className="text-xs font-medium text-ink-700" htmlFor="fy-start">
                      Fiscal year start
                    </label>
                    <Input id="fy-start" type="date" value={draft.fiscalYearStart} onChange={(e) => patch({ fiscalYearStart: e.target.value })} />
                    <FieldHint>Reporting years roll from this date.</FieldHint>
                  </Field>
                  <Field>
                    <label className="text-xs font-medium text-ink-700" htmlFor="rows">
                      Table rows per page
                    </label>
                    <Select
                      id="rows"
                      value={String(draft.rowsPerPage)}
                      onValueChange={(v) => patch({ rowsPerPage: Number(v) })}
                      options={[10, 25, 50, 100].map((n) => ({ value: String(n), label: `${n} rows` }))}
                    />
                  </Field>
                </div>

                <SectionTitle className="mb-0">Reporting windows</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {RANGE_PRESETS.map((p) => (
                    <Badge key={p.key} tone="neutral">
                      {p.label}
                    </Badge>
                  ))}
                </div>
                <p className="text-[11px] text-ink-500">
                  Range presets are available from the global filter bar on every dashboard and register screen.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Scope</CardTitle>
                  <p className="mt-0.5 text-xs text-ink-500">What the module is currently covering</p>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2.5 text-xs">
                  {[
                    ['Units', state.units.length],
                    ['Employees', state.employees.length],
                    ['Records tracked', recordCount],
                    ['Training assignments', state.trainingRecords.length],
                    ['Inspections', state.inspections.length],
                    ['Drills', state.drills.length],
                    ['Emergency assets', state.emergencyAssets.length],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex items-center justify-between">
                      <dt className="text-ink-600">{label}</dt>
                      <dd className="font-semibold text-ink-900 tabular-nums">{Number(value).toLocaleString('en-IN')}</dd>
                    </div>
                  ))}
                </dl>
                <Button variant="outline" size="sm" className="mt-4 w-full justify-center" onClick={resetFilter}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset global filters
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="targets">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Performance targets</CardTitle>
                <p className="mt-0.5 text-xs text-ink-500">Every dashboard indicator, status colour and escalation is driven by these numbers</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {(Object.keys(draft.target) as (keyof typeof settings.target)[]).map((key) => (
                  <Field key={key}>
                    <label className="text-xs font-medium text-ink-700 capitalize" htmlFor={`target-${key}`}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
                    </label>
                    <Input
                      id={`target-${key}`}
                      type="number"
                      min={0}
                      step="any"
                      value={String(draft.target[key])}
                      onChange={(e) => patchTarget(key, Number(e.target.value))}
                    />
                    <FieldHint>{TARGET_HELP[key]}</FieldHint>
                  </Field>
                ))}
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  Targets feed <span className="font-semibold">computeSafetyStatus</span>, so changing them immediately re-bands every unit on the
                  dashboard and corporate view.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escalation">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Escalation matrix</CardTitle>
                <p className="mt-0.5 text-xs text-ink-500">Days overdue before an item is escalated, and who it goes to</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { level: 'Level 1', days: 'level1Days', to: 'level1To', default: DEFAULT_SETTINGS.escalation.level1To },
                  { level: 'Level 2', days: 'level2Days', to: 'level2To', default: DEFAULT_SETTINGS.escalation.level2To },
                  { level: 'Level 3', days: 'level3Days', to: 'level3To', default: DEFAULT_SETTINGS.escalation.level3To },
                ].map((row) => (
                  <div key={row.level} className="rounded-lg border border-ink-100 p-4">
                    <p className="text-xs font-semibold text-ink-900">{row.level}</p>
                    <p className="mt-0.5 text-[11px] text-ink-500">After</p>
                    <Field className="mt-1">
                      <Input
                        type="number"
                        min={0}
                        aria-label={`${row.level} days`}
                        value={String(draft.escalation[row.days as 'level1Days'])}
                        onChange={(e) => patchEscalation(row.days as 'level1Days', Number(e.target.value))}
                      />
                      <FieldHint>days overdue</FieldHint>
                    </Field>
                    <Field className="mt-3">
                      <label className="text-xs font-medium text-ink-700" htmlFor={row.to}>
                        Notify
                      </label>
                      <Input
                        id={row.to}
                        value={String(draft.escalation[row.to as 'level1To'])}
                        placeholder={row.default}
                        onChange={(e) => patchEscalation(row.to as 'level1To', e.target.value)}
                      />
                    </Field>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-ink-100 bg-surface-2 p-3 text-xs text-ink-600">
                <p className="font-semibold text-ink-800">How escalation resolves today</p>
                <p className="mt-1 leading-relaxed">
                  A corrective action becomes <span className="font-medium">Overdue</span> once it passes its due date, and{' '}
                  <span className="font-medium">Overdue (Escalated)</span> beyond level 1. Notifications are written to the inbox with a{' '}
                  <span className="font-medium">Warning</span> or <span className="font-medium">Critical</span> severity.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Delivery channels</CardTitle>
                  <p className="mt-0.5 text-xs text-ink-500">Where alerts are pushed when the module raises one</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(
                  [
                    ['email', 'Email', 'Digest and single-event summaries'],
                    ['push', 'In-app push', 'Real-time banners and the bell icon'],
                    ['sms', 'SMS', 'Critical incidents and level 3 escalations only'],
                  ] as const
                ).map(([key, label, hint]) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-ink-800">{label}</p>
                      <p className="text-[11px] text-ink-500">{hint}</p>
                    </div>
                    <Switch checked={draft.notifications[key]} onCheckedChange={(v) => patchNotification(key, v)} aria-label={label} />
                  </div>
                ))}
                <Field>
                  <label className="text-xs font-medium text-ink-700" htmlFor="digest">
                    Digest cadence
                  </label>
                  <Select
                    id="digest"
                    value={draft.notifications.digest}
                    onValueChange={(v) => patchNotification('digest', v)}
                    options={[
                      { value: 'Real-time', label: 'Real-time' },
                      { value: 'Daily', label: 'Daily' },
                      { value: 'Weekly', label: 'Weekly' },
                    ]}
                  />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Alert rules</CardTitle>
                  <p className="mt-0.5 text-xs text-ink-500">Which events generate a notification</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(
                  [
                    ['criticalAlerts', 'Critical alerts', 'Severity-critical incidents and fires'],
                    ['overdueCaps', 'Overdue corrective actions', 'Raised on the day an action passes its due date'],
                    ['inspectionReminders', 'Inspection reminders', 'Sent 3 days before a scheduled inspection'],
                    ['trainingExpiry', 'Training expiry', '30 days before a validity period lapses'],
                  ] as const
                ).map(([key, label, hint]) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-ink-800">{label}</p>
                      <p className="text-[11px] text-ink-500">{hint}</p>
                    </div>
                    <Switch checked={draft.notifications[key]} onCheckedChange={(v) => patchNotification(key, v)} aria-label={label} />
                  </div>
                ))}
                <div className="rounded-lg border border-ink-100 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-800">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Current effective rules
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                    {Object.entries(draft.notifications)
                      .filter(([, v]) => typeof v === 'boolean' && v)
                      .map(([key]) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()))
                      .join(', ') || 'No automated rules enabled'}{' '}
                    via {draft.notifications.digest.toLowerCase()} digest.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="data">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Dataset</CardTitle>
                  <p className="mt-0.5 text-xs text-ink-500">The module runs on a deterministic in-memory dataset</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-ink-800">Demo mode</p>
                    <p className="text-[11px] text-ink-500">Seed data is regenerated on every login, so all figures reconcile.</p>
                  </div>
                  <Switch checked={draft.demoMode} onCheckedChange={(v) => patch({ demoMode: v })} aria-label="Demo mode" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    ['Units', state.units.length],
                    ['Employees', state.employees.length],
                    ['Incidents', state.incidents.length],
                    ['Near misses', state.nearMisses.length],
                    ['Observations', state.observations.length],
                    ['CAPA', state.correctiveActions.length],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg border border-ink-100 p-3">
                      <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">{label}</p>
                      <p className="mt-0.5 text-lg font-semibold text-ink-900 tabular-nums">{Number(value).toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-ink-500">
                  Reporting date anchor: {formatDate('2026-09-29')}. Retention policy: {settings.dataRetentionYears} years.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Restore defaults</CardTitle>
                  <p className="mt-0.5 text-xs text-ink-500">Reload the shipped target, escalation and notification values</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription>
                  Restoring defaults replaces your current target thresholds, escalation matrix and notification rules. Organisation identity and
                  the global filter are left untouched.
                </CardDescription>
                <div className="rounded-lg border border-ink-100 p-3 text-xs">
                  <p className="font-semibold text-ink-800">Shipped values</p>
                  <ul className="mt-1.5 space-y-1 text-ink-600">
                    <li>LTIFR target: {DEFAULT_SETTINGS.target.ltifr}</li>
                    <li>TRIFR target: {DEFAULT_SETTINGS.target.trifr}</li>
                    <li>Training compliance: {DEFAULT_SETTINGS.target.trainingCompliance}%</li>
                    <li>PPE compliance: {DEFAULT_SETTINGS.target.ppeCompliance}%</li>
                    <li>CAPA on-time closure: {DEFAULT_SETTINGS.target.capaOnTimeClosure}%</li>
                    <li>Drill recency: {DEFAULT_SETTINGS.target.daysSinceLastDrill} days</li>
                  </ul>
                </div>
                <Button variant="outline" onClick={restoreDefaults}>
                  <RotateCcw className="h-4 w-4" />
                  Load default values
                </Button>
                <p className="text-[11px] text-ink-400">Nothing is written until you press Save changes.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Settings;
