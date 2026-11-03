/* ============================================================================
 * EHS DOMAIN MODEL  (database-ready)
 * ----------------------------------------------------------------------------
 * Every entity mirrors a table that can be created in PostgreSQL/MySQL later.
 * `id` is a stable string PK, FKs are explicit (`unitId`, `employeeId`...), and
 * derived figures (LTIFR, compliance %, etc.) are NEVER stored — they are
 * computed from the record sets by `src/data/analytics.ts` so that all screens
 * stay consistent with one another.
 * ==========================================================================*/

/* ---------------------------------- RBAC ---------------------------------- */
export type RoleCode =
  | 'CORPORATE_EHS_HEAD'
  | 'UNIT_SAFETY_HEAD'
  | 'SAFETY_OFFICER'
  | 'HR'
  | 'EMPLOYEE';

export interface Role {
  id: string;
  code: RoleCode;
  name: string;
  description: string;
  /** Route slugs the role is allowed to open. `'*'` = all. */
  permissions: string[];
}

export interface User {
  id: string;
  employeeId: string;
  username: string;
  password: string; // demo only – plaintext in the mock layer
  name: string;
  email: string;
  roleId: string;
  unitId: string | null; // null = corporate scope
  designation: string;
  avatarInitials: string;
  phone: string;
  lastLogin: string;
  mfaEnabled: boolean;
  active: boolean;
}

/* ---------------------------------- CORE ---------------------------------- */
export interface Unit {
  id: string;
  code: string;
  name: string;
  shortName: string;
  description: string;
  location: string;
  state: string;
  /** Unit-level risk appetite used only by the generator. */
  headcount: number;
  departments: string[];
  safetyHeadName: string;
  established: string;
  active: boolean;
}

export type EmployeeGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type EmploymentStatus = 'Active' | 'On Probation' | 'Contract' | 'Notice Period';

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  unitId: string;
  department: string;
  designation: string;
  grade: EmployeeGrade;
  dateOfJoining: string;
  status: EmploymentStatus;
  supervisorId: string | null;
  email: string;
  phone: string;
  shift: 'A' | 'B' | 'C' | 'General';
}

/* ------------------------------- INCIDENTS -------------------------------- */
export type IncidentType =
  | 'First Aid'
  | 'Medical Treatment'
  | 'Lost Time Injury'
  | 'Near Miss'
  | 'Property Damage'
  | 'Fire Incident'
  | 'Unsafe Condition'
  | 'Unsafe Act';

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type InvestigationStatus = 'Not Started' | 'In Progress' | 'Under Review' | 'Closed';
export type RecordStatus = 'Open' | 'In Progress' | 'Closed' | 'Pending Approval';

export interface Incident {
  id: string;
  incidentNo: string;
  unitId: string;
  department: string;
  date: string; // ISO
  reportedDate: string;
  time: string;
  location: string;
  area: string;
  incidentType: IncidentType;
  severity: Severity;
  description: string;
  immediateAction: string;
  rootCause: string;
  injuryPart: string | null;
  lostDays: number;
  reportedById: string;
  reportedByName: string;
  investigationStatus: InvestigationStatus;
  correctiveActionId: string | null;
  status: RecordStatus;
  workShift: 'A' | 'B' | 'C' | 'General';
}

/* ------------------------------ NEAR MISSES ------------------------------- */
export type NearMissCategory =
  | 'Machine Safety'
  | 'Electrical'
  | 'Fire'
  | 'PPE'
  | 'Material Handling'
  | 'Working at Height'
  | 'Housekeeping'
  | 'Chemical'
  | 'Ergonomics';

export type RiskLevel = 'High' | 'Medium' | 'Low';
export type NearMissStatus = 'Open' | 'Under Analysis' | 'Action Taken' | 'Closed';

export interface NearMiss {
  id: string;
  nearMissNo: string;
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
  linkedIncidentId: string | null;
}

/* --------------------------- SAFETY OBSERVATIONS -------------------------- */
export type ObservationType = 'Unsafe Act' | 'Unsafe Condition' | 'Positive Observation';
export type ObservationStatus = 'Open' | 'In Progress' | 'Closed';

export interface SafetyObservation {
  id: string;
  observationNo: string;
  unitId: string;
  department: string;
  date: string;
  observerName: string;
  location: string;
  type: ObservationType;
  category: NearMissCategory;
  description: string;
  riskLevel: RiskLevel;
  correctiveActionId: string | null;
  status: ObservationStatus;
  closedDate: string | null;
}

/* -------------------------- CORRECTIVE ACTIONS ---------------------------- */
export type Priority = 'High' | 'Medium' | 'Low';
export type CapaStatus = 'Open' | 'In Progress' | 'Completed' | 'Overdue';

export interface CorrectiveAction {
  id: string;
  actionNo: string;
  unitId: string;
  department: string;
  finding: string;
  source: 'Incident' | 'Near Miss' | 'Safety Observation' | 'Inspection' | 'Audit';
  sourceRef: string;
  raisedDate: string;
  dueDate: string;
  responsiblePerson: string;
  responsibleId: string;
  priority: Priority;
  status: CapaStatus;
  completedDate: string | null;
  verificationStatus: 'Pending Verification' | 'Verified' | 'Rejected';
  effectiveness: 'Effective' | 'Partially Effective' | 'Not Effective' | null;
  rootCause: string;
  targetDate: string;
  cost: number;
  notes: string;
}

/* -------------------------------- TRAINING -------------------------------- */
export type TrainingCategory =
  | 'Fire Safety'
  | 'PPE'
  | 'Machine Safety'
  | 'Electrical Safety'
  | 'First Aid'
  | 'Emergency Response'
  | 'Chemical Safety'
  | 'Working at Height'
  | 'Occupational Health & Safety';

export type TrainingStatus = 'Completed' | 'Pending' | 'Expired' | 'In Progress';
export type TrainingMode = 'Classroom' | 'On-the-Job' | 'E-Learning' | 'External';

export interface Training {
  id: string;
  code: string;
  title: string;
  category: TrainingCategory;
  durationHours: number;
  validityMonths: number;
  mode: TrainingMode;
  mandatory: boolean;
  trainer: string;
  passMark: number;
}

export interface TrainingRecord {
  id: string;
  trainingId: string;
  employeeId: string;
  unitId: string;
  assignedDate: string;
  dueDate: string;
  completedDate: string | null;
  score: number | null;
  status: TrainingStatus;
  certificateNo: string | null;
  mode: TrainingMode;
  trainer: string;
}

/* ---------------------------------- PPE ----------------------------------- */
export type PpeItem =
  | 'Helmet'
  | 'Safety Shoes'
  | 'Gloves'
  | 'Safety Goggles'
  | 'Ear Protection'
  | 'Respiratory Protection'
  | 'Safety Harness';

export interface PpeCompliance {
  id: string;
  unitId: string;
  department: string;
  item: PpeItem;
  assessed: number;
  compliant: number;
  nonCompliant: number;
  lastAuditDate: string;
  auditor: string;
  penaltyPoints: number;
  trend: number; // vs previous month, in pp
}

/* ------------------------------- INSPECTIONS ------------------------------ */
export type InspectionCategory =
  | 'Machine Safety'
  | 'Fire Safety'
  | 'Electrical Safety'
  | 'Housekeeping'
  | 'PPE'
  | 'Emergency Exit'
  | 'Chemical Storage'
  | 'Workplace Safety';

export type InspectionStatus = 'Completed' | 'Pending' | 'Failed' | 'Scheduled';
export type Result = 'Pass' | 'Conditional Pass' | 'Fail' | 'Not Conducted';

export interface SafetyInspection {
  id: string;
  inspectionNo: string;
  unitId: string;
  department: string;
  category: InspectionCategory;
  area: string;
  inspectorName: string;
  inspectorId: string;
  scheduledDate: string;
  date: string | null;
  score: number | null;
  maxScore: number;
  criticalFindings: number;
  majorFindings: number;
  minorFindings: number;
  status: InspectionStatus;
  result: Result;
  findings: string;
  checklistCompleted: number;
  checklistTotal: number;
  nextDueDate: string;
}

/* -------------------------- EMERGENCY / FIRE ------------------------------ */
export type DrillType = 'Fire Drill' | 'Emergency Drill' | 'Evacuation Drill' | 'Mock Drill';

export interface EmergencyDrill {
  id: string;
  drillNo: string;
  unitId: string;
  type: DrillType;
  date: string;
  startTime: string;
  evacuationTimeSec: number;
  targetTimeSec: number;
  participants: number;
  totalEmployees: number;
  wardenName: string;
  assemblyPoint: string;
  status: 'Completed' | 'Scheduled';
  result: 'Satisfactory' | 'Satisfactory with Remarks' | 'Unsatisfactory' | 'Upcoming' | null;
  remarks: string;
}

export interface EmergencyAsset {
  id: string;
  unitId: string;
  kind: 'Fire Extinguisher' | 'Emergency Exit' | 'Assembly Point' | 'First Aid Kit' | 'Fire Alarm' | 'Emergency Light' | 'Sprinkler';
  code: string;
  location: string;
  lastInspected: string;
  nextInspection: string;
  status: 'Serviceable' | 'Due' | 'Defective' | 'Under Repair';
}

export interface EmergencyPlan {
  id: string;
  unitId: string;
  title: string;
  owner: string;
  lastMockDrill: string;
  nextMockDrill: string;
  resourcesReadyPct: number;
  contactName: string;
  contactPhone: string;
}

/* ----------------------------- NOTIFICATIONS ------------------------------ */
export type NotificationSeverity = 'Critical' | 'Warning' | 'Information';

export interface AppNotification {
  id: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  unitId: string | null;
  module:
    | 'CAPA'
    | 'Inspection'
    | 'Training'
    | 'Near Miss'
    | 'Emergency'
    | 'Incident'
    | 'PPE'
    | 'System';
  createdAt: string;
  read: boolean;
  link: string;
}

/* -------------------------------- REPORTS --------------------------------- */
export type ReportKey =
  | 'MONTHLY_SAFETY'
  | 'UNIT_SAFETY'
  | 'INCIDENT'
  | 'NEAR_MISS'
  | 'TRAINING'
  | 'INSPECTION'
  | 'CAPA'
  | 'PPE';

export interface ReportDefinition {
  key: ReportKey;
  title: string;
  description: string;
  scope: 'Unit' | 'Corporate';
  module: string;
  cadence: string;
  owner: string;
  sections: string[];
  lastGenerated: string;
}

/* -------------------------------- SETTINGS -------------------------------- */
export interface AppSettings {
  organisationName: string;
  plantName: string;
  fiscalYearStart: string;
  dataRetentionYears: number;
  target: TargetSettings;
  notifications: NotificationSettings;
  escalation: EscalationSettings;
  theme: 'light' | 'system';
  rowsPerPage: number;
  demoMode: boolean;
}

export interface TargetSettings {
  ltifr: number;
  trifr: number;
  trainingCompliance: number;
  ppeCompliance: number;
  capaOnTimeClosure: number;
  nearMissReportingPer100: number;
  daysSinceLastDrill: number;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  digest: 'Real-time' | 'Daily' | 'Weekly';
  criticalAlerts: boolean;
  overdueCaps: boolean;
  inspectionReminders: boolean;
  trainingExpiry: boolean;
}

export interface EscalationSettings {
  level1Days: number;
  level2Days: number;
  level3Days: number;
  level1To: string;
  level2To: string;
  level3To: string;
}

/* ------------------------------- APP STATE -------------------------------- */
export interface EhsState {
  units: Unit[];
  employees: Employee[];
  incidents: Incident[];
  nearMisses: NearMiss[];
  observations: SafetyObservation[];
  correctiveActions: CorrectiveAction[];
  trainings: Training[];
  trainingRecords: TrainingRecord[];
  ppeCompliance: PpeCompliance[];
  inspections: SafetyInspection[];
  drills: EmergencyDrill[];
  emergencyAssets: EmergencyAsset[];
  emergencyPlans: EmergencyPlan[];
  notifications: AppNotification[];
  reports: ReportDefinition[];
  manHours: Record<string, number>; // `${unitId}|YYYY-MM` -> man hours
}
