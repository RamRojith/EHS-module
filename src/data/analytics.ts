import { MONTH_LABELS, type MonthKey } from './units';
import type {
  CapaStatus,
  CorrectiveAction,
  EhsState,
  EmergencyDrill,
  Incident,
  NearMiss,
  ObservationType,
  PpeItem,
  SafetyInspection,
  SafetyObservation,
  Severity,
  TrainingCategory,
  TrainingStatus,
  Unit,
} from './types';

/* ========================================================================== */
/*                                  FILTERS                                   */
/* ========================================================================== */

export type RangePreset = 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_3_MONTHS' | 'LAST_6_MONTHS' | 'THIS_YEAR' | 'CUSTOM';

export interface DateRange {
  preset: RangePreset;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

export const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'THIS_MONTH', label: 'This Month' },
  { key: 'LAST_MONTH', label: 'Last Month' },
  { key: 'LAST_3_MONTHS', label: 'Last 3 Months' },
  { key: 'LAST_6_MONTHS', label: 'Last 6 Months' },
  { key: 'THIS_YEAR', label: 'This Year' },
  { key: 'CUSTOM', label: 'Custom Range' },
];

export interface DataFilter {
  unitId: string | 'ALL';
  department: string | 'ALL';
  incidentType: string | 'ALL';
  severity: string | 'ALL';
  status: string | 'ALL';
  range: DateRange;
}

export const DEFAULT_RANGE: DateRange = {
  preset: 'THIS_YEAR',
  from: '2026-01-01',
  to: '2026-09-29',
};

export const DEFAULT_FILTER: DataFilter = {
  unitId: 'ALL',
  department: 'ALL',
  incidentType: 'ALL',
  severity: 'ALL',
  status: 'ALL',
  range: DEFAULT_RANGE,
};

/* ========================================================================== */
/*                                  HELPERS                                    */
/* ========================================================================== */

/** Frozen "today" for the demo dataset so every ageing calculation is stable. */
const DEMO_NOW = new Date('2026-09-29T00:00:00').getTime();

export const DEMO_TODAY_ISO = '2026-09-29';

const inRange = (date: string | null, range: DateRange): boolean =>
  !!date && date >= range.from && date <= range.to;

export const pct = (numerator: number, denominator: number): number =>
  denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;

export const rate = (count: number, manHours: number, factor = 1_000_000): number =>
  manHours > 0 ? Number(((count * factor) / manHours).toFixed(2)) : 0;

export const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);

export function countBy<T>(arr: T[], key: (item: T) => string | null): Record<string, number> {
  return arr.reduce<Record<string, number>>((acc, item) => {
    const k = key(item);
    if (k) acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

/* ========================================================================== */
/*                              SAFETY STATUS BAND                            */
/* ========================================================================== */

export type SafetyStatus = 'Good' | 'Attention Required' | 'Critical';

export interface StatusScoreInput {
  ltifr: number;
  overdueCapa: number;
  openIncidents: number;
  trainingCompliance: number;
  ppeCompliance: number;
  failedInspections: number;
  manHours: number;
}

/**
 * Operational monitoring band — used for triage, never as a league table.
 * A single explainable risk-penalty score is accumulated from the drivers that
 * actually require action, then compared to two thresholds.
 */
export function computeSafetyStatus(input: StatusScoreInput): SafetyStatus {
  const riskPenalty =
    input.ltifr * 0.45 +                       // injury frequency dominates the band
    input.overdueCapa * 0.40 +                 // governance backlog
    input.openIncidents * 0.08 +               // live incident load
    input.failedInspections * 0.50 +           // failed control checks
    (100 - input.trainingCompliance) * 0.15 +
    (100 - input.ppeCompliance) * 0.10;

  if (riskPenalty > 5.5) return 'Critical';
  if (riskPenalty > 3.0) return 'Attention Required';
  return 'Good';
}

export const STATUS_ORDER: Record<SafetyStatus, number> = {
  Critical: 0,
  'Attention Required': 1,
  Good: 2,
};

/* ========================================================================== */
/*                                UNIT METRICS                                */
/* ========================================================================== */

export interface UnitMetrics {
  unitId: string;
  unitCode: string;
  unitName: string;
  employees: number;
  manHours: number;
  /** incidents excluding the pure "Near Miss" ledger entries (those live in their own register) */
  incidents: number;
  accidents: number; // Medical Treatment + Lost Time Injury + Fire + Property Damage
  firstAid: number;
  /** near misses raised through the incident register only */
  nearMissLedger: number;
  /** near misses raised through the dedicated near-miss board only */
  nearMissRegister: number;
  /** the single figure shown on dashboards = ledger + register */
  nearMisses: number;
  lostTimeInjuries: number;
  recordableCases: number; // Medical Treatment + Lost Time Injury
  lostDays: number;
  observations: number;
  observationsByType: Record<ObservationType, number>;
  openIncidents: number;
  closedIncidents: number;
  openCapa: number;
  overdueCapa: number;
  completedCapa: number;
  totalCapa: number;
  capaOnTimeClosure: number;
  trainingCompliance: number;
  trainingCompleted: number;
  trainingPending: number;
  trainingExpired: number;
  trainingTotal: number;
  ppeCompliance: number;
  ppeAssessed: number;
  ppeNonCompliant: number;
  inspectionsCompleted: number;
  inspectionsPending: number;
  inspectionsFailed: number;
  inspectionScore: number;
  ltifr: number;
  trifr: number;
  severityRate: number;
  incidentFrequencyRate: number;
  nearMissRate: number;
  safetyObservationRate: number;
  status: SafetyStatus;
  lastDrill: EmergencyDrill | null;
  nextDrill: EmergencyDrill | null;
}

function metricsForUnit(
  state: EhsState,
  unit: Unit,
  range: DateRange,
  unitIdOverride?: string,
): UnitMetrics {
  const unitId = unitIdOverride ?? unit.id;
  const employees = state.employees.filter((e) => e.unitId === unitId);

  const months = monthKeysInRange(range);
  const manHours = sum(months.map((m) => state.manHours[`${unitId}|${m}`] ?? 0));

  const incidents = state.incidents.filter((i) => i.unitId === unitId && inRange(i.date, range));
  const nearMissLedger = state.incidents.filter(
    (i) => i.unitId === unitId && i.incidentType === 'Near Miss' && inRange(i.date, range),
  );
  const nearMisses = state.nearMisses.filter((n) => n.unitId === unitId && inRange(n.date, range));
  const observations = state.observations.filter((o) => o.unitId === unitId && inRange(o.date, range));
  const capa = state.correctiveActions.filter((c) => c.unitId === unitId && inRange(c.raisedDate, range));
  const trainingRecords = state.trainingRecords.filter((t) => t.unitId === unitId);
  const ppe = state.ppeCompliance.filter((p) => p.unitId === unitId);
  const inspections = state.inspections.filter((i) => i.unitId === unitId && inRange(i.date ?? i.scheduledDate, range));
  const drills = state.drills.filter((d) => d.unitId === unitId);

  const firstAid = incidents.filter((i) => i.incidentType === 'First Aid').length;
  const lostTimeInjuries = incidents.filter((i) => i.incidentType === 'Lost Time Injury').length;
  const recordable = incidents.filter(
    (i) => i.incidentType === 'Lost Time Injury' || i.incidentType === 'Medical Treatment',
  ).length;
  const accidents = incidents.filter((i) =>
    i.incidentType === 'Medical Treatment'
    || i.incidentType === 'Lost Time Injury'
    || i.incidentType === 'Fire Incident'
    || i.incidentType === 'Property Damage');
  const lostDays = sum(incidents.map((i) => i.lostDays));
  const openIncidents = incidents.filter((i) => i.status !== 'Closed').length;

  const overdueCapa = capa.filter((c) => c.status === 'Overdue').length;
  const openCapa = capa.filter((c) => c.status === 'Open' || c.status === 'In Progress' || c.status === 'Overdue').length;
  const completedCapa = capa.filter((c) => c.status === 'Completed').length;
  const capaOnTimeClosure = pct(completedCapa, capa.length);

  const tCounts = trainingStatusCounts(trainingRecords);
  const trainingCompliance = pct(tCounts.Completed, trainingRecords.length);

  const ppeAssessed = sum(ppe.map((p) => p.assessed));
  const ppeNonCompliant = sum(ppe.map((p) => p.nonCompliant));
  const ppeCompliance = pct(ppeAssessed - ppeNonCompliant, ppeAssessed);

  const scoredInspections = inspections.filter((i) => i.score !== null);
  const inspectionScore = scoredInspections.length
    ? Math.round(sum(scoredInspections.map((i) => i.score as number)) / scoredInspections.length)
    : 0;

  const ltifr = rate(lostTimeInjuries, manHours);
  const trifr = rate(recordable, manHours);
  const severityRate = rate(lostDays, manHours);
  const incidentFrequencyRate = rate(accidents.length, manHours);
  const nearMissRate = rate(nearMisses.length + nearMissLedger.length, manHours);
  const safetyObservationRate = rate(observations.length, manHours);

  const status = computeSafetyStatus({
    ltifr,
    overdueCapa,
    openIncidents,
    trainingCompliance,
    ppeCompliance,
    failedInspections: inspections.filter((i) => i.status === 'Failed').length,
    manHours,
  });

  return {
    unitId,
    unitCode: unit.code,
    unitName: unit.name,
    employees: employees.length,
    manHours,
    incidents: incidents.length,
    accidents: accidents.length,
    firstAid,
    nearMissLedger: nearMissLedger.length,
    nearMissRegister: nearMisses.length,
    nearMisses: nearMisses.length + nearMissLedger.length,
    lostTimeInjuries,
    recordableCases: recordable,
    lostDays,
    observations: observations.length,
    observationsByType: {
      'Unsafe Act': observations.filter((o) => o.type === 'Unsafe Act').length,
      'Unsafe Condition': observations.filter((o) => o.type === 'Unsafe Condition').length,
      'Positive Observation': observations.filter((o) => o.type === 'Positive Observation').length,
    },
    openIncidents,
    closedIncidents: incidents.length - openIncidents,
    openCapa,
    overdueCapa,
    completedCapa,
    totalCapa: capa.length,
    capaOnTimeClosure,
    trainingCompliance,
    trainingCompleted: tCounts.Completed,
    trainingPending: tCounts.Pending,
    trainingExpired: tCounts.Expired,
    trainingTotal: trainingRecords.length,
    ppeCompliance,
    ppeAssessed,
    ppeNonCompliant,
    inspectionsCompleted: inspections.filter((i) => i.status === 'Completed').length,
    inspectionsPending: inspections.filter((i) => i.status === 'Pending' || i.status === 'Scheduled').length,
    inspectionsFailed: inspections.filter((i) => i.status === 'Failed').length,
    inspectionScore,
    ltifr,
    trifr,
    severityRate,
    incidentFrequencyRate,
    nearMissRate,
    safetyObservationRate,
    status,
    lastDrill: drills.filter((d) => d.status === 'Completed').sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null,
    nextDrill: drills.filter((d) => d.status === 'Scheduled').sort((a, b) => (a.date > b.date ? -1 : 1))[0] ?? null,
  };
}

export function monthKeysInRange(range: DateRange): string[] {
  return (Object.keys(MONTH_LABELS) as MonthKey[]).filter((m) => {
    const last = `${m}-31`;
    const first = `${m}-01`;
    return last >= range.from && first <= range.to;
  });
}

export function getUnitMetrics(state: EhsState, unitId: string, range: DateRange): UnitMetrics {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) throw new Error(`Unknown unit: ${unitId}`);
  return metricsForUnit(state, unit, range, unitId);
}

export function getAllUnitMetrics(state: EhsState, range: DateRange): UnitMetrics[] {
  return state.units.map((u) => metricsForUnit(state, u, range));
}

/* ========================================================================== */
/*                             CORPORATE METRICS                              */
/* ========================================================================== */

export interface CorporateMetrics extends Omit<UnitMetrics, 'unitId' | 'unitCode' | 'unitName'> {
  unitCount: number;
  statusCount: Record<SafetyStatus, number>;
  drillScore: number;
  emergencyReadiness: number;
  incidentByType: Record<string, number>;
  incidentBySeverity: Record<Severity, number>;
}

export function getCorporateMetrics(state: EhsState, range: DateRange): CorporateMetrics {
  const perUnit = getAllUnitMetrics(state, range);

  const headcount = sum(perUnit.map((m) => m.employees));
  const manHours = sum(perUnit.map((m) => m.manHours));
  const weighted = (key: keyof UnitMetrics) => {
    const denom = perUnit.reduce((a, m) => a + (m.manHours || 1), 0);
    const numer = perUnit.reduce((a, m) => a + (m[key] as number) * (m.manHours || 1), 0);
    return denom ? Number((numer / denom).toFixed(2)) : 0;
  };

  const statusCount: Record<SafetyStatus, number> = { Good: 0, 'Attention Required': 0, Critical: 0 };
  perUnit.forEach((m) => { statusCount[m.status] += 1; });

  const assets = state.emergencyAssets;
  const drillCompleted = state.drills.filter((d) => d.status === 'Completed');
  const emergencyReadiness = pct(
    assets.filter((a) => a.status === 'Serviceable').length,
    assets.length,
  );
  const drillScore = pct(
    drillCompleted.filter((d) => d.result === 'Satisfactory').length,
    drillCompleted.length,
  );

  const incidents = state.incidents.filter((i) => inRange(i.date, range));
  const incidentByType = countBy(incidents, (i) => i.incidentType);
  const incidentBySeverity: Record<Severity, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  incidents.forEach((i) => { incidentBySeverity[i.severity] += 1; });

  const totalTraining = sum(perUnit.map((m) => m.trainingTotal));
  const trainingCompliance = pct(sum(perUnit.map((m) => m.trainingCompleted)), totalTraining);
  const ppeAssessed = sum(perUnit.map((m) => m.ppeAssessed));
  const ppeNonCompliant = sum(perUnit.map((m) => m.ppeNonCompliant));

  return {
    unitCount: perUnit.length,
    employees: headcount,
    manHours,
    incidents: sum(perUnit.map((m) => m.incidents)),
    accidents: sum(perUnit.map((m) => m.accidents)),
    firstAid: sum(perUnit.map((m) => m.firstAid)),
    nearMissLedger: sum(perUnit.map((m) => m.nearMissLedger)),
    nearMissRegister: sum(perUnit.map((m) => m.nearMissRegister)),
    nearMisses: sum(perUnit.map((m) => m.nearMisses)),
    lostTimeInjuries: sum(perUnit.map((m) => m.lostTimeInjuries)),
    recordableCases: sum(perUnit.map((m) => m.recordableCases)),
    lostDays: sum(perUnit.map((m) => m.lostDays)),
    observations: sum(perUnit.map((m) => m.observations)),
    observationsByType: {
      'Unsafe Act': sum(perUnit.map((m) => m.observationsByType['Unsafe Act'])),
      'Unsafe Condition': sum(perUnit.map((m) => m.observationsByType['Unsafe Condition'])),
      'Positive Observation': sum(perUnit.map((m) => m.observationsByType['Positive Observation'])),
    },
    openIncidents: sum(perUnit.map((m) => m.openIncidents)),
    closedIncidents: sum(perUnit.map((m) => m.closedIncidents)),
    openCapa: sum(perUnit.map((m) => m.openCapa)),
    overdueCapa: sum(perUnit.map((m) => m.overdueCapa)),
    completedCapa: sum(perUnit.map((m) => m.completedCapa)),
    totalCapa: sum(perUnit.map((m) => m.totalCapa)),
    capaOnTimeClosure: pct(sum(perUnit.map((m) => m.completedCapa)), sum(perUnit.map((m) => m.totalCapa))),
    trainingCompliance,
    trainingCompleted: sum(perUnit.map((m) => m.trainingCompleted)),
    trainingPending: sum(perUnit.map((m) => m.trainingPending)),
    trainingExpired: sum(perUnit.map((m) => m.trainingExpired)),
    trainingTotal: totalTraining,
    ppeCompliance: pct(ppeAssessed - ppeNonCompliant, ppeAssessed),
    ppeAssessed,
    ppeNonCompliant,
    inspectionsCompleted: sum(perUnit.map((m) => m.inspectionsCompleted)),
    inspectionsPending: sum(perUnit.map((m) => m.inspectionsPending)),
    inspectionsFailed: sum(perUnit.map((m) => m.inspectionsFailed)),
    inspectionScore: weighted('inspectionScore'),
    ltifr: weighted('ltifr'),
    trifr: weighted('trifr'),
    severityRate: weighted('severityRate'),
    incidentFrequencyRate: weighted('incidentFrequencyRate'),
    nearMissRate: weighted('nearMissRate'),
    safetyObservationRate: weighted('safetyObservationRate'),
    status: perUnit.some((m) => m.status === 'Critical')      ? 'Critical'
      : perUnit.some((m) => m.status === 'Attention Required') ? 'Attention Required' : 'Good',
    statusCount,
    drillScore,
    emergencyReadiness,
    lastDrill: drillCompleted.sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null,
    nextDrill: state.drills.filter((d) => d.status === 'Scheduled').sort((a, b) => (a.date > b.date ? -1 : 1))[0] ?? null,
    incidentByType,
    incidentBySeverity,
  };
}

/* ========================================================================== */
/*                              TRAINING HELPERS                               */
/* ========================================================================== */

export function trainingStatusCounts(records: { status: TrainingStatus }[]): Record<TrainingStatus, number> {
  const out: Record<TrainingStatus, number> = { Completed: 0, Pending: 0, Expired: 0, 'In Progress': 0 };
  records.forEach((r) => { out[r.status] += 1; });
  return out;
}

export interface TrainingCategoryBreakdown {
  category: TrainingCategory;
  total: number;
  completed: number;
  pending: number;
  expired: number;
  inProgress: number;
  compliance: number;
}

export function trainingBreakdown(
  state: EhsState,
  range: DateRange,
  unitId: string | 'ALL',
): TrainingCategoryBreakdown[] {
  const map = new Map<TrainingCategory, TrainingStatus[]>();
  state.trainingRecords.forEach((rec) => {
    if (unitId !== 'ALL' && rec.unitId !== unitId) return;
    if (rec.status === 'Completed' && rec.completedDate && !inRange(rec.completedDate, range)) return;
    const training = state.trainings.find((t) => t.id === rec.trainingId);
    if (!training) return;
    const list = map.get(training.category) ?? [];
    list.push(rec.status);
    map.set(training.category, list);
  });

  return [...map.entries()]
    .map(([category, statuses]) => {
      const counts = trainingStatusCounts(statuses.map((s) => ({ status: s })));
      return {
        category,
        total: statuses.length,
        completed: counts.Completed,
        pending: counts.Pending,
        expired: counts.Expired,
        inProgress: counts['In Progress'],
        compliance: pct(counts.Completed, statuses.length),
      };
    })
    .sort((a, b) => a.compliance - b.compliance);
}

/* ========================================================================== */
/*                                 PPE HELPERS                                */
/* ========================================================================== */

export interface PpeItemBreakdown {
  item: PpeItem;
  assessed: number;
  compliant: number;
  nonCompliant: number;
  compliance: number;
}

export function ppeItemBreakdown(state: EhsState, unitId: string | 'ALL'): PpeItemBreakdown[] {
  const map = new Map<PpeItem, { a: number; c: number }>();
  state.ppeCompliance.forEach((row) => {
    if (unitId !== 'ALL' && row.unitId !== unitId) return;
    const cur = map.get(row.item) ?? { a: 0, c: 0 };
    cur.a += row.assessed;
    cur.c += row.compliant;
    map.set(row.item, cur);
  });
  return [...map.entries()].map(([item, v]) => ({
    item,
    assessed: v.a,
    compliant: v.c,
    nonCompliant: v.a - v.c,
    compliance: pct(v.c, v.a),
  }));
}

export interface PpeDepartmentRow {
  department: string;
  unitId: string;
  unitCode: string;
  assessed: number;
  nonCompliant: number;
  compliance: number;
  penaltyPoints: number;
}

export function ppeByDepartment(state: EhsState, unitId: string | 'ALL'): PpeDepartmentRow[] {
  const map = new Map<string, PpeDepartmentRow>();
  state.ppeCompliance.forEach((row) => {
    if (unitId !== 'ALL' && row.unitId !== unitId) return;
    const key = `${row.unitId}|${row.department}`;
    const cur = map.get(key) ?? {
      department: row.department,
      unitId: row.unitId,
      unitCode: state.units.find((u) => u.id === row.unitId)?.code ?? row.unitId,
      assessed: 0,
      nonCompliant: 0,
      compliance: 0,
      penaltyPoints: 0,
    };
    cur.assessed += row.assessed;
    cur.nonCompliant += row.nonCompliant;
    cur.penaltyPoints += row.penaltyPoints;
    map.set(key, cur);
  });
  return [...map.values()]
    .map((r) => ({ ...r, compliance: pct(r.assessed - r.nonCompliant, r.assessed) }))
    .sort((a, b) => a.compliance - b.compliance);
}

/* ========================================================================== */
/*                                TREND HELPERS                               */
/* ========================================================================== */

export interface TrendPoint {
  month: string;
  label: string;
  fullLabel: string;
  accidents: number;
  nearMisses: number;
  safetyObservations: number;
  lostTimeInjuries: number;
  firstAid: number;
  recordable: number;
  inspections: number;
  capaRaised: number;
  capaOverdue: number;
  trainingCompliance: number;
  ppeCompliance: number;
}

export function monthlyTrend(state: EhsState, unitId: string | 'ALL'): TrendPoint[] {
  const months = Object.keys(MONTH_LABELS) as MonthKey[];
  return months.map((m) => {
    const inMonth = <T extends { date: string }>(arr: T[]) => arr.filter((r) => r.date.slice(0, 7) === m
      && (unitId === 'ALL' || (r as unknown as { unitId: string }).unitId === unitId));
    const inc = inMonth(state.incidents);
    const nm = inMonth(state.nearMisses);
    const obs = inMonth(state.observations);
    const ins = state.inspections.filter(
      (i) => (i.date ?? i.scheduledDate).slice(0, 7) === m
        && (unitId === 'ALL' || i.unitId === unitId),
    );
    const capa = state.correctiveActions.filter(
      (c) => c.raisedDate.slice(0, 7) === m && (unitId === 'ALL' || c.unitId === unitId),
    );
    const overdue = state.correctiveActions.filter(
      (c) => c.dueDate.slice(0, 7) <= m && c.status === 'Overdue' && (unitId === 'ALL' || c.unitId === unitId),
    );
    const ppeRows = state.ppeCompliance.filter((p) => unitId === 'ALL' || p.unitId === unitId);
    const ppeA = sum(ppeRows.map((p) => p.assessed));
    const ppeC = sum(ppeRows.map((p) => p.compliant));

    // Training compliance is measured as "of everything that was due by the end
    // of the month, how much had actually been completed on time".
    const monthEnd = `${m}-31`;
    const relevant = state.trainingRecords.filter(
      (r) => (unitId === 'ALL' || r.unitId === unitId) && r.dueDate <= monthEnd,
    );
    const completedTraining = relevant.filter(
      (r) => r.status === 'Completed' && (r.completedDate ?? '') <= monthEnd,
    ).length;

    return {
      month: m,
      label: MONTH_LABELS[m],
      fullLabel: new Date(`${m}-01`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      accidents: inc.filter((i) => i.incidentType === 'Medical Treatment' || i.incidentType === 'Lost Time Injury' || i.incidentType === 'Property Damage' || i.incidentType === 'Fire Incident').length,
      nearMisses: nm.length,
      safetyObservations: obs.length,
      lostTimeInjuries: inc.filter((i) => i.incidentType === 'Lost Time Injury').length,
      firstAid: inc.filter((i) => i.incidentType === 'First Aid').length,
      recordable: inc.filter((i) => i.incidentType === 'Lost Time Injury' || i.incidentType === 'Medical Treatment').length,
      inspections: ins.length,
      capaRaised: capa.length,
      capaOverdue: overdue.length,
      trainingCompliance: pct(completedTraining, relevant.length),
      ppeCompliance: pct(ppeC, ppeA),
    };
  });
}

/* ========================================================================== */
/*                            MODULE-LEVEL SUMMARIES                          */
/* ========================================================================== */

export interface NearMissSummary {
  total: number;
  open: number;
  closed: number;
  highPotential: number;
  actionTaken: number;
  byCategory: { category: string; count: number; high: number }[];
  byRisk: Record<string, number>;
}

export function nearMissSummary(state: EhsState, range: DateRange, unitId: string | 'ALL'): NearMissSummary {
  const rows = state.nearMisses.filter((n) => (unitId === 'ALL' || n.unitId === unitId) && inRange(n.date, range));
  const byCategory = new Map<string, { count: number; high: number }>();
  rows.forEach((n) => {
    const cur = byCategory.get(n.category) ?? { count: 0, high: 0 };
    cur.count += 1;
    if (n.riskLevel === 'High') cur.high += 1;
    byCategory.set(n.category, cur);
  });
  return {
    total: rows.length,
    open: rows.filter((n) => n.actionStatus === 'Open' || n.actionStatus === 'Under Analysis').length,
    closed: rows.filter((n) => n.actionStatus === 'Closed').length,
    actionTaken: rows.filter((n) => n.actionStatus === 'Action Taken').length,
    highPotential: rows.filter((n) => n.riskLevel === 'High').length,
    byCategory: [...byCategory.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.count - a.count),
    byRisk: countBy(rows, (n) => n.riskLevel),
  };
}

export interface ObservationSummary {
  total: number;
  unsafeActs: number;
  unsafeConditions: number;
  positive: number;
  closed: number;
  open: number;
  byCategory: { category: string; count: number }[];
}

export function observationSummary(
  state: EhsState,
  range: DateRange,
  unitId: string | 'ALL',
): ObservationSummary {
  const rows = state.observations.filter((o) => (unitId === 'ALL' || o.unitId === unitId) && inRange(o.date, range));
  return {
    total: rows.length,
    unsafeActs: rows.filter((o) => o.type === 'Unsafe Act').length,
    unsafeConditions: rows.filter((o) => o.type === 'Unsafe Condition').length,
    positive: rows.filter((o) => o.type === 'Positive Observation').length,
    closed: rows.filter((o) => o.status === 'Closed').length,
    open: rows.filter((o) => o.status !== 'Closed').length,
    byCategory: Object.entries(countBy(rows, (o) => o.category))
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export interface CapaSummary {
  total: number;
  open: number;
  inProgress: number;
  overdue: number;
  completed: number;
  byPriority: Record<string, number>;
  bySource: Record<string, number>;
  byUnit: { unitId: string; unitCode: string; open: number; overdue: number }[];
  avgAgeDays: number;
}

export function capaSummary(state: EhsState, range: DateRange, unitId: string | 'ALL'): CapaSummary {
  const rows = state.correctiveActions.filter(
    (c) => (unitId === 'ALL' || c.unitId === unitId) && inRange(c.raisedDate, range),
  );
  const byUnitMap = new Map<string, { unitId: string; unitCode: string; open: number; overdue: number }>();
  rows.forEach((c) => {
    const cur = byUnitMap.get(c.unitId) ?? {
      unitId: c.unitId,
      unitCode: state.units.find((u) => u.id === c.unitId)?.code ?? c.unitId,
      open: 0,
      overdue: 0,
    };
    if (c.status === 'Open' || c.status === 'In Progress' || c.status === 'Overdue') cur.open += 1;
    if (c.status === 'Overdue') cur.overdue += 1;
    byUnitMap.set(c.unitId, cur);
  });

  const today = DEMO_NOW;
  const open = rows.filter((c) => c.status !== 'Completed');
  const avgAgeDays = open.length
    ? Math.round(open.reduce((a, c) => a + (today - new Date(`${c.raisedDate}T00:00:00`).getTime()) / 86_400_000, 0) / open.length)
    : 0;

  return {
    total: rows.length,
    open: rows.filter((c) => c.status === 'Open').length,
    inProgress: rows.filter((c) => c.status === 'In Progress').length,
    overdue: rows.filter((c) => c.status === 'Overdue').length,
    completed: rows.filter((c) => c.status === 'Completed').length,
    byPriority: countBy(rows, (c) => c.priority),
    bySource: countBy(rows, (c) => c.source),
    byUnit: [...byUnitMap.values()].sort((a, b) => b.overdue - a.overdue || b.open - a.open),
    avgAgeDays,
  };
}

export interface InspectionSummary {
  scheduled: number;
  completed: number;
  pending: number;
  failed: number;
  avgScore: number;
  byCategory: { category: string; count: number; avgScore: number; failed: number }[];
  criticalFindings: number;
}

export function inspectionSummary(
  state: EhsState,
  range: DateRange,
  unitId: string | 'ALL',
): InspectionSummary {
  const inPeriod = state.inspections.filter(
    (i) => (unitId === 'ALL' || i.unitId === unitId) && inRange(i.date ?? i.scheduledDate, range),
  );
  // Forward-dated scheduled inspections are part of the live plan even though
  // they fall outside the reporting window, so they are always counted as pending.
  const upcoming = state.inspections.filter(
    (i) => (unitId === 'ALL' || i.unitId === unitId)
      && i.status === 'Scheduled'
      && i.scheduledDate > range.to,
  );
  const rows = [...inPeriod, ...upcoming];
  const byCategory = new Map<string, { count: number; total: number; failed: number }>();
  rows.forEach((i) => {
    const cur = byCategory.get(i.category) ?? { count: 0, total: 0, failed: 0 };
    cur.count += 1;
    cur.total += i.score ?? 0;
    if (i.status === 'Failed') cur.failed += 1;
    byCategory.set(i.category, cur);
  });
  const scored = rows.filter((i) => i.score !== null);
  return {
    scheduled: rows.length,
    completed: rows.filter((i) => i.status === 'Completed').length,
    pending: rows.filter((i) => i.status === 'Pending' || i.status === 'Scheduled').length,
    failed: rows.filter((i) => i.status === 'Failed').length,
    avgScore: scored.length ? Math.round(sum(scored.map((i) => i.score as number)) / scored.length) : 0,
    criticalFindings: sum(rows.map((i) => i.criticalFindings)),
    byCategory: [...byCategory.entries()]
      .map(([category, v]) => ({
        category,
        count: v.count,
        avgScore: v.count ? Math.round(v.total / v.count) : 0,
        failed: v.failed,
      }))
      .sort((a, b) => a.avgScore - b.avgScore),
  };
}

export interface EmergencySummary {
  fireDrills: number;
  emergencyDrills: number;
  evacuationDrills: number;
  totalDrills: number;
  completed: number;
  upcoming: number;
  lastDrill: EmergencyDrill | null;
  nextDrill: EmergencyDrill | null;
  preparednessScore: number;
  assets: { total: number; serviceable: number; due: number; defective: number; underRepair: number };
  exitCount: number;
  extinguisherCount: number;
  assemblyPoints: number;
  byKind: { kind: string; total: number; serviceable: number }[];
}

export function emergencySummary(state: EhsState, unitId: string | 'ALL'): EmergencySummary {
  const drills = state.drills.filter((d) => unitId === 'ALL' || d.unitId === unitId);
  const assets = state.emergencyAssets.filter((a) => unitId === 'ALL' || a.unitId === unitId);
  const completed = drills.filter((d) => d.status === 'Completed');
  const assetStatus = countBy(assets, (a) => a.status);

  const kindMap = new Map<string, { total: number; serviceable: number }>();
  assets.forEach((a) => {
    const cur = kindMap.get(a.kind) ?? { total: 0, serviceable: 0 };
    cur.total += 1;
    if (a.status === 'Serviceable') cur.serviceable += 1;
    kindMap.set(a.kind, cur);
  });

  // Preparedness = 40% asset serviceability + 35% drill success + 25% drill recency/frequency
  const assetScore = pct(assetStatus.Serviceable ?? 0, assets.length);
  const drillScore = pct(completed.filter((d) => d.result === 'Satisfactory').length, completed.length);
  const byDateDesc = (a: { date: string }, b: { date: string }) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  const byDateAsc = (a: { date: string }, b: { date: string }) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const completedDesc = [...completed].sort(byDateDesc);
  const upcomingAsc = drills.filter((d) => d.status === 'Scheduled').sort(byDateAsc);
  const lastCompleted = completedDesc[0];
  const daysSinceLast = lastCompleted
    ? Math.round((DEMO_NOW - new Date(`${lastCompleted.date}T00:00:00`).getTime()) / 86_400_000)
    : 365;
  const recencyScore = Math.max(0, Math.min(100, 100 - Math.max(0, daysSinceLast - 30) * 1.4));
  const preparednessScore = Math.round(assetScore * 0.4 + drillScore * 0.35 + recencyScore * 0.25);

  return {
    fireDrills: drills.filter((d) => d.type === 'Fire Drill').length,
    emergencyDrills: drills.filter((d) => d.type === 'Emergency Drill' || d.type === 'Mock Drill').length,
    evacuationDrills: drills.filter((d) => d.type === 'Evacuation Drill').length,
    totalDrills: drills.length,
    completed: completed.length,
    upcoming: upcomingAsc.length,
    lastDrill: lastCompleted ?? null,
    nextDrill: upcomingAsc[0] ?? null,
    preparednessScore,
    assets: {
      total: assets.length,
      serviceable: assetStatus.Serviceable ?? 0,
      due: assetStatus.Due ?? 0,
      defective: assetStatus.Defective ?? 0,
      underRepair: assetStatus['Under Repair'] ?? 0,
    },
    exitCount: assets.filter((a) => a.kind === 'Emergency Exit').length,
    extinguisherCount: assets.filter((a) => a.kind === 'Fire Extinguisher').length,
    assemblyPoints: assets.filter((a) => a.kind === 'Assembly Point').length,
    byKind: [...kindMap.entries()].map(([kind, v]) => ({ kind, ...v })),
  };
}

/* ========================================================================== */
/*                              KPI INDICATOR CARDS                            */
/* ========================================================================== */

export interface KpiIndicator {
  key: string;
  label: string;
  full: string;
  value: number;
  unit: string;
  previous: number;
  target: number;
  /** lower = better for frequency/injury rates */
  direction: 'lower-is-better' | 'higher-is-better';
  description: string;
  formula: string;
}

export function buildIndicators(
  current: CorporateMetrics,
  previous: CorporateMetrics,
  targets: { ltifr: number; trifr: number; trainingCompliance: number; ppeCompliance: number },
): KpiIndicator[] {
  return [
    {
      key: 'ltifr', label: 'LTIFR', full: 'Lost Time Injury Frequency Rate',
      value: current.ltifr, unit: 'per 1M hrs', previous: previous.ltifr, target: targets.ltifr,
      direction: 'lower-is-better',
      description: 'Lost Time Injuries × 1,000,000 ÷ total man-hours worked.',
      formula: 'LTIFR = (No. of LTI × 1,000,000) / Total man-hours',
    },
    {
      key: 'trifr', label: 'TRIFR', full: 'Total Recordable Injury Frequency Rate',
      value: current.trifr, unit: 'per 1M hrs', previous: previous.trifr, target: targets.trifr,
      direction: 'lower-is-better',
      description: 'Recordable cases (medical treatment + lost time) × 1,000,000 ÷ man-hours.',
      formula: 'TRIFR = (Recordable cases × 1,000,000) / Total man-hours',
    },
    {
      key: 'severity', label: 'Severity Rate', full: 'Severity of Lost Time Injuries',
      value: current.severityRate, unit: 'days / 1M hrs', previous: previous.severityRate, target: 0,
      direction: 'lower-is-better',
      description: 'Total days lost × 1,000,000 ÷ man-hours worked.',
      formula: 'SR = (Days lost × 1,000,000) / Total man-hours',
    },
    {
      key: 'ifr', label: 'Incident Frequency', full: 'Accident Incident Frequency Rate',
      value: current.incidentFrequencyRate, unit: 'per 1M hrs', previous: previous.incidentFrequencyRate, target: 0,
      direction: 'lower-is-better',
      description: 'Accident incidents × 1,000,000 ÷ man-hours worked.',
      formula: 'AIFR = (Accident incidents × 1,000,000) / Total man-hours',
    },
    {
      key: 'nmr', label: 'Near-Miss Rate', full: 'Near-Miss Reporting Rate',
      value: current.nearMissRate, unit: 'per 1M hrs', previous: previous.nearMissRate, target: 8,
      direction: 'higher-is-better',
      description: 'Near misses reported × 1,000,000 ÷ man-hours worked. A higher rate indicates a healthier reporting culture.',
      formula: 'NMR = (Near misses × 1,000,000) / Total man-hours',
    },
    {
      key: 'sor', label: 'Safety Observation Rate', full: 'Safety Observation Rate',
      value: current.safetyObservationRate, unit: 'per 1M hrs', previous: previous.safetyObservationRate, target: 12,
      direction: 'higher-is-better',
      description: 'Safety observations × 1,000,000 ÷ man-hours worked. Leading indicator of proactive behaviour.',
      formula: 'SOR = (Observations × 1,000,000) / Total man-hours',
    },
    {
      key: 'training', label: 'Training Compliance', full: 'Mandatory Training Compliance',
      value: current.trainingCompliance, unit: '%', previous: previous.trainingCompliance, target: targets.trainingCompliance,
      direction: 'higher-is-better',
      description: 'Completed mandatory training records ÷ total assigned training records.',
      formula: 'Compliance = (Completed records / Total assigned records) × 100',
    },
    {
      key: 'ppe', label: 'PPE Compliance', full: 'PPE Compliance',
      value: current.ppeCompliance, unit: '%', previous: previous.ppeCompliance, target: targets.ppeCompliance,
      direction: 'higher-is-better',
      description: 'Compliant PPE observations ÷ total PPE observations carried out during audits.',
      formula: 'PPE Compliance = (Compliant / Assessed) × 100',
    },
  ];
}

export function shiftRange(range: DateRange, months: number): DateRange {
  const to = new Date(`${range.to}T00:00:00`);
  const from = new Date(to);
  from.setMonth(from.getMonth() - (months - 1));
  from.setDate(1);
  return { preset: 'CUSTOM', from: from.toISOString().slice(0, 10), to: range.to };
}

export function previousPeriodRange(range: DateRange): DateRange {
  const to = new Date(`${range.from}T00:00:00`);
  const from = new Date(to);
  const spanDays = Math.round(
    (new Date(`${range.to}T00:00:00`).getTime() - to.getTime()) / 86_400_000,
  );
  to.setDate(to.getDate() - 1);
  from.setDate(from.getDate() - spanDays - 1);
  return {
    preset: 'CUSTOM',
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

/* ---------------------------------- filters -------------------------------- */

export const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low'];
export const CAPA_STATUSES: CapaStatus[] = ['Open', 'In Progress', 'Completed', 'Overdue'];
export type { Incident, NearMiss, CorrectiveAction, SafetyInspection, SafetyObservation };
