/* Sanity check for the deterministic demo dataset. Run with: npx tsx scripts/validate.ts */
import { buildDemoState } from '../src/data/generate';
import { DEFAULT_RANGE, getAllUnitMetrics, getCorporateMetrics, monthlyTrend, nearMissSummary, capaSummary, inspectionSummary, emergencySummary, ppeItemBreakdown, trainingBreakdown, buildIndicators, previousPeriodRange, getCorporateMetrics as corp } from '../src/data/analytics';

const s = buildDemoState();
const range = DEFAULT_RANGE;
const corp2 = getCorporateMetrics(s, range);

console.log('=== RECORD COUNTS ===');
console.log({
  units: s.units.length,
  employees: s.employees.length,
  incidents: s.incidents.length,
  nearMisses: s.nearMisses.length,
  observations: s.observations.length,
  correctiveActions: s.correctiveActions.length,
  trainingRecords: s.trainingRecords.length,
  ppeRows: s.ppeCompliance.length,
  inspections: s.inspections.length,
  drills: s.drills.length,
  emergencyAssets: s.emergencyAssets.length,
  notifications: s.notifications.length,
});

console.log('\n=== CORPORATE (This Year) ===');
console.log({
  units: corp2.unitCount,
  employees: corp2.employees,
  manHours: corp2.manHours,
  incidents: corp2.incidents,
  accidents: corp2.accidents,
  LTI: corp2.lostTimeInjuries,
  nearMissLedger: corp2.nearMissLedger,
  observations: corp2.observations,
  openCapa: corp2.openCapa,
  overdueCapa: corp2.overdueCapa,
  training: corp2.trainingCompliance,
  ppe: corp2.ppeCompliance,
  ltifr: corp2.ltifr,
  trifr: corp2.trifr,
  status: corp2.status,
  statusCount: corp2.statusCount,
});

console.log('\n=== UNIT METRICS ===');
console.table(
  getAllUnitMetrics(s, range).map((m) => ({
    unit: m.unitCode,
    emp: m.employees,
    mh: m.manHours,
    inc: m.incidents,
    acc: m.accidents,
    nm: m.nearMisses,
    lti: m.lostTimeInjuries,
    obs: m.observations,
    trn: m.trainingCompliance,
    ppe: m.ppeCompliance,
    capa: m.openCapa,
    ovd: m.overdueCapa,
    LTIFR: m.ltifr,
    TRIFR: m.trifr,
    insp: m.inspectionsCompleted,
    score: m.inspectionScore,
    status: m.status,
  })),
);

console.log('\n=== MODULE SUMMARIES ===');
console.log('nearMiss', nearMissSummary(s, range, 'ALL'));
console.log('capa', capaSummary(s, range, 'ALL'));
console.log('inspection', inspectionSummary(s, range, 'ALL'));
console.log('emergency', emergencySummary(s, 'ALL'));
console.log('ppe items', ppeItemBreakdown(s, 'ALL'));
console.table(trainingBreakdown(s, range, 'ALL'));

console.log('\n=== TREND ===');
console.table(monthlyTrend(s, 'ALL'));

console.log('\n=== INDICATORS (with previous period) ===');
const prev = corp(s, previousPeriodRange(range));
console.table(buildIndicators(corp2, prev, { ltifr: 1.5, trifr: 3, trainingCompliance: 95, ppeCompliance: 97 }).map((i) => ({
  kpi: i.label, value: i.value, previous: i.previous, target: i.target, unit: i.unit,
})));

console.log('\n=== CROSS-CHECK: RML CAPA ===');
const rml = s.correctiveActions.filter((c) => c.unitId === 'UNIT-RML');
console.log({
  total: rml.length,
  openish: rml.filter((c) => c.status !== 'Completed').length,
  overdue: rml.filter((c) => c.status === 'Overdue').length,
  metricsOpen: getAllUnitMetrics(s, range).find((m) => m.unitCode === 'RML')?.openCapa,
});

console.log('\n=== SAMPLE INCIDENTS ===');
console.table(s.incidents.slice(0, 5).map((i) => ({
  no: i.incidentNo, unit: i.unitId, date: i.date, type: i.incidentType, sev: i.severity, status: i.status, inv: i.investigationStatus, days: i.lostDays,
})));

console.log('\n=== SAMPLE NOTIFICATIONS ===');
s.notifications.slice(0, 8).forEach((n) => console.log(`[${n.severity}] ${n.title} :: ${n.message.slice(0, 80)}`));
