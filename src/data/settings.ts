import type { AppSettings, Role } from './types';
import { ROLES } from './generate';

export const DEFAULT_SETTINGS: AppSettings = {
  organisationName: 'MillTech Textiles Ltd.',
  plantName: 'Unit 1 – Integrated Spinning Campus',
  fiscalYearStart: '2026-04-01',
  dataRetentionYears: 7,
  target: {
    ltifr: 4.0,
    trifr: 8.0,
    trainingCompliance: 95,
    ppeCompliance: 97,
    capaOnTimeClosure: 90,
    nearMissReportingPer100: 4,
    daysSinceLastDrill: 90,
  },
  notifications: {
    email: true,
    push: true,
    sms: false,
    digest: 'Real-time',
    criticalAlerts: true,
    overdueCaps: true,
    inspectionReminders: true,
    trainingExpiry: true,
  },
  escalation: {
    level1Days: 3,
    level2Days: 7,
    level3Days: 15,
    level1To: 'Unit Safety Head',
    level2To: 'Head of Operations',
    level3To: 'Plant Head / CMD',
  },
  theme: 'light',
  rowsPerPage: 10,
  demoMode: true,
};

export const NAV_SECTIONS: { title: string; items: { label: string; to: string; icon: string; permission: string }[] }[] = [
  {
    title: 'EHS',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: 'LayoutDashboard', permission: 'dashboard' },
      { label: 'Corporate Safety', to: '/corporate', icon: 'Building2', permission: 'dashboard' },
      { label: 'Units', to: '/units', icon: 'Factory', permission: 'dashboard' },
    ],
  },
  {
    title: 'Safety Records',
    items: [
      { label: 'Incidents', to: '/incidents', icon: 'AlertTriangle', permission: 'incidents' },
      { label: 'Near Misses', to: '/near-misses', icon: 'Radar', permission: 'near-misses' },
      { label: 'Safety Observations', to: '/observations', icon: 'Eye', permission: 'observations' },
      { label: 'CAPA', to: '/capa', icon: 'ClipboardCheck', permission: 'capa' },
    ],
  },
  {
    title: 'Competence & Controls',
    items: [
      { label: 'Training', to: '/training', icon: 'GraduationCap', permission: 'training' },
      { label: 'PPE Compliance', to: '/ppe', icon: 'HardHat', permission: 'ppe' },
      { label: 'Inspections', to: '/inspections', icon: 'ClipboardList', permission: 'inspections' },
      { label: 'Emergency & Fire Safety', to: '/emergency', icon: 'Flame', permission: 'emergency' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Reports', to: '/reports', icon: 'FileBarChart', permission: 'reports' },
      { label: 'Notifications', to: '/notifications', icon: 'Bell', permission: 'notifications' },
      { label: 'Settings', to: '/settings', icon: 'Settings', permission: 'settings' },
    ],
  },
];

export function getRoleById(roleId: string): Role {
  return ROLES.find((r) => r.id === roleId) ?? ROLES[0];
}
