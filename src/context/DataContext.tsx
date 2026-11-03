import * as React from 'react';
import type {
  AppNotification,
  AppSettings,
  CorrectiveAction,
  EhsState,
  NearMiss,
  SafetyInspection,
  SafetyObservation,
  Unit,
} from '@/data/types';
import { buildEmptyState } from '@/data/generate';
import { DEFAULT_SETTINGS } from '@/data/settings';
import {
  DEFAULT_FILTER,
  DEFAULT_RANGE,
  getAllUnitMetrics,
  getCorporateMetrics,
  getUnitMetrics,
  previousPeriodRange,
  type CorporateMetrics,
  type DataFilter,
  type DateRange,
  type RangePreset,
  type UnitMetrics,
} from '@/data/analytics';

/* ============================================================================
 * DataContext
 * ----------------------------------------------------------------------------
 * Single source of truth for the whole module.
 *  - `state`   : the record set (starts as master data only, zero activity rows;
 *                swap `buildEmptyState()` for an API call and the rest of the
 *                app keeps working unchanged).
 *  - `filter`  : the global date-range + unit + department scope. Every module
 *                screen reads the same filter, so cross-screen numbers always
 *                reconcile.
 *  - `metrics` : memoised corporate + per-unit rollups for the active filter.
 *  - CRUD      : in-memory mutations that recompute every derived figure.
 * ==========================================================================*/

interface DataContextValue {
  state: EhsState;
  settings: AppSettings;
  filter: DataFilter;
  setRange: (preset: RangePreset) => void;
  setCustomRange: (from: string, to: string) => void;
  setUnitFilter: (unitId: string | 'ALL') => void;
  setDepartmentFilter: (department: string | 'ALL') => void;
  setStatusFilter: (status: string | 'ALL') => void;
  setIncidentTypeFilter: (incidentType: string | 'ALL') => void;
  setSeverityFilter: (severity: string | 'ALL') => void;
  resetFilter: () => void;
  activeFilterCount: number;

  corporate: CorporateMetrics;
  previousCorporate: CorporateMetrics;
  unitMetrics: UnitMetrics[];
  activeUnit: Unit | null;
  activeUnitMetrics: UnitMetrics | null;

  units: Unit[];
  departments: string[];
  unitName: (unitId: string | null) => string;
  unitCode: (unitId: string | null) => string;

  updateSettings: (patch: Partial<AppSettings>) => void;

  createObservation: (row: Omit<SafetyObservation, 'id' | 'observationNo'>) => SafetyObservation;
  updateObservation: (id: string, patch: Partial<SafetyObservation>) => void;
  deleteObservation: (id: string) => void;

  createNearMiss: (row: Omit<NearMiss, 'id' | 'nearMissNo'>) => NearMiss;
  updateNearMiss: (id: string, patch: Partial<NearMiss>) => void;
  deleteNearMiss: (id: string) => void;

  createCapa: (row: Omit<CorrectiveAction, 'id' | 'actionNo'>) => CorrectiveAction;
  updateCapa: (id: string, patch: Partial<CorrectiveAction>) => void;
  deleteCapa: (id: string) => void;

  updateInspection: (id: string, patch: Partial<SafetyInspection>) => void;
  completeInspection: (id: string, result: SafetyInspection['result'], score: number, findings: string) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  unreadNotificationCount: number;
  pushNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;

  recordCount: number;
}

const DataContext = React.createContext<DataContextValue | null>(null);

export function useData(): DataContextValue {
  const ctx = React.useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

const BASE_STATE = buildEmptyState();

/** `OBS-0001`, `NM-0007`, `CAPA-0012` … */
function nextNo(prefix: string, existing: { id: string }[]): string {
  const max = existing.reduce((acc, row) => {
    const n = Number(row.id.split('-').pop() ?? '0');
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<EhsState>(BASE_STATE);
  const [settings, setSettings] = React.useState<AppSettings>(DEFAULT_SETTINGS);
  const [filter, setFilter] = React.useState<DataFilter>(DEFAULT_FILTER);

  /* ------------------------------ filter ops ------------------------------ */

  const setRange = React.useCallback((preset: RangePreset) => {
    setFilter((f) => {
      if (preset === f.range.preset) return f;
      const base = resolveRange(preset);
      return { ...f, range: base };
    });
  }, []);

  const setCustomRange = React.useCallback((from: string, to: string) => {
    setFilter((f) => ({
      ...f,
      range: from <= to ? { preset: 'CUSTOM', from, to } : { preset: 'CUSTOM', from: to, to: from },
    }));
  }, []);

  const setUnitFilter = React.useCallback((unitId: string | 'ALL') => {
    setFilter((f) => ({ ...f, unitId, department: 'ALL' }));
  }, []);

  const setDepartmentFilter = React.useCallback((department: string | 'ALL') => {
    setFilter((f) => ({ ...f, department }));
  }, []);

  const setStatusFilter = React.useCallback((status: string | 'ALL') => {
    setFilter((f) => ({ ...f, status }));
  }, []);

  const setIncidentTypeFilter = React.useCallback((incidentType: string | 'ALL') => {
    setFilter((f) => ({ ...f, incidentType }));
  }, []);

  const setSeverityFilter = React.useCallback((severity: string | 'ALL') => {
    setFilter((f) => ({ ...f, severity }));
  }, []);

  const resetFilter = React.useCallback(() => setFilter(DEFAULT_FILTER), []);

  const activeFilterCount = React.useMemo(() => {
    let n = 0;
    if (filter.range.preset !== DEFAULT_RANGE.preset) n += 1;
    if (filter.unitId !== DEFAULT_FILTER.unitId) n += 1;
    if (filter.department !== 'ALL') n += 1;
    if (filter.status !== 'ALL') n += 1;
    if (filter.severity !== 'ALL') n += 1;
    if (filter.incidentType !== 'ALL') n += 1;
    return n;
  }, [filter]);

  /* ---------------------------- derived metrics --------------------------- */

  const corporate = React.useMemo(() => getCorporateMetrics(state, filter.range), [state, filter.range]);
  const previousCorporate = React.useMemo(
    () => getCorporateMetrics(state, previousPeriodRange(filter.range)),
    [state, filter.range],
  );
  const unitMetrics = React.useMemo(() => getAllUnitMetrics(state, filter.range), [state, filter.range]);

  const activeUnit = React.useMemo(
    () => (filter.unitId === 'ALL' ? null : state.units.find((u) => u.id === filter.unitId) ?? null),
    [filter.unitId, state.units],
  );

  const activeUnitMetrics = React.useMemo(
    () => (filter.unitId === 'ALL' ? null : getUnitMetrics(state, filter.unitId, filter.range)),
    [state, filter.unitId, filter.range],
  );

  const departments = React.useMemo(
    () =>
      filter.unitId === 'ALL'
        ? Array.from(new Set(state.employees.map((e) => e.department))).sort()
        : Array.from(new Set(state.employees.filter((e) => e.unitId === filter.unitId).map((e) => e.department))).sort(),
    [state.employees, filter.unitId],
  );

  const unitName = React.useCallback(
    (unitId: string | null) => state.units.find((u) => u.id === unitId)?.name ?? 'All Units',
    [state.units],
  );
  const unitCode = React.useCallback(
    (unitId: string | null) => state.units.find((u) => u.id === unitId)?.code ?? 'ALL',
    [state.units],
  );

  /* -------------------------------- settings ------------------------------ */

  const updateSettings = React.useCallback((patch: Partial<AppSettings>) => {
    setSettings((s) => ({ ...s, ...patch, target: { ...s.target, ...(patch.target ?? {}) } }));
  }, []);

  /* ---------------------------------- CRUD -------------------------------- */

  const createObservation = React.useCallback<DataContextValue['createObservation']>((row) => {
    let created!: SafetyObservation;
    setState((s) => {
      created = { ...row, id: `OBS-${nextNo('OBS', s.observations)}`, observationNo: '' };
      created.observationNo = created.id;
      return { ...s, observations: [created, ...s.observations] };
    });
    return created;
  }, []);

  const updateObservation = React.useCallback<DataContextValue['updateObservation']>((id, patch) => {
    setState((s) => ({
      ...s,
      observations: s.observations.map((o) => {
        if (o.id !== id) return o;
        const next = { ...o, ...patch };
        if (patch.status === 'Closed' && !next.closedDate) next.closedDate = new Date().toISOString().slice(0, 10);
        if (patch.status && patch.status !== 'Closed') next.closedDate = null;
        return next;
      }),
    }));
  }, []);

  const deleteObservation = React.useCallback<DataContextValue['deleteObservation']>((id) => {
    setState((s) => ({ ...s, observations: s.observations.filter((o) => o.id !== id) }));
  }, []);

  const createNearMiss = React.useCallback<DataContextValue['createNearMiss']>((row) => {
    let created!: NearMiss;
    setState((s) => {
      created = { ...row, id: `NM-${nextNo('NM', s.nearMisses)}`, nearMissNo: '' };
      created.nearMissNo = created.id;
      return { ...s, nearMisses: [created, ...s.nearMisses] };
    });
    return created;
  }, []);

  const updateNearMiss = React.useCallback<DataContextValue['updateNearMiss']>((id, patch) => {
    setState((s) => ({ ...s, nearMisses: s.nearMisses.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  }, []);

  const deleteNearMiss = React.useCallback<DataContextValue['deleteNearMiss']>((id) => {
    setState((s) => ({ ...s, nearMisses: s.nearMisses.filter((n) => n.id !== id) }));
  }, []);

  const createCapa = React.useCallback<DataContextValue['createCapa']>((row) => {
    let created!: CorrectiveAction;
    setState((s) => {
      created = { ...row, id: `CAPA-${nextNo('CAPA', s.correctiveActions)}`, actionNo: '' };
      created.actionNo = created.id;
      return { ...s, correctiveActions: [created, ...s.correctiveActions] };
    });
    return created;
  }, []);

  const updateCapa = React.useCallback<DataContextValue['updateCapa']>((id, patch) => {
    setState((s) => ({
      ...s,
      correctiveActions: s.correctiveActions.map((c) => {
        if (c.id !== id) return c;
        const next = { ...c, ...patch };
        if (patch.status === 'Completed' && !next.completedDate) {
          next.completedDate = new Date().toISOString().slice(0, 10);
          if (patch.verificationStatus !== 'Rejected') next.verificationStatus = 'Verified';
        }
        if (patch.status && patch.status !== 'Completed') next.completedDate = null;
        return next;
      }),
    }));
  }, []);

  const deleteCapa = React.useCallback<DataContextValue['deleteCapa']>((id) => {
    setState((s) => ({ ...s, correctiveActions: s.correctiveActions.filter((c) => c.id !== id) }));
  }, []);

  const updateInspection = React.useCallback<DataContextValue['updateInspection']>((id, patch) => {
    setState((s) => ({ ...s, inspections: s.inspections.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  }, []);

  const completeInspection = React.useCallback<DataContextValue['completeInspection']>(
    (id, result, score, findings) => {
      const today = new Date().toISOString().slice(0, 10);
      setState((s) => ({
        ...s,
        inspections: s.inspections.map((i) =>
          i.id === id
            ? {
                ...i,
                result,
                score,
                findings,
                date: today,
                status: result === 'Fail' ? 'Failed' : 'Completed',
                checklistCompleted: result === 'Fail' ? i.checklistCompleted : i.checklistTotal,
              }
            : i,
        ),
      }));
    },
    [],
  );

  /* ----------------------------- notifications ---------------------------- */

  const markNotificationRead = React.useCallback((id: string) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const markAllNotificationsRead = React.useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
  }, []);

  const pushNotification = React.useCallback<DataContextValue['pushNotification']>((n) => {
    setState((s) => ({
      ...s,
      notifications: [
        {
          ...n,
          id: `NTF-${String(s.notifications.length + 1).padStart(3, '0')}`,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...s.notifications,
      ],
    }));
  }, []);

  const unreadNotificationCount = React.useMemo(() => state.notifications.filter((n) => !n.read).length, [state.notifications]);

  const recordCount = React.useMemo(
    () =>
      state.incidents.length +
      state.nearMisses.length +
      state.observations.length +
      state.correctiveActions.length +
      state.trainingRecords.length +
      state.ppeCompliance.length +
      state.inspections.length +
      state.drills.length +
      state.emergencyAssets.length,
    [state],
  );

  const value = React.useMemo<DataContextValue>(
    () => ({
      state,
      settings,
      filter,
      setRange,
      setCustomRange,
      setUnitFilter,
      setDepartmentFilter,
      setStatusFilter,
      setIncidentTypeFilter,
      setSeverityFilter,
      resetFilter,
      activeFilterCount,
      corporate,
      previousCorporate,
      unitMetrics,
      activeUnit,
      activeUnitMetrics,
      units: state.units,
      departments,
      unitName,
      unitCode,
      updateSettings,
      createObservation,
      updateObservation,
      deleteObservation,
      createNearMiss,
      updateNearMiss,
      deleteNearMiss,
      createCapa,
      updateCapa,
      deleteCapa,
      updateInspection,
      completeInspection,
      markNotificationRead,
      markAllNotificationsRead,
      unreadNotificationCount,
      pushNotification,
      recordCount,
    }),
    [
      state,
      settings,
      filter,
      setRange,
      setCustomRange,
      setUnitFilter,
      setDepartmentFilter,
      setStatusFilter,
      setIncidentTypeFilter,
      setSeverityFilter,
      resetFilter,
      activeFilterCount,
      corporate,
      previousCorporate,
      unitMetrics,
      activeUnit,
      activeUnitMetrics,
      departments,
      unitName,
      unitCode,
      updateSettings,
      createObservation,
      updateObservation,
      deleteObservation,
      createNearMiss,
      updateNearMiss,
      deleteNearMiss,
      createCapa,
      updateCapa,
      deleteCapa,
      updateInspection,
      completeInspection,
      markNotificationRead,
      markAllNotificationsRead,
      unreadNotificationCount,
      pushNotification,
      recordCount,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/* ------------------------------------------------------------------------ */

function resolveRange(preset: RangePreset): DateRange {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const firstOf = (d: Date) => iso(new Date(d.getFullYear(), d.getMonth(), 1));
  const shift = (d: Date, months: number) => new Date(d.getFullYear(), d.getMonth() + months, 1);

  switch (preset) {
    case 'THIS_MONTH':
      return { preset, from: firstOf(today), to: iso(today) };
    case 'LAST_MONTH': {
      const start = shift(today, -1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      return { preset, from: iso(start), to: iso(end) };
    }
    case 'LAST_3_MONTHS':
      return { preset, from: iso(shift(today, -2)), to: iso(today) };
    case 'LAST_6_MONTHS':
      return { preset, from: iso(shift(today, -5)), to: iso(today) };
    case 'THIS_YEAR':
      return { preset, from: iso(new Date(today.getFullYear(), 0, 1)), to: iso(today) };
    case 'CUSTOM':
    default:
      return { preset: 'CUSTOM', from: iso(shift(today, -5)), to: iso(today) };
  }
}

export { resolveRange };
