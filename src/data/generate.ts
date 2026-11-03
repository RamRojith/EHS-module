import { createRng, type Rng } from './rng';
import {
  CAPA_FINDINGS,
  DEMO_TODAY,
  DESIGNATIONS_BY_DEPT,
  FIRST_NAMES,
  INSPECTOR_NAMES,
  INSPECTION_CATEGORIES,
  INCIDENT_NARRATIVE,
  INJURY_PARTS,
  LAST_NAMES,
  MONTHS,
  NEAR_MISS_CATEGORIES,
  NEAR_MISS_NARRATIVE,
  PPE_DIFFICULTY,
  PPE_ITEMS,
  ROOT_CAUSES,
  SAFETY_OFFICER_NAMES,
  TRAINING_CATEGORY_FACTOR,
  TRAINING_LIBRARY,
  UNIT_SEEDS,
  WARDEN_NAMES,
  type UnitSeed,
} from './units';
import type {
  AppNotification,
  CorrectiveAction,
  EhsState,
  EmergencyAsset,
  EmergencyDrill,
  EmergencyPlan,
  Employee,
  Incident,
  NearMiss,
  PpeCompliance,
  Priority,
  RecordStatus,
  ReportDefinition,
  Role,
  SafetyInspection,
  SafetyObservation,
  Training,
  TrainingRecord,
  Unit,
} from './types';

/* ========================================================================== */
/*                                DATE HELPERS                                */
/* ========================================================================== */

const DAY_MS = 86_400_000;

export const iso = (d: Date): string => d.toISOString().slice(0, 10);
export const isoTime = (d: Date): string => d.toISOString().slice(11, 16);
export const TODAY = iso(DEMO_TODAY);

function dateInMonth(rng: Rng, month: string): Date {
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const day = rng.int(1, daysInMonth);
  return new Date(y, m - 1, day);
}

function shiftDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return iso(d);
}

function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function addMonthsToIso(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return iso(d);
}

const SHIFTS = ['A', 'B', 'C', 'General'] as const;
const SHIFT_TIMES: Record<(typeof SHIFTS)[number], string> = {
  A: '06:00',
  B: '14:00',
  C: '22:00',
  General: '10:00',
};

/* ========================================================================== */
/*                                 ROLES / USERS                              */
/* ========================================================================== */

export const ROLES: Role[] = [
  {
    id: 'ROLE-01',
    code: 'CORPORATE_EHS_HEAD',
    name: 'Head of EHS',
    description: 'Organization-wide safety accountability across all units.',
    permissions: ['*'],
  },
  {
    id: 'ROLE-02',
    code: 'UNIT_SAFETY_HEAD',
    name: 'Unit Safety Head',
    description: 'Owns safety records for a single unit.',
    permissions: [
      'dashboard', 'units:self', 'incidents', 'near-misses', 'observations',
      'capa', 'training', 'ppe', 'inspections', 'emergency', 'reports', 'notifications',
    ],
  },
  {
    id: 'ROLE-03',
    code: 'SAFETY_OFFICER',
    name: 'Safety Officer',
    description: 'Records inspections, observations and incidents for an assigned unit.',
    permissions: ['dashboard', 'incidents:create', 'observations:create', 'inspections', 'near-misses'],
  },
  {
    id: 'ROLE-04',
    code: 'HR',
    name: 'HR / Administration',
    description: 'Employee master data and training compliance read access.',
    permissions: ['dashboard', 'training', 'employees'],
  },
  {
    id: 'ROLE-05',
    code: 'EMPLOYEE',
    name: 'Employee',
    description: 'Self-service access to own training, PPE and incident reporting.',
    permissions: ['self-service'],
  },
];

/* ========================================================================== */
/*                                   EMPLOYEES                                */
/* ========================================================================== */

function buildEmployees(units: Unit[]): Employee[] {
  const employees: Employee[] = [];

  units.forEach((unit, unitIndex) => {
    const seed = UNIT_SEEDS[unitIndex];
    const rng = createRng(`emp::${seed.seedSalt}`);
    const supervisors: string[] = [];

    // Safety head is always employee #1 of the unit
    const headId = `EMP-${seed.code}-0001`;
    employees.push({
      id: headId,
      employeeCode: `${seed.code}0001`,
      name: seed.safetyHead,
      unitId: unit.id,
      department: 'Safety',
      designation: 'Unit Safety Head',
      grade: 'A',
      dateOfJoining: `${2012 + unitIndex}-0${rng.int(1, 9)}-1${rng.int(0, 9)}`,
      status: 'Active',
      supervisorId: null,
      email: `${seed.safetyHead.split(' ')[0].toLowerCase()}@milltech.example`,
      phone: `+91 98${rng.int(10000000, 99999999)}`,
      shift: 'General',
    });
    supervisors.push(headId);

    // Shift supervisors give the units their supervision backbone
    const supervisorCount = Math.max(2, Math.round(seed.headcount / 45));
    for (let i = 0; i < supervisorCount; i += 1) {
      const id = `EMP-${seed.code}-${String(i + 2).padStart(4, '0')}`;
      const name = `${rng.pick(SAFETY_OFFICER_NAMES)}`;
      const dept = rng.pick(seed.departments.filter((d) => d !== 'Safety'));
      employees.push({
        id,
        employeeCode: `${seed.code}${String(i + 2).padStart(4, '0')}`,
        name,
        unitId: unit.id,
        department: dept,
        designation: 'Shift Supervisor',
        grade: 'B',
        dateOfJoining: `${2015 + (i % 8)}-0${rng.int(1, 9)}-1${rng.int(0, 9)}`,
        status: 'Active',
        supervisorId: headId,
        email: `${name.split(' ')[1].toLowerCase()}${i}@milltech.example`,
        phone: `+91 97${rng.int(10000000, 99999999)}`,
        shift: SHIFTS[i % 3],
      });
      supervisors.push(id);
    }

    for (let n = supervisors.length + 1; n <= seed.headcount; n += 1) {
      const dept = rng.pick(seed.departments);
      const designations = DESIGNATIONS_BY_DEPT[dept] ?? ['Helper'];
      const grade = rng.weighted<(typeof EMPLOYEE_GRADES)[number]>([
        ['A', 0.03], ['B', 0.12], ['C', 0.35], ['D', 0.32], ['E', 0.16], ['F', 0.02],
      ]);
      const status = rng.weighted<Employee['status']>([
        ['Active', 0.86], ['On Probation', 0.06], ['Contract', 0.06], ['Notice Period', 0.02],
      ]);
      const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
      const code = `${seed.code}${String(n).padStart(4, '0')}`;
      employees.push({
        id: `EMP-${seed.code}-${String(n).padStart(4, '0')}`,
        employeeCode: code,
        name,
        unitId: unit.id,
        department: dept,
        designation: rng.pick(designations),
        grade,
        dateOfJoining: `${rng.int(2012, 2026)}-0${rng.int(1, 9)}-1${rng.int(0, 9)}`,
        status,
        supervisorId: rng.pick(supervisors),
        email: `${name.split(' ')[0].toLowerCase()}.${code.slice(-3)}@milltech.example`,
        phone: `+91 9${rng.int(600000000, 999999999)}`,
        shift: SHIFTS[rng.int(0, 2)],
      });
    }
  });

  return employees;
}

const EMPLOYEE_GRADES = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

/* ========================================================================== */
/*                                MAN-HOUR MODEL                              */
/* ========================================================================== */

function buildManHours(units: Unit[]): Record<string, number> {
  const manHours: Record<string, number> = {};
  units.forEach((unit, unitIndex) => {
    const seed = UNIT_SEEDS[unitIndex];
    const rng = createRng(`hours::${seed.seedSalt}`);
    MONTHS.forEach((month, mIdx) => {
      // Current month is partial (up to 29-Sep) and a monsoon/october dip is modelled.
      const monthFactor = 0.92 + mIdx * 0.018 + rng.float(-0.05, 0.05);
      const full = seed.headcount * seed.hoursPerEmployeeMonth * monthFactor;
      const hours = month === '2026-09'
        ? Math.round(full * 0.93)
        : Math.round(full);
      manHours[`${unit.id}|${month}`] = hours;
    });
  });
  return manHours;
}

/* ========================================================================== */
/*                                   INCIDENTS                                */
/* ========================================================================== */

function severityFor(type: Incident['incidentType'], rng: Rng): Incident['severity'] {
  switch (type) {
    case 'Lost Time Injury':
      return rng.weighted<Incident['severity']>([['Critical', 0.35], ['High', 0.6], ['Medium', 0.05]]);
    case 'Medical Treatment':
      return rng.weighted<Incident['severity']>([['High', 0.45], ['Medium', 0.45], ['Low', 0.1]]);
    case 'Fire Incident':
      return rng.weighted<Incident['severity']>([['High', 0.4], ['Critical', 0.2], ['Medium', 0.4]]);
    case 'Property Damage':
      return rng.weighted<Incident['severity']>([['Medium', 0.5], ['High', 0.3], ['Low', 0.2]]);
    case 'First Aid':
      return rng.weighted<Incident['severity']>([['Low', 0.65], ['Medium', 0.35]]);
    case 'Near Miss':
    case 'Unsafe Act':
    case 'Unsafe Condition':
      return rng.weighted<Incident['severity']>([['Low', 0.55], ['Medium', 0.4], ['High', 0.05]]);
    default:
      return 'Low';
  }
}

function lostDaysFor(severity: Incident['severity'], type: Incident['incidentType'], rng: Rng): number {
  if (type !== 'Lost Time Injury') return 0;
  return severity === 'Critical' ? rng.int(28, 96) : severity === 'High' ? rng.int(9, 30) : rng.int(1, 9);
}

function buildIncidents(units: Unit[], employees: Employee[]): Incident[] {
  const incidents: Incident[] = [];
  let counter = 1000;

  const push = (
    unit: Unit,
    seed: UnitSeed,
    unitEmployees: Employee[],
    rng: Rng,
    type: Incident['incidentType'],
    date: Date,
  ) => {
    const reported = unitEmployees[rng.int(0, unitEmployees.length - 1)];
    if (date.getTime() > DEMO_TODAY.getTime()) date.setTime(DEMO_TODAY.getTime() - DAY_MS);
    const severity = severityFor(type, rng);
    const status = statusForIncident(date, severity, type, rng);
    const investigationStatus = investigationStatusFor(status, rng);
    const lostDays = lostDaysFor(severity, type, rng);
    counter += 1;
    incidents.push({
      id: `INC-${counter}`,
      incidentNo: `INC-2026-${counter}`,
      unitId: unit.id,
      department: reported.department,
      date: iso(date),
      reportedDate: iso(new Date(date.getTime() + rng.int(0, 2) * DAY_MS)),
      time: SHIFT_TIMES[rng.weighted<(typeof SHIFTS)[number]>([['A', 0.35], ['B', 0.3], ['C', 0.25], ['General', 0.1]])],
      location: rng.pick(seed.riskAreas),
      area: `${rng.pick(['Bay', 'Line', 'Zone', 'Section'])} ${rng.int(1, 9)}`,
      incidentType: type,
      severity,
      description: rng.pick(INCIDENT_NARRATIVE[type]),
      immediateAction: rng.pick([
        'Area barricaded, first aid administered and the supervisor informed.',
        'Machine stopped, LOTO applied and the shift engineer notified.',
        'Incident reported to the safety desk and the area was made safe.',
        'Affected person moved to the medical centre; scene preserved for investigation.',
        'Supervisory corrective action taken at the spot before the shift continued.',
      ]),
      rootCause: investigationStatus === 'Closed' || investigationStatus === 'Under Review'
        ? rng.pick(ROOT_CAUSES)
        : '',
      injuryPart: type === 'First Aid' || type === 'Medical Treatment' || type === 'Lost Time Injury'
        ? rng.pick(INJURY_PARTS)
        : null,
      lostDays,
      reportedById: reported.id,
      reportedByName: reported.name,
      investigationStatus,
      correctiveActionId: null,
      status,
      workShift: reported.shift,
    });
  };

  units.forEach((unit, unitIndex) => {
    const seed = UNIT_SEEDS[unitIndex];
    const rng = createRng(`inc::${seed.seedSalt}`);
    const unitEmployees = employees.filter((e) => e.unitId === unit.id);

    // Routine register — distributed across the nine months with a mild upward trend.
    const weights = MONTHS.map((_, i) => 0.85 + i * 0.045 + rng.float(-0.12, 0.12));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const routine: [Incident['incidentType'], number][] = [
      ['First Aid', 0.36],
      ['Medical Treatment', 0.075],
      ['Unsafe Act', 0.16 + seed.actBias * 0.07],
      ['Unsafe Condition', 0.15],
      ['Property Damage', 0.055],
      ['Near Miss', 0.2],
    ];

    MONTHS.forEach((month) => {
      const count = Math.round((seed.volumes.incidents * weights[MONTHS.indexOf(month)]) / totalWeight);
      for (let i = 0; i < count; i += 1) {
        push(unit, seed, unitEmployees, rng, rng.weighted(routine), dateInMonth(rng, month));
      }
    });

    // Serious events are injected deterministically so the configured annual
    // lost-time / fire budget is always honoured exactly.
    const seriousRng = createRng(`serious::${seed.seedSalt}`);
    const slots = MONTHS.map((_, i) => i);
    for (let i = 0; i < seed.volumes.lostTime; i += 1) {
      const month = MONTHS[slots.splice(seriousRng.int(0, slots.length - 1), 1)[0]];
      push(unit, seed, unitEmployees, seriousRng, 'Lost Time Injury', dateInMonth(seriousRng, month));
    }
    for (let i = 0; i < seed.volumes.fire; i += 1) {
      const month = MONTHS[slots.splice(seriousRng.int(0, slots.length - 1), 1)[0]];
      push(unit, seed, unitEmployees, seriousRng, 'Fire Incident', dateInMonth(seriousRng, month));
    }
  });

  return incidents.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function statusForIncident(
  date: Date,
  severity: Incident['severity'],
  type: Incident['incidentType'],
  rng: Rng,
): RecordStatus {
  const ageDays = Math.round((DEMO_TODAY.getTime() - date.getTime()) / DAY_MS);
  const serious = severity === 'Critical' || severity === 'High' || type === 'Lost Time Injury';

  if (serious) {
    if (ageDays < 14) return rng.weighted<RecordStatus>([['In Progress', 0.55], ['Open', 0.3], ['Pending Approval', 0.15]]);
    if (ageDays < 45) return rng.weighted<RecordStatus>([['Closed', 0.5], ['In Progress', 0.35], ['Open', 0.15]]);
    return rng.weighted<RecordStatus>([['Closed', 0.92], ['Pending Approval', 0.08]]);
  }
  if (ageDays < 21) return rng.weighted<RecordStatus>([['Open', 0.4], ['In Progress', 0.35], ['Closed', 0.25]]);
  if (ageDays < 60) return rng.weighted<RecordStatus>([['Closed', 0.78], ['In Progress', 0.14], ['Pending Approval', 0.08]]);
  return 'Closed';
}

function investigationStatusFor(status: RecordStatus, rng: Rng): Incident['investigationStatus'] {
  if (status === 'Closed') return rng.bool(0.92) ? 'Closed' : 'Under Review';
  return rng.weighted<Incident['investigationStatus']>([
    ['In Progress', 0.45], ['Not Started', 0.3], ['Under Review', 0.25],
  ]);
}

/* ========================================================================== */
/*                                  NEAR MISSES                               */
/* ========================================================================== */

function buildNearMisses(units: Unit[], employees: Employee[]): NearMiss[] {
  const nearMisses: NearMiss[] = [];
  let counter = 2000;

  units.forEach((unit, unitIndex) => {
    const seed = UNIT_SEEDS[unitIndex];
    const rng = createRng(`nm::${seed.seedSalt}`);
    const unitEmployees = employees.filter((e) => e.unitId === unit.id);
    const weights = MONTHS.map((_, i) => 0.8 + i * 0.06 + rng.float(-0.15, 0.15));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    MONTHS.forEach((month, mIdx) => {
      const count = Math.round((seed.volumes.nearMisses * weights[mIdx]) / totalWeight);
      for (let i = 0; i < count; i += 1) {
        const reporter = unitEmployees[rng.int(0, unitEmployees.length - 1)];
        const date = dateInMonth(rng, month);
        if (date.getTime() > DEMO_TODAY.getTime()) date.setTime(DEMO_TODAY.getTime() - DAY_MS);
        const ageDays = Math.round((DEMO_TODAY.getTime() - date.getTime()) / DAY_MS);
        const category = pickNearMissCategory(seed, rng);
        const riskLevel = rng.weighted<NearMiss['riskLevel']>([['High', 0.26], ['Medium', 0.45], ['Low', 0.29]]);
        const actionStatus = nearMissStatus(ageDays, riskLevel, rng);
        const id = `NM-${++counter}`;

        nearMisses.push({
          id,
          nearMissNo: `NM-2026-${counter}`,
          unitId: unit.id,
          department: reporter.department,
          date: iso(date),
          location: rng.pick(seed.riskAreas),
          category,
          description: rng.pick(NEAR_MISS_NARRATIVE[category]),
          potentialConsequence: rng.pick([
            'Fracture or amputation of a limb.',
            'Electrocution or arc-flash burns.',
            'Third-degree burns or asphyxiation.',
            'Crush injury to the torso or lower limbs.',
            'Head injury or fatality.',
            'Long-term occupational illness.',
          ]),
          riskLevel,
          reportedByName: reporter.name,
          reportedById: reporter.id,
          actionTaken: actionStatus === 'Open' || actionStatus === 'Under Analysis'
            ? 'Reported on the near-miss board; analysis pending.'
            : rng.pick([
              'Barrier re-painted and the aisle re-marked the same day.',
              'Interlock bypass register opened and the bypass removed.',
              'PPE issued to all affected workers and re-briefed.',
              'Chemical re-labelled and secondary containment installed.',
              'Racking height limit reduced to two and bays marked.',
            ]),
          actionStatus,
          linkedIncidentId: null,
        });
      }
    });
  });

  return nearMisses.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function pickNearMissCategory(seed: UnitSeed, rng: Rng): NearMiss['category'] {
  const boosted = new Set<NearMiss['category']>();
  if (seed.code === 'RMU') ['Electrical', 'Working at Height', 'Fire'].forEach((c) => boosted.add(c as NearMiss['category']));
  if (seed.code === 'RTL-S') ['Material Handling', 'Ergonomics', 'PPE'].forEach((c) => boosted.add(c as NearMiss['category']));
  if (seed.code === 'SVSM') ['Housekeeping', 'Ergonomics', 'Fire'].forEach((c) => boosted.add(c as NearMiss['category']));
  if (seed.code === 'RMF') ['Material Handling', 'Machine Safety', 'Chemical'].forEach((c) => boosted.add(c as NearMiss['category']));
  if (seed.code === 'SAN') ['Material Handling', 'Machine Safety', 'Housekeeping'].forEach((c) => boosted.add(c as NearMiss['category']));
  if (seed.code === 'SRS') ['Machine Safety', 'Ergonomics', 'PPE'].forEach((c) => boosted.add(c as NearMiss['category']));
  if (seed.code === 'RML' || seed.code === 'RST') ['Machine Safety', 'Ergonomics', 'Housekeeping'].forEach((c) => boosted.add(c as NearMiss['category']));

  const weights: [NearMiss['category'], number][] = NEAR_MISS_CATEGORIES.map((c) => [c, boosted.has(c) ? 0.9 : 0.35]);
  return rng.weighted(weights);
}

function nearMissStatus(ageDays: number, risk: NearMiss['riskLevel'], rng: Rng): NearMiss['actionStatus'] {
  if (risk === 'High') {
    if (ageDays < 20) return rng.weighted([['Open', 0.6], ['Under Analysis', 0.4]] as [NearMiss['actionStatus'], number][]);
    if (ageDays < 60) return rng.weighted([['Under Analysis', 0.4], ['Action Taken', 0.35], ['Closed', 0.25]] as [NearMiss['actionStatus'], number][]);
    return rng.weighted([['Closed', 0.8], ['Action Taken', 0.2]] as [NearMiss['actionStatus'], number][]);
  }
  if (ageDays < 30) return rng.weighted([['Open', 0.4], ['Action Taken', 0.4], ['Under Analysis', 0.2]] as [NearMiss['actionStatus'], number][]);
  if (ageDays < 75) return rng.weighted([['Closed', 0.55], ['Action Taken', 0.3], ['Open', 0.15]] as [NearMiss['actionStatus'], number][]);
  return rng.weighted([['Closed', 0.9], ['Action Taken', 0.1]] as [NearMiss['actionStatus'], number][]);
}

/* ========================================================================== */
/*                              SAFETY OBSERVATIONS                           */
/* ========================================================================== */

function buildObservations(units: Unit[]): SafetyObservation[] {
  const observations: SafetyObservation[] = [];
  let counter = 3000;

  units.forEach((unit, unitIndex) => {
    const seed = UNIT_SEEDS[unitIndex];
    const rng = createRng(`obs::${seed.seedSalt}`);
    const weights = MONTHS.map((_, i) => 0.9 + i * 0.04 + rng.float(-0.12, 0.12));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    MONTHS.forEach((month, mIdx) => {
      const count = Math.max(1, Math.round((seed.volumes.observations * weights[mIdx]) / totalWeight));
      for (let i = 0; i < count; i += 1) {
        const observer = SAFETY_OFFICER_NAMES[rng.int(0, SAFETY_OFFICER_NAMES.length - 1)];
        const date = dateInMonth(rng, month);
        if (date.getTime() > DEMO_TODAY.getTime()) date.setTime(DEMO_TODAY.getTime() - DAY_MS);
        const ageDays = Math.round((DEMO_TODAY.getTime() - date.getTime()) / DAY_MS);
        const isPositive = rng.bool(0.22);
        const type: SafetyObservation['type'] = isPositive
          ? 'Positive Observation'
          : rng.bool(seed.actBias) ? 'Unsafe Act' : 'Unsafe Condition';
        const category = pickNearMissCategory(seed, rng);
        const riskLevel = isPositive
          ? 'Low'
          : rng.weighted<NearMiss['riskLevel']>([['High', 0.18], ['Medium', 0.44], ['Low', 0.38]]);
        const status: SafetyObservation['status'] = isPositive
          ? 'Closed'
          : ageDays < 25
            ? rng.weighted([['Open', 0.55], ['In Progress', 0.45]] as [SafetyObservation['status'], number][])
            : rng.weighted([['Closed', 0.82], ['In Progress', 0.12], ['Open', 0.06]] as [SafetyObservation['status'], number][]);

        observations.push({
          id: `OBS-${++counter}`,
          observationNo: `OBS-2026-${counter}`,
          unitId: unit.id,
          department: rng.pick(seed.departments),
          date: iso(date),
          observerName: observer,
          location: rng.pick(seed.riskAreas),
          type,
          category,
          description: buildObservationText(type, category, rng),
          riskLevel,
          correctiveActionId: null,
          status,
          closedDate: status === 'Closed' ? shiftDate(iso(date), rng.int(2, 21)) : null,
        });
      }
    });
  });

  return observations.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function buildObservationText(
  type: SafetyObservation['type'],
  category: SafetyObservation['category'],
  rng: Rng,
): string {
  if (type === 'Positive Observation') {
    return rng.pick([
      'Good practice observed: pre-shift guard integrity check completed and signed by the shift supervisor.',
      'Positive observation: control room operator maintaining a clean, well-marked log book without gaps.',
      'Good practice observed: 100% PPE compliance during a surprise floor audit at the section entrance.',
      'Positive observation: segregated walkway marked and enforced in the dispatch yard.',
      'Good practice observed: permit-to-work system followed diligently for the electrical maintenance job.',
    ]);
  }
  const prefix = type === 'Unsafe Act' ? 'Unsafe act observed' : 'Unsafe condition observed';
  return `${prefix} — ${NEAR_MISS_NARRATIVE[category][rng.int(0, NEAR_MISS_NARRATIVE[category].length - 1)].charAt(0).toLowerCase()}${NEAR_MISS_NARRATIVE[category][rng.int(0, NEAR_MISS_NARRATIVE[category].length - 1)].slice(1)}.`;
}

/* ========================================================================== */
/*                                CORRECTIVE ACTIONS                          */
/* ========================================================================== */

interface CapaSource {
  unitId: string;
  department: string;
  source: CorrectiveAction['source'];
  sourceRef: string;
  finding: string;
  rootCause: string;
  raisedDate: string;
  severity: 'High' | 'Medium' | 'Low';
}

function buildCorrectiveActions(sources: CapaSource[], employees: Employee[]): CorrectiveAction[] {
  const actions: CorrectiveAction[] = [];
  let counter = 4000;

  sources.forEach((s) => {
    const rng = createRng(`capa::${s.sourceRef}`);
    const unitEmployees = employees.filter((e) => e.unitId === s.unitId);
    const supervisors = unitEmployees.filter((e) => e.grade === 'A' || e.grade === 'B' || e.department === 'Maintenance');
    const responsible = supervisors.length ? rng.pick(supervisors) : unitEmployees[0];
    const actionId = `CAPA-${++counter}`;

    const targetDays = s.severity === 'High' ? rng.int(10, 25) : s.severity === 'Medium' ? rng.int(18, 50) : rng.int(30, 75);
    const dueDate = shiftDate(s.raisedDate, targetDays);
    const todayTime = DEMO_TODAY.getTime();
    const isPastDue = new Date(`${dueDate}T00:00:00`).getTime() < todayTime;

    // Most actions are closed on time. A minority slip past the target date and
    // are then explicitly flagged Overdue, which is what drives the CAPA alerts.
    let status: CorrectiveAction['status'];
    if (isPastDue) {
      status = s.severity === 'High'
        ? rng.weighted<CorrectiveAction['status']>([['Completed', 0.71], ['Overdue', 0.15], ['In Progress', 0.09], ['Open', 0.05]])
        : rng.weighted<CorrectiveAction['status']>([['Completed', 0.82], ['Overdue', 0.07], ['In Progress', 0.06], ['Open', 0.05]]);
    } else {
      status = rng.weighted<CorrectiveAction['status']>([['Open', 0.34], ['In Progress', 0.44], ['Completed', 0.22]]);
    }
    // A "Completed" action is always dated on or before its target.
    const completedDate = status === 'Completed'
      ? shiftDate(s.raisedDate, Math.max(1, Math.round(targetDays * rng.float(0.45, 0.95))))
      : null;
    const verificationStatus: CorrectiveAction['verificationStatus'] = status !== 'Completed'
      ? 'Pending Verification'
      : rng.weighted<CorrectiveAction['verificationStatus']>([['Verified', 0.82], ['Rejected', 0.1], ['Pending Verification', 0.08]]);

    actions.push({
      id: actionId,
      actionNo: `CAPA-2026-${counter}`,
      unitId: s.unitId,
      department: s.department,
      finding: s.finding,
      source: s.source,
      sourceRef: s.sourceRef,
      raisedDate: s.raisedDate,
      dueDate,
      responsiblePerson: responsible.name,
      responsibleId: responsible.id,
      priority: s.severity,
      status,
      completedDate,
      verificationStatus,
      effectiveness: status === 'Completed' && verificationStatus === 'Verified'
        ? rng.weighted<CorrectiveAction['effectiveness']>([['Effective', 0.85], ['Partially Effective', 0.15], [null, 0]])
        : null,
      rootCause: s.rootCause,
      targetDate: dueDate,
      cost: s.severity === 'High' ? rng.int(25, 180) * 1000 : s.severity === 'Medium' ? rng.int(8, 60) * 1000 : rng.int(2, 22) * 1000,
      notes: status === 'Overdue'
        ? 'Escalated to the unit safety head; revised closure plan under review.'
        : status === 'Completed'
          ? 'Closed and verified during the effectiveness audit.'
          : 'Work in progress as per the agreed action plan.',
    });
  });

  return actions.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
}

function collectCapaSources(
  incidents: Incident[],
  nearMisses: NearMiss[],
  observations: SafetyObservation[],
  inspections: SafetyInspection[],
): CapaSource[] {
  const sources: CapaSource[] = [];

  // 1. Every recordable / serious incident gets an action. A Critical incident
  //    also gets a second, systemic action (engineering control, not just repair).
  incidents.forEach((inc) => {
    const recordable = inc.incidentType === 'Lost Time Injury' || inc.incidentType === 'Medical Treatment';
    const serious = inc.severity === 'Critical' || inc.severity === 'High';
    const propertyEvent = inc.incidentType === 'Property Damage' || inc.incidentType === 'Fire Incident';
    if (!recordable && !serious && !propertyEvent) return;

    const primary: CapaSource = {
      unitId: inc.unitId,
      department: inc.department,
      source: 'Incident',
      sourceRef: inc.incidentNo,
      finding: CAPA_FINDINGS.Incident[hashIndex(inc.id) % CAPA_FINDINGS.Incident.length],
      rootCause: inc.rootCause || 'Root cause analysis pending',
      raisedDate: shiftDate(inc.reportedDate, 3),
      severity: inc.severity === 'Critical' || inc.severity === 'High' ? 'High' : inc.severity === 'Medium' ? 'Medium' : 'Low',
    };
    sources.push(primary);

    if (inc.severity === 'Critical') {
      sources.push({
        ...primary,
        sourceRef: `${inc.incidentNo}-S`,
        finding: CAPA_FINDINGS.Audit[hashIndex(`${inc.id}-s`) % CAPA_FINDINGS.Audit.length],
        rootCause: 'Systemic control weakness identified across similar installations',
        raisedDate: shiftDate(inc.reportedDate, 10),
        severity: 'High',
      });
    }
  });

  // 2. High and medium potential near misses that are still open.
  nearMisses
    .filter((n) => n.riskLevel !== 'Low' && n.actionStatus !== 'Closed')
    .forEach((n) => {
      sources.push({
        unitId: n.unitId,
        department: n.department,
        source: 'Near Miss',
        sourceRef: n.nearMissNo,
        finding: CAPA_FINDINGS['Near Miss'][hashIndex(n.id) % CAPA_FINDINGS['Near Miss'].length],
        rootCause: 'Hazard not adequately controlled at source',
        raisedDate: shiftDate(n.date, 2),
        severity: n.riskLevel === 'High' ? 'High' : 'Medium',
      });
    });

  // 3. Unclosed adverse safety observations (positive observations are excluded).
  observations
    .filter((o) => o.type !== 'Positive Observation' && o.status !== 'Closed')
    .forEach((o) => {
      sources.push({
        unitId: o.unitId,
        department: o.department,
        source: 'Safety Observation',
        sourceRef: o.observationNo,
        finding: CAPA_FINDINGS['Safety Observation'][hashIndex(o.id) % CAPA_FINDINGS['Safety Observation'].length],
        rootCause: o.type === 'Unsafe Act'
          ? 'Unsafe behaviour not corrected at the point of work'
          : 'Physical hazard not engineered out',
        raisedDate: shiftDate(o.date, 1),
        severity: o.riskLevel === 'High' ? 'High' : o.riskLevel === 'Medium' ? 'Medium' : 'Low',
      });
    });

  // 4. Inspections that produced a critical finding, failed, or had major findings.
  inspections
    .filter((ins) => ins.criticalFindings > 0 || ins.status === 'Failed' || ins.majorFindings >= 3)
    .forEach((ins) => {
      sources.push({
        unitId: ins.unitId,
        department: ins.department,
        source: 'Inspection',
        sourceRef: ins.inspectionNo,
        finding: CAPA_FINDINGS.Inspection[hashIndex(ins.id) % CAPA_FINDINGS.Inspection.length],
        rootCause: 'Systematic control weakness identified during the inspection',
        raisedDate: shiftDate(ins.date ?? ins.scheduledDate, 4),
        severity: ins.criticalFindings > 0 ? 'High' : 'Medium',
      });
    });

  // Deduplicate: one action per (source, ref) pair.
  const seen = new Set<string>();
  return sources.filter((s) => {
    const key = `${s.source}::${s.sourceRef}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hashIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/* ========================================================================== */
/*                                   TRAINING                                 */
/* ========================================================================== */

function buildTrainings(): Training[] {
  return TRAINING_LIBRARY.map((t, i) => ({
    id: `TRN-${String(i + 1).padStart(2, '0')}`,
    code: t.code,
    title: t.title,
    category: t.category,
    durationHours: t.durationHours,
    validityMonths: t.validityMonths,
    mode: t.mode,
    mandatory: t.mandatory,
    trainer: t.trainer,
    passMark: t.passMark,
  }));
}

function buildTrainingRecords(
  trainings: Training[],
  employees: Employee[],
  units: Unit[],
): TrainingRecord[] {
  const records: TrainingRecord[] = [];
  let counter = 5000;

  units.forEach((unit, unitIndex) => {
    const seed = UNIT_SEEDS[unitIndex];
    const unitEmployees = employees.filter((e) => e.unitId === unit.id);

    trainings.forEach((training) => {
      const rng = createRng(`trn::${seed.seedSalt}::${training.code}`);
      const factor = TRAINING_CATEGORY_FACTOR[training.category];
      const effective = Math.min(0.995, seed.trainingBase * factor);

      unitEmployees.forEach((emp) => {
        const joined = new Date(`${emp.dateOfJoining}T00:00:00`).getTime();
        const tenureYears = (DEMO_TODAY.getTime() - joined) / (365 * DAY_MS);
        // New joiners carry a lower portfolio; contractors slightly lower again.
        const tenureFactor = tenureYears < 0.5 ? 0.84 : tenureYears < 1.5 ? 0.94 : 1;
        const statusFactor = emp.status === 'Contract' ? 0.95 : 1;
        const roll = rng.next();

        // pValid  – certification refreshed and currently inside its validity window
        // pExpired – was completed, but the validity has since lapsed
        // pPending – allocated, not yet attempted
        const pValid = Math.min(0.995, effective * tenureFactor * statusFactor);
        const pExpired = 0.018 + (1 - pValid) * 0.45;
        const pPending = 0.006 + (1 - pValid) * 0.28;
        const validityDays = Math.round(training.validityMonths * 30.4);

        if (roll < pValid) {
          // Last refresh happened somewhere between 15 days and (validity − 20) days ago.
          const window = Math.max(10, validityDays - 20);
          const daysAgo = rng.int(5, window);
          const completedDate = shiftDate(TODAY, -daysAgo);
          records.push({
            id: `TR-${++counter}`,
            trainingId: training.id,
            employeeId: emp.id,
            unitId: emp.unitId,
            assignedDate: shiftDate(completedDate, -rng.int(5, 40)),
            dueDate: shiftDate(completedDate, validityDays),
            completedDate,
            score: rng.int(training.passMark, 100),
            status: 'Completed',
            certificateNo: `CERT-${training.code}-${counter}`,
            mode: training.mode,
            trainer: training.trainer,
          });
        } else if (roll < pValid + pExpired) {
          const completedDate = shiftDate(TODAY, -(validityDays + rng.int(5, 420)));
          records.push({
            id: `TR-${++counter}`,
            trainingId: training.id,
            employeeId: emp.id,
            unitId: emp.unitId,
            assignedDate: shiftDate(completedDate, -rng.int(5, 30)),
            dueDate: shiftDate(completedDate, validityDays),
            completedDate,
            score: rng.int(training.passMark - 10, 100),
            status: 'Expired',
            certificateNo: `CERT-${training.code}-${counter}`,
            mode: training.mode,
            trainer: training.trainer,
          });
        } else if (roll < pValid + pExpired + pPending) {
          const dueDate = shiftDate(TODAY, rng.int(-12, 75));
          records.push({
            id: `TR-${++counter}`,
            trainingId: training.id,
            employeeId: emp.id,
            unitId: emp.unitId,
            assignedDate: shiftDate(TODAY, -rng.int(5, 60)),
            dueDate,
            completedDate: null,
            score: null,
            status: 'Pending',
            certificateNo: null,
            mode: training.mode,
            trainer: training.trainer,
          });
        }
        // Everything else has not been allocated a cycle yet for this employee.
      });
    });
  });

  return records;
}

/* ========================================================================== */
/*                                PPE COMPLIANCE                              */
/* ========================================================================== */

function buildPpeCompliance(units: Unit[], employees: Employee[]): PpeCompliance[] {
  const rows: PpeCompliance[] = [];
  let counter = 6000;

  units.forEach((unit, unitIndex) => {
    const seed = UNIT_SEEDS[unitIndex];
    const unitEmployees = employees.filter((e) => e.unitId === unit.id);

    unitEmployees.forEach((emp) => {
      const rng = createRng(`ppe::${emp.id}`);
      const dept = emp.department;
      // Supervisors and safety staff are always fully compliant; operators drift.
      const roleBonus = emp.grade === 'A' || emp.grade === 'B' || dept === 'Safety' ? 1.04 : 1;

      PPE_ITEMS.forEach((item) => {
        const difficulty = PPE_DIFFICULTY[item];
        const p = Math.min(0.999, seed.ppeBase * difficulty * roleBonus * rng.float(0.99, 1.008));
        // A supervisor inspection samples 3-6 workers; a floor audit samples 1-3.
        const sampleSize = emp.grade === 'A' || emp.grade === 'B' || dept === 'Safety'
          ? rng.int(4, 6)
          : emp.status === 'Contract' ? rng.int(1, 2) : rng.int(2, 4);
        let nonCompliant = 0;
        for (let k = 0; k < sampleSize; k += 1) if (!rng.bool(p)) nonCompliant += 1;
        rows.push({
          id: `PPE-${++counter}`,
          unitId: unit.id,
          department: dept,
          item,
          assessed: sampleSize,
          compliant: sampleSize - nonCompliant,
          nonCompliant,
          lastAuditDate: shiftDate(TODAY, -rng.int(2, 55)),
          auditor: rng.pick(INSPECTOR_NAMES),
          penaltyPoints: nonCompliant * 2,
          trend: rng.float(-2.4, 2.8),
        });
      });
    });
  });

  return rows;
}

/* ========================================================================== */
/*                            SAFETY INSPECTIONS                              */
/* ========================================================================== */

function buildInspections(units: Unit[], employees: Employee[]): SafetyInspection[] {
  const inspections: SafetyInspection[] = [];
  let counter = 7000;

  units.forEach((unit, unitIndex) => {
    const seed = UNIT_SEEDS[unitIndex];
    const rng = createRng(`insp::${seed.seedSalt}`);
    const unitEmployees = employees.filter((e) => e.unitId === unit.id);
    const weights = MONTHS.map((_, i) => 0.85 + i * 0.05 + rng.float(-0.15, 0.15));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    MONTHS.forEach((month, mIdx) => {
      const count = Math.max(1, Math.round((seed.volumes.inspections * weights[mIdx]) / totalWeight));
      for (let i = 0; i < count; i += 1) {
        const inspector = rng.pick(INSPECTOR_NAMES);
        const scheduled = dateInMonth(rng, month);
        if (scheduled.getTime() > DEMO_TODAY.getTime()) scheduled.setTime(DEMO_TODAY.getTime() + rng.int(1, 25) * DAY_MS);
        const future = scheduled.getTime() > DEMO_TODAY.getTime();
        const inspectorEmployee = unitEmployees.find((e) => e.name === inspector);

        const checklistTotal = rng.int(24, 46);
        const baseScore = seed.trainingBase * 0.94 + rng.float(-0.14, 0.1);
        const score = future ? null : Math.max(38, Math.min(100, Math.round(baseScore * 100)));
        const criticalFindings = future ? 0 : score !== null && score < 70 ? rng.int(1, 3) : rng.bool(0.12) ? 1 : 0;
        const majorFindings = future ? 0 : rng.int(0, criticalFindings ? 5 : 3);
        const minorFindings = future ? 0 : rng.int(1, 6);
        const checklistCompleted = future ? 0 : checklistTotal;

        let status: SafetyInspection['status'];
        let result: SafetyInspection['result'];
        if (future) {
          status = 'Scheduled';
          result = 'Not Conducted';
        } else if (score === null) {
          status = 'Pending';
          result = 'Not Conducted';
        } else if (score < 65 || criticalFindings > 0) {
          status = 'Failed';
          result = 'Fail';
        } else if (score < 85) {
          status = 'Completed';
          result = 'Conditional Pass';
        } else {
          status = 'Completed';
          result = 'Pass';
        }

        const id = `INS-${++counter}`;
        inspections.push({
          id,
          inspectionNo: `INS-2026-${counter}`,
          unitId: unit.id,
          department: rng.pick(seed.departments),
          category: rng.pick(INSPECTION_CATEGORIES),
          area: rng.pick(seed.riskAreas),
          inspectorName: inspector,
          inspectorId: inspectorEmployee?.id ?? 'EMP-CORP-0001',
          scheduledDate: iso(scheduled),
          date: future ? null : iso(scheduled),
          score,
          maxScore: 100,
          criticalFindings,
          majorFindings,
          minorFindings,
          status,
          result,
          findings: future
            ? 'Inspection scheduled — checklist not yet executed.'
            : buildInspectionFindings(rng, criticalFindings, majorFindings, minorFindings, result),
          checklistCompleted,
          checklistTotal,
          nextDueDate: shiftDate(iso(scheduled), rng.int(30, 75)),
        });
      }
    });
  });

  return inspections.sort((a, b) => (a.scheduledDate < b.scheduledDate ? 1 : -1));
}

/** Forward-dated inspection plan (Oct–Dec 2026) so the "pending" queue is real. */
function buildScheduledInspections(units: Unit[]): SafetyInspection[] {
  const rows: SafetyInspection[] = [];
  let counter = 7900;

  units.forEach((unit, unitIndex) => {
    const seed = UNIT_SEEDS[unitIndex];
    const rng = createRng(`sched::${seed.seedSalt}`);
    const count = rng.int(2, 3);
    const FUTURE_MONTHS = ['2026-10', '2026-11', '2026-12'];

    for (let i = 0; i < count; i += 1) {
      const [y, m] = FUTURE_MONTHS[i].split('-').map(Number);
      const date = new Date(y, m - 1, rng.int(1, 28));
      const category = INSPECTION_CATEGORIES[(rng.int(0, INSPECTION_CATEGORIES.length - 1) + i) % INSPECTION_CATEGORIES.length];
      const inspector = INSPECTOR_NAMES[(rng.int(0, INSPECTOR_NAMES.length - 1) + i) % INSPECTOR_NAMES.length];
      const checklistTotal = rng.int(24, 46);
      counter += 1;

      rows.push({
        id: `INS-${counter}`,
        inspectionNo: `INS-2026-${counter}`,
        unitId: unit.id,
        department: rng.pick(seed.departments),
        category,
        area: rng.pick(seed.riskAreas),
        inspectorName: inspector,
        inspectorId: 'EMP-CORP-0001',
        scheduledDate: iso(date),
        date: null,
        score: null,
        maxScore: 100,
        criticalFindings: 0,
        majorFindings: 0,
        minorFindings: 0,
        status: 'Scheduled',
        result: 'Not Conducted',
        findings: `Scheduled ${category.toLowerCase()} inspection of ${rng.pick(seed.riskAreas)}. Checklist of ${checklistTotal} checkpoints to be executed by ${inspector}.`,
        checklistCompleted: 0,
        checklistTotal,
        nextDueDate: shiftDate(iso(date), 90),
      });
    }
  });

  return rows;
}

function buildInspectionFindings(
  rng: Rng,
  critical: number,
  major: number,
  minor: number,
  result: SafetyInspection['result'],
): string {
  if (critical > 0) {
    return `${critical} critical finding(s): ${rng.pick([
      'Interlock defeated on a production machine and the bypass register was not updated.',
      'Emergency exit route found locked during working hours.',
      'Exposed live termination inside a panel without an insulation barrier.',
      'Fire-fighting access to the hydrant obstructed by stacked material.',
    ])}. ${major} major and ${minor} minor observation(s) also recorded.`;
  }
  if (result === 'Conditional Pass') {
    return `No critical findings. ${major} major observation(s) on housekeeping, illumination and signage; ${minor} minor observation(s) on labelling and record-keeping.`;
  }
  if (result === 'Pass') {
    return `No critical or major findings. ${minor} minor observation(s) recorded; overall control effectiveness found satisfactory.`;
  }
  return 'Inspection not conducted on the scheduled date; re-inspection required.';
}

/* ========================================================================== */
/*                            EMERGENCY / FIRE SAFETY                         */
/* ========================================================================== */

function buildDrills(units: Unit[]): EmergencyDrill[] {
  const drills: EmergencyDrill[] = [];
  let counter = 8000;

  units.forEach((unit, unitIndex) => {
    const seed = UNIT_SEEDS[unitIndex];
    const rng = createRng(`drill::${seed.seedSalt}`);
    const headcount = seed.headcount;
    const total = Math.max(2, Math.floor(MONTHS.length / 3));
    const step = MONTHS.length / total;

    for (let i = 0; i < total; i += 1) {
      const monthIdx = Math.min(MONTHS.length - 1, Math.floor(i * step + rng.float(0, 1)));
      const month = MONTHS[monthIdx];
      const type: EmergencyDrill['type'] = i === 0 ? 'Fire Drill' : rng.pick(['Fire Drill', 'Evacuation Drill', 'Emergency Drill', 'Mock Drill'] as const);
      const date = dateInMonth(rng, month);
      const isFuture = date.getTime() > DEMO_TODAY.getTime();
      const targetTimeSec = rng.int(180, 300);
      const evacuation = Math.round(targetTimeSec * rng.float(0.62, 1.28));
      const participants = isFuture ? 0 : Math.round(headcount * rng.float(0.82, 0.98));
      const id = `DRL-${++counter}`;

      drills.push({
        id,
        drillNo: `DRL-2026-${counter}`,
        unitId: unit.id,
        type,
        date: iso(isFuture ? new Date(DEMO_TODAY.getTime() + DAY_MS * rng.int(3, 26)) : date),
        startTime: SHIFT_TIMES[rng.pick(SHIFTS)],
        evacuationTimeSec: isFuture ? 0 : evacuation,
        targetTimeSec,
        participants,
        totalEmployees: headcount,
        wardenName: WARDEN_NAMES[unitIndex],
        assemblyPoint: `Assembly Point ${rng.pick(['A', 'B', 'C'])} – ${rng.pick(['North Yard', 'Sports Ground', 'Main Gate', 'Parking Area'])}`,
        status: isFuture ? 'Scheduled' : 'Completed',
        result: isFuture ? 'Upcoming' : evacuation <= targetTimeSec ? 'Satisfactory' : evacuation <= targetTimeSec * 1.15 ? 'Satisfactory with Remarks' : 'Unsatisfactory',
        remarks: isFuture
          ? 'Scheduled drill — invitees and wardens notified through the LMS calendar.'
          : evacuation <= targetTimeSec
            ? 'Evacuation completed within the target time; all wardens reported.'
            : 'Evacuation exceeded the target time; bottleneck observed at the Bay-1 exit. Remedial action raised.',
      });
    }

    // Every unit keeps a forward-dated drill on the calendar.
    const nextRng = createRng(`nextdrill::${seed.seedSalt}`);
    const nextDate = new Date(DEMO_TODAY.getTime() + DAY_MS * nextRng.int(4, 52));
    const target = nextRng.int(180, 300);
    counter += 1;
    drills.push({
      id: `DRL-${counter}`,
      drillNo: `DRL-2026-${counter}`,
      unitId: unit.id,
      type: nextRng.pick(['Fire Drill', 'Evacuation Drill', 'Emergency Drill'] as const),
      date: iso(nextDate),
      startTime: SHIFT_TIMES[nextRng.pick(SHIFTS)],
      evacuationTimeSec: 0,
      targetTimeSec: target,
      participants: 0,
      totalEmployees: headcount,
      wardenName: WARDEN_NAMES[unitIndex],
      assemblyPoint: `Assembly Point ${nextRng.pick(['A', 'B', 'C'])} – ${nextRng.pick(['North Yard', 'Sports Ground', 'Main Gate'])}`,
      status: 'Scheduled',
      result: 'Upcoming',
      remarks: 'Next scheduled drill. Participation roster and warden brief circulated to all shifts.',
    });
  });

  return drills.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function buildEmergencyAssets(units: Unit[]): EmergencyAsset[] {
  const assets: EmergencyAsset[] = [];
  let counter = 9000;

  units.forEach((unit, unitIndex) => {
    const seed = UNIT_SEEDS[unitIndex];
    const rng = createRng(`asset::${seed.seedSalt}`);
    const kinds: EmergencyAsset['kind'][] = ['Fire Extinguisher', 'Emergency Exit', 'Assembly Point', 'First Aid Kit', 'Fire Alarm', 'Emergency Light', 'Sprinkler'];
    const counts: Record<EmergencyAsset['kind'], number> = {
      'Fire Extinguisher': rng.int(24, 48),
      'Emergency Exit': rng.int(4, 9),
      'Assembly Point': rng.int(1, 3),
      'First Aid Kit': rng.int(3, 8),
      'Fire Alarm': rng.int(6, 16),
      'Emergency Light': rng.int(10, 26),
      Sprinkler: rng.int(0, 6),
    };

    kinds.forEach((kind) => {
      for (let i = 0; i < counts[kind]; i += 1) {
        // Monthly-cycle items (extinguishers, call-points) are inspected every 30
        // days, quarterly items every 90. Most are therefore still in-cycle.
        const cycle = kind === 'Fire Extinguisher' || kind === 'Fire Alarm' ? 30 : 90;
        const pastDue = rng.bool(0.11);
        const lastInspected = pastDue
          ? shiftDate(TODAY, -rng.int(cycle + 3, cycle + 75))
          : shiftDate(TODAY, -rng.int(3, cycle - 4));
        const nextInspection = shiftDate(lastInspected, cycle);
        const overdue = new Date(`${nextInspection}T00:00:00`) < new Date(`${TODAY}T00:00:00`);
        const status: EmergencyAsset['status'] = overdue
          ? rng.weighted<EmergencyAsset['status']>([['Due', 0.6], ['Defective', 0.18], ['Under Repair', 0.22]])
          : rng.bool(0.03) ? 'Defective' : 'Serviceable';

        assets.push({
          id: `EA-${++counter}`,
          unitId: unit.id,
          kind,
          code: `${kind.slice(0, 3).toUpperCase()}-${seed.code}-${String(i + 1).padStart(3, '0')}`,
          location: `${rng.pick(seed.riskAreas)} – ${rng.pick(['Ground', 'Mezzanine', 'Platform', 'Yard', 'Corridor'])}`,
          lastInspected,
          nextInspection,
          status,
        });
      }
    });
  });

  return assets;
}

function buildEmergencyPlans(units: Unit[]): EmergencyPlan[] {
  return units.map((unit, i) => {
    const rng = createRng(`plan::${UNIT_SEEDS[i].seedSalt}`);
    return {
      id: `PLAN-${unit.code}`,
      unitId: unit.id,
      title: `${unit.shortName} — Emergency Response & Evacuation Plan`,
      owner: unit.safetyHeadName,
      lastMockDrill: shiftDate(TODAY, -rng.int(24, 150)),
      nextMockDrill: shiftDate(TODAY, rng.int(4, 60)),
      resourcesReadyPct: rng.int(76, 99),
      contactName: WARDEN_NAMES[i],
      contactPhone: `+91 44 ${rng.int(20000000, 89999999)}`,
    };
  });
}

/* ========================================================================== */
/*                                  REPORTS                                   */
/* ========================================================================== */

const REPORT_CATALOG: Omit<ReportDefinition, 'lastGenerated'>[] = [
  {
    key: 'MONTHLY_SAFETY', title: 'Monthly Safety Report', scope: 'Corporate',
    module: 'Corporate Safety', cadence: 'Monthly', owner: 'Head of EHS',
    description: 'Consolidated organisation-wide safety MIS covering every unit with KPI snapshot, unit comparison and recommendations.',
    sections: ['Executive summary', 'KPI snapshot', 'Unit comparison', 'Incident trend', 'CAPA status', 'Training & PPE compliance', 'Recommendations'],
  },
  {
    key: 'UNIT_SAFETY', title: 'Unit Safety Report', scope: 'Unit',
    module: 'Unit Module', cadence: 'Monthly', owner: 'Unit Safety Head',
    description: 'Single-unit safety pack with headcount, incident register, inspection scorecard, CAPA register and training status.',
    sections: ['Unit profile', 'Headcount & man-hours', 'Incident register', 'Inspection scorecard', 'CAPA register', 'Training status'],
  },
  {
    key: 'INCIDENT', title: 'Incident Report', scope: 'Corporate',
    module: 'Incident Management', cadence: 'Monthly', owner: 'Safety Analytics',
    description: 'Incident statistics with severity distribution, root cause analysis, lost time analysis and unit hotspots.',
    sections: ['Incident statistics', 'Severity distribution', 'Root cause analysis', 'Lost time analysis', 'Unit hotspots', 'Case studies'],
  },
  {
    key: 'NEAR_MISS', title: 'Near-Miss Report', scope: 'Corporate',
    module: 'Near-Miss Management', cadence: 'Monthly', owner: 'Safety Analytics',
    description: 'Near-miss reporting rate, category distribution, high-potential items and the escalations that followed.',
    sections: ['Reporting rate', 'Category distribution', 'High-potential near misses', 'Escalated incidents', 'Trend analysis'],
  },
  {
    key: 'TRAINING', title: 'Training Report', scope: 'Corporate',
    module: 'Safety Training', cadence: 'Quarterly', owner: 'Training & Development',
    description: 'Mandatory training compliance by category with expired certifications, pending nominations and a competency matrix.',
    sections: ['Training compliance', 'Category-wise completion', 'Expired certifications', 'Pending nominations', 'Competency matrix'],
  },
  {
    key: 'INSPECTION', title: 'Inspection Report', scope: 'Corporate',
    module: 'Safety Inspections', cadence: 'Monthly', owner: 'Safety Inspection Cell',
    description: 'Inspection schedule adherence, scorecard, findings breakdown, critical findings and the re-inspection plan.',
    sections: ['Inspection schedule', 'Scorecard', 'Findings summary', 'Critical findings', 'Re-inspection plan'],
  },
  {
    key: 'CAPA', title: 'CAPA Report', scope: 'Corporate',
    module: 'Corrective & Preventive Actions', cadence: 'Weekly', owner: 'Head of EHS',
    description: 'Corrective action ageing, overdue items, priority breakdown, root cause clusters and effectiveness verification.',
    sections: ['CAPA ageing', 'Overdue actions', 'Priority breakdown', 'Root cause clustering', 'Effectiveness verification'],
  },
  {
    key: 'PPE', title: 'PPE Compliance Report', scope: 'Corporate',
    module: 'PPE Compliance', cadence: 'Monthly', owner: 'PPE Coordinator',
    description: 'Item-wise and department-wise PPE compliance with penalty points and the agreed corrective plan.',
    sections: ['Overall compliance', 'Item-wise compliance', 'Department heat map', 'Penalty points', 'Corrective plan'],
  },
];

/* ========================================================================== */
/*                                NOTIFICATIONS                               */
/* ========================================================================== */

function buildNotifications(
  units: Unit[],
  correctiveActions: CorrectiveAction[],
  inspections: SafetyInspection[],
  trainingRecords: TrainingRecord[],
  nearMisses: NearMiss[],
  drills: EmergencyDrill[],
  emergencyAssets: EmergencyAsset[],
  ppeCompliance: PpeCompliance[],
): AppNotification[] {
  const unitById = new Map(units.map((u) => [u.id, u]));
  const out: AppNotification[] = [];
  let counter = 0;
  const push = (
    severity: AppNotification['severity'],
    title: string,
    message: string,
    unitId: string | null,
    module: AppNotification['module'],
    createdAt: string,
    link: string,
    read = false,
  ) => {
    counter += 1;
    out.push({ id: `NTF-${counter}`, severity, title, message, unitId, module, createdAt, read, link });
  };

  const overdueByUnit = new Map<string, number>();
  correctiveActions
    .filter((c) => c.status === 'Overdue')
    .forEach((c) => overdueByUnit.set(c.unitId, (overdueByUnit.get(c.unitId) ?? 0) + 1));
  const totalOverdue = [...overdueByUnit.values()].reduce((a, b) => a + b, 0);
  push('Critical', `${totalOverdue} corrective actions are overdue`,
    `Across ${overdueByUnit.size} units, ${totalOverdue} CAPA records have passed their target closure date. Immediate review required.`,
    null, 'CAPA', new Date(DEMO_TODAY.getTime() - 1 * DAY_MS).toISOString(), '/capa?status=Overdue');

  [...overdueByUnit.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .forEach(([unitId, count], idx) => {
      push('Critical', `${unitById.get(unitId)?.code} — ${count} high-priority corrective ${count === 1 ? 'action' : 'actions'} require attention`,
        `The unit safety head has been notified. Oldest open action is pending since last month.`,
        unitId, 'CAPA', new Date(DEMO_TODAY.getTime() - (idx + 1) * DAY_MS).toISOString(), `/capa?unit=${unitId}&status=Overdue`);
    });

  const pendingInspections = inspections.filter((i) => i.status === 'Pending' || i.status === 'Scheduled');
  pendingInspections.slice(0, 4).forEach((ins, idx) => {
    push(ins.status === 'Pending' ? 'Warning' : 'Information',
      `${unitById.get(ins.unitId)?.code} has a ${ins.status.toLowerCase()} safety inspection`,
      `${ins.category} inspection of ${ins.area} scheduled for ${ins.scheduledDate} by ${ins.inspectorName}.`,
      ins.unitId, 'Inspection',
      new Date(DEMO_TODAY.getTime() - idx * 7 * 3600_000).toISOString(), `/inspections?unit=${ins.unitId}`);
  });

  const expired = trainingRecords.filter((t) => t.status === 'Expired');
  push('Warning', `${expired.length} employees have expired safety training`,
    `Mandatory certifications have lapsed and require renewal scheduling before the next audit.`,
    null, 'Training', new Date(DEMO_TODAY.getTime() - 2 * DAY_MS).toISOString(), '/training?status=Expired');

  const recentNm = nearMisses.filter((n) => n.date >= '2026-09-01');
  recentNm.slice(0, 4).forEach((nm, idx) => {
    push(nm.riskLevel === 'High' ? 'Warning' : 'Information',
      `New ${nm.riskLevel.toLowerCase()}-potential near miss reported in ${unitById.get(nm.unitId)?.code}`,
      `${nm.category} — ${nm.description.slice(0, 96)}…`,
      nm.unitId, 'Near Miss', new Date(DEMO_TODAY.getTime() - idx * 5 * 3600_000).toISOString(), `/near-misses?unit=${nm.unitId}`);
  });

  const failedInspections = inspections.filter((i) => i.status === 'Failed');
  if (failedInspections.length) {
    const worst = failedInspections.sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
    push('Warning',
      `${unitById.get(worst.unitId)?.code} safety inspection failed with ${worst.criticalFindings} critical finding(s)`,
      `${worst.category} inspection of ${worst.area} scored ${worst.score}%. Immediate re-inspection required.`,
      worst.unitId, 'Inspection', new Date(DEMO_TODAY.getTime() - 4 * DAY_MS).toISOString(), '/inspections?status=Failed');
  }

  const dueAssets = emergencyAssets.filter((a) => new Date(a.nextInspection) < new Date(TODAY)).length;
  push(dueAssets > 60 ? 'Warning' : 'Information',
    `${dueAssets} emergency equipment items are past their inspection date`,
    'Fire extinguishers, emergency lights and call-points must be re-inspected and the register updated.',
    null, 'Emergency', new Date(DEMO_TODAY.getTime() - 5 * DAY_MS).toISOString(), '/emergency?tab=assets');

  const upcomingDrills = drills.filter((d) => d.status === 'Scheduled').slice(0, 3);
  upcomingDrills.forEach((drill, idx) => {
    push('Information', `Emergency drill scheduled for ${unitById.get(drill.unitId)?.code}`,
      `${drill.type} planned for ${drill.date} at ${drill.startTime}. Warden: ${drill.wardenName}.`,
      drill.unitId, 'Emergency', new Date(DEMO_TODAY.getTime() - (idx + 1) * DAY_MS).toISOString(), `/emergency?unit=${drill.unitId}`);
  });

  push('Information', 'Monthly safety MIS report is ready for review',
    'The consolidated monthly safety report for the current period has been generated and is available under Reports.',
    null, 'System', new Date(DEMO_TODAY.getTime() - 3 * DAY_MS).toISOString(), '/reports');

  push('Information', 'Quarterly EHS management review scheduled',
    'Unit-wise EHS dashboards have been compiled for the quarterly management review meeting.',
    null, 'System', new Date(DEMO_TODAY.getTime() - 6 * DAY_MS).toISOString(), '/corporate');

  const ppeBuckets = new Map<string, { unitId: string; department: string; a: number; c: number }>();
  ppeCompliance.forEach((p) => {
    const key = `${p.unitId}|${p.department}`;
    const cur = ppeBuckets.get(key) ?? { unitId: p.unitId, department: p.department, a: 0, c: 0 };
    cur.a += p.assessed;
    cur.c += p.compliant;
    ppeBuckets.set(key, cur);
  });
  const ppeWatch = [...ppeBuckets.values()]
    .map((b) => ({ ...b, compliance: b.a ? Math.round((b.c / b.a) * 1000) / 10 : 100 }))
    .filter((b) => b.a >= 40 && b.compliance < 95)
    .sort((a, b) => a.compliance - b.compliance)[0];
  if (ppeWatch) {
    push('Warning', `PPE compliance below target in ${unitById.get(ppeWatch.unitId)?.code}`,
      `${ppeWatch.department} recorded ${ppeWatch.compliance}% PPE compliance — below the 97% organisational target.`,
      ppeWatch.unitId, 'PPE', new Date(DEMO_TODAY.getTime() - 7 * DAY_MS).toISOString(), '/ppe');
  }

  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/* ========================================================================== */
/*                                   UNITS                                    */
/* ========================================================================== */

function buildUnits(): Unit[] {
  return UNIT_SEEDS.map((seed) => ({
    id: `UNIT-${seed.code}`,
    code: seed.code,
    name: seed.name,
    shortName: seed.shortName,
    description: seed.description,
    location: seed.location,
    state: seed.state,
    headcount: seed.headcount,
    departments: seed.departments,
    safetyHeadName: seed.safetyHead,
    established: seed.established,
    active: true,
  }));
}

/* ========================================================================== */
/*                                    USERS                                   */
/* ========================================================================== */

const DEMO_USERS = [
  {
    employeeId: 'EHS001', username: 'EHS001', password: 'Admin@123', name: 'Anand Krishnamurthy',
    email: 'anand.krishnamurthy@milltech.example', roleId: 'ROLE-01', unitId: null,
    designation: 'Head of EHS', avatarInitials: 'AK', phone: '+91 98400 11223',
  },
  {
    employeeId: 'EHS014', username: 'EHS014', password: 'Safety@123', name: 'V. Anantharaman',
    email: 'venkat.anantharaman@milltech.example', roleId: 'ROLE-02', unitId: 'UNIT-RML',
    designation: 'Unit Safety Head – RML', avatarInitials: 'VA', phone: '+91 98400 11224',
  },
  {
    employeeId: 'EHS027', username: 'EHS027', password: 'Officer@123', name: 'J. Sivaraman',
    email: 'siva.sivaraman@milltech.example', roleId: 'ROLE-03', unitId: 'UNIT-RMU',
    designation: 'Safety Officer – RMU', avatarInitials: 'JS', phone: '+91 98400 11225',
  },
];

/* ========================================================================== */
/*                              STATE ASSEMBLY                                */
/* ========================================================================== */

let cached: EhsState | null = null;

/** Builds the complete, deterministic demo dataset once per session. */
export function buildDemoState(): EhsState {
  if (cached) return cached;

  const units = buildUnits();
  const employees = buildEmployees(units);
  const manHours = buildManHours(units);
  const incidents = buildIncidents(units, employees);
  const nearMisses = buildNearMisses(units, employees);
  const observations = buildObservations(units);
  const inspections = [...buildInspections(units, employees), ...buildScheduledInspections(units)]
    .sort((a, b) => (a.scheduledDate < b.scheduledDate ? 1 : -1));
  const correctiveActions = buildCorrectiveActions(
    collectCapaSources(incidents, nearMisses, observations, inspections),
    employees,
  );
  const trainings = buildTrainings();
  const trainingRecords = buildTrainingRecords(trainings, employees, units);
  const ppeCompliance = buildPpeCompliance(units, employees);
  const drills = buildDrills(units);
  const emergencyAssets = buildEmergencyAssets(units);
  const emergencyPlans = buildEmergencyPlans(units);
  const notifications = buildNotifications(
    units, correctiveActions, inspections, trainingRecords, nearMisses, drills, emergencyAssets, ppeCompliance,
  );
  const reports: ReportDefinition[] = REPORT_CATALOG.map((r) => ({ ...r, lastGenerated: shiftDate(TODAY, -3) }));

  // Cross-link CAPA back to the source record so drill-down works both ways.
  const capaByRef = new Map<string, string>();
  correctiveActions.forEach((c) => {
    if (!capaByRef.has(c.sourceRef)) capaByRef.set(c.sourceRef, c.id);
  });
  incidents.forEach((inc) => {
    const capaId = capaByRef.get(inc.incidentNo);
    if (capaId) inc.correctiveActionId = capaId;
  });
  observations.forEach((obs) => {
    const capaId = capaByRef.get(obs.observationNo);
    if (capaId) obs.correctiveActionId = capaId;
  });

  cached = {
    units,
    employees,
    incidents,
    nearMisses,
    observations,
    correctiveActions,
    trainings,
    trainingRecords,
    ppeCompliance,
    inspections,
    drills,
    emergencyAssets,
    emergencyPlans,
    notifications,
    reports,
    manHours,
  };
  return cached;
}

/**
 * Clean-slate dataset: master data only (units, employees, training catalogue,
 * emergency plans, report definitions). Every activity register starts empty,
 * so all counts and rates read 0 until records are created in the app.
 */
export function buildEmptyState(): EhsState {
  const units = buildUnits();
  const manHours: Record<string, number> = {};
  units.forEach((unit) => MONTHS.forEach((m) => { manHours[`${unit.id}|${m}`] = 0; }));

  return {
    units,
    employees: buildEmployees(units),
    incidents: [],
    nearMisses: [],
    observations: [],
    correctiveActions: [],
    trainings: buildTrainings(),
    trainingRecords: [],
    ppeCompliance: [],
    inspections: [],
    drills: [],
    emergencyAssets: [],
    emergencyPlans: buildEmergencyPlans(units),
    notifications: [],
    reports: REPORT_CATALOG.map((r) => ({ ...r, lastGenerated: shiftDate(TODAY, -3) })),
    manHours,
  };
}

export const DEMO_CREDENTIALS = DEMO_USERS.map((u) => ({
  employeeId: u.employeeId,
  username: u.username,
  password: u.password,
  name: u.name,
  roleId: u.roleId,
  designation: u.designation,
  avatarInitials: u.avatarInitials,
  email: u.email,
  phone: u.phone,
  unitId: u.unitId,
}));

export function authenticate(employeeId: string, password: string) {
  const user = DEMO_USERS.find(
    (u) => u.employeeId.toLowerCase() === employeeId.trim().toLowerCase()
      || u.username.toLowerCase() === employeeId.trim().toLowerCase(),
  );
  if (!user || user.password !== password) return null;
  const role = ROLES.find((r) => r.id === user.roleId)!;
  return {
    id: `USR-${user.employeeId}`,
    employeeId: user.employeeId,
    username: user.username,
    password: '',
    name: user.name,
    email: user.email,
    roleId: user.roleId,
    unitId: user.unitId,
    designation: user.designation,
    avatarInitials: user.avatarInitials,
    phone: user.phone,
    lastLogin: new Date().toISOString(),
    mfaEnabled: true,
    active: true,
    role,
  };
}

/* Shared helpers used by analytics + UI */
export { MONTHS, DEMO_TODAY, shiftDate, monthKeyOf, addMonthsToIso };

export type { Priority };
