import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ClipboardCheck,
  ClipboardList,
  CornerDownLeft,
  Eye,
  FileBarChart,
  Flame,
  GraduationCap,
  HardHat,
  Radar,
  Search,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useData } from '@/context/DataContext';
import { Kbd } from '@/components/ui/tooltip';
import { StatusBadge } from '@/components/ui/badge';

/* ============================================================================
 * Global command palette (Ctrl/Cmd + K)
 * Searches units, employees, incidents, near misses, observations, CAPA and
 * inspections, and also offers the main navigation destinations.
 * ==========================================================================*/

interface Result {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  status?: string;
  to: string;
  keywords: string;
}

const NAV_SHORTCUTS: { group: string; title: string; to: string; icon: React.ReactNode; keywords: string }[] = [
  { group: 'Navigate', title: 'Dashboard', to: '/dashboard', icon: <Search className="h-3.5 w-3.5" />, keywords: 'home overview' },
  { group: 'Navigate', title: 'Corporate Safety', to: '/corporate', icon: <Search className="h-3.5 w-3.5" />, keywords: 'plant all units' },
  { group: 'Navigate', title: 'Units', to: '/units', icon: <Search className="h-3.5 w-3.5" />, keywords: 'business unit' },
  { group: 'Navigate', title: 'Incidents', to: '/incidents', icon: <AlertTriangle className="h-3.5 w-3.5" />, keywords: 'accident injury' },
  { group: 'Navigate', title: 'Near Misses', to: '/near-misses', icon: <Radar className="h-3.5 w-3.5" />, keywords: 'near miss' },
  { group: 'Navigate', title: 'Safety Observations', to: '/observations', icon: <Eye className="h-3.5 w-3.5" />, keywords: 'observation unsafe act' },
  { group: 'Navigate', title: 'CAPA', to: '/capa', icon: <ClipboardCheck className="h-3.5 w-3.5" />, keywords: 'corrective action' },
  { group: 'Navigate', title: 'Training', to: '/training', icon: <GraduationCap className="h-3.5 w-3.5" />, keywords: 'competence learning' },
  { group: 'Navigate', title: 'PPE Compliance', to: '/ppe', icon: <HardHat className="h-3.5 w-3.5" />, keywords: 'personal protective equipment' },
  { group: 'Navigate', title: 'Inspections', to: '/inspections', icon: <ClipboardList className="h-3.5 w-3.5" />, keywords: 'audit checklist' },
  { group: 'Navigate', title: 'Emergency & Fire', to: '/emergency', icon: <Flame className="h-3.5 w-3.5" />, keywords: 'drill fire extinguisher' },
  { group: 'Navigate', title: 'Reports', to: '/reports', icon: <FileBarChart className="h-3.5 w-3.5" />, keywords: 'export pdf' },
];

export function GlobalCommandSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, unitCode } = useData();
  const navigate = useNavigate();
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  const results = React.useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const out: Result[] = [];

    if (!q) {
      NAV_SHORTCUTS.forEach((n) =>
        out.push({ id: `nav:${n.to}`, group: n.group, title: n.title, subtitle: 'Go to page', icon: n.icon, to: n.to, keywords: n.keywords }),
      );
      state.units.slice(0, 8).forEach((u) =>
        out.push({
          id: `unit:${u.id}`,
          group: 'Units',
          title: `${u.code} · ${u.name}`,
          subtitle: `${u.location} · ${u.headcount} employees`,
          icon: <Search className="h-3.5 w-3.5" />,
          to: `/units/${u.id}`,
          keywords: `${u.code} ${u.name} ${u.shortName}`.toLowerCase(),
        }),
      );
      return out;
    }

    NAV_SHORTCUTS.filter((n) => `${n.title} ${n.keywords}`.toLowerCase().includes(q)).forEach((n) =>
      out.push({ id: `nav:${n.to}`, group: 'Navigate', title: n.title, subtitle: 'Go to page', icon: n.icon, to: n.to, keywords: n.keywords }),
    );

    state.units
      .filter((u) => `${u.code} ${u.name} ${u.shortName} ${u.location}`.toLowerCase().includes(q))
      .forEach((u) =>
        out.push({
          id: `unit:${u.id}`,
          group: 'Units',
          title: `${u.code} · ${u.name}`,
          subtitle: `${u.location} · ${u.headcount} employees`,
          icon: <Search className="h-3.5 w-3.5" />,
          to: `/units/${u.id}`,
          keywords: `${u.code} ${u.name} ${u.shortName}`.toLowerCase(),
        }),
      );

    state.employees
      .filter((e) => `${e.name} ${e.employeeCode} ${e.department} ${e.designation}`.toLowerCase().includes(q))
      .slice(0, 6)
      .forEach((e) =>
        out.push({
          id: `emp:${e.id}`,
          group: 'Employees',
          title: e.name,
          subtitle: `${e.employeeCode} · ${unitCode(e.unitId)} · ${e.department}`,
          icon: <UserIcon className="h-3.5 w-3.5" />,
          status: e.status,
          to: `/training?employee=${e.id}`,
          keywords: `${e.name} ${e.employeeCode} ${e.department}`.toLowerCase(),
        }),
      );

    state.incidents
      .filter((i) => `${i.incidentNo} ${i.description} ${i.department} ${i.location}`.toLowerCase().includes(q))
      .slice(0, 6)
      .forEach((i) =>
        out.push({
          id: `inc:${i.id}`,
          group: 'Incidents',
          title: i.incidentNo,
          subtitle: `${i.date} · ${unitCode(i.unitId)} · ${i.department}`,
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          status: i.severity,
          to: `/incidents?open=${i.id}`,
          keywords: `${i.incidentNo} ${i.description} ${i.location}`.toLowerCase(),
        }),
      );

    state.nearMisses
      .filter((n) => `${n.nearMissNo} ${n.description} ${n.category} ${n.department}`.toLowerCase().includes(q))
      .slice(0, 6)
      .forEach((n) =>
        out.push({
          id: `nm:${n.id}`,
          group: 'Near Misses',
          title: n.nearMissNo,
          subtitle: `${n.date} · ${unitCode(n.unitId)} · ${n.category}`,
          icon: <Radar className="h-3.5 w-3.5" />,
          status: n.riskLevel,
          to: `/near-misses?open=${n.id}`,
          keywords: `${n.nearMissNo} ${n.description} ${n.category}`.toLowerCase(),
        }),
      );

    state.observations
      .filter((o) => `${o.observationNo} ${o.description} ${o.department} ${o.type}`.toLowerCase().includes(q))
      .slice(0, 6)
      .forEach((o) =>
        out.push({
          id: `obs:${o.id}`,
          group: 'Observations',
          title: o.observationNo,
          subtitle: `${o.date} · ${unitCode(o.unitId)} · ${o.type}`,
          icon: <Eye className="h-3.5 w-3.5" />,
          status: o.riskLevel,
          to: `/observations?open=${o.id}`,
          keywords: `${o.observationNo} ${o.description} ${o.type}`.toLowerCase(),
        }),
      );

    state.correctiveActions
      .filter((c) => `${c.actionNo} ${c.finding} ${c.responsiblePerson} ${c.department}`.toLowerCase().includes(q))
      .slice(0, 6)
      .forEach((c) =>
        out.push({
          id: `capa:${c.id}`,
          group: 'CAPA',
          title: c.actionNo,
          subtitle: `${c.raisedDate} · ${unitCode(c.unitId)} · ${c.responsiblePerson}`,
          icon: <ClipboardCheck className="h-3.5 w-3.5" />,
          status: c.status,
          to: `/capa?open=${c.id}`,
          keywords: `${c.actionNo} ${c.finding} ${c.responsiblePerson}`.toLowerCase(),
        }),
      );

    state.inspections
      .filter((i) => `${i.inspectionNo} ${i.area} ${i.category} ${i.inspectorName}`.toLowerCase().includes(q))
      .slice(0, 6)
      .forEach((i) =>
        out.push({
          id: `insp:${i.id}`,
          group: 'Inspections',
          title: i.inspectionNo,
          subtitle: `${i.scheduledDate} · ${unitCode(i.unitId)} · ${i.area}`,
          icon: <ClipboardList className="h-3.5 w-3.5" />,
          status: i.status,
          to: `/inspections?open=${i.id}`,
          keywords: `${i.inspectionNo} ${i.area} ${i.category}`.toLowerCase(),
        }),
      );

    return out.slice(0, 40);
  }, [query, state]);

  React.useEffect(() => {
    setActive(0);
  }, [query]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const go = (r: Result) => {
    navigate(r.to);
    onClose();
    setQuery('');
  };

  const groups = Array.from(new Set(results.map((r) => r.group)));
  let cursor = -1;

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center p-4 pt-[8vh] sm:pt-[12vh]">
      <div className="fixed inset-0 animate-fade-in bg-ink-950/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        className="relative flex max-h-[70vh] w-full max-w-2xl animate-slide-up flex-col overflow-hidden rounded-xl border border-ink-200 bg-white shadow-overlay"
      >
        <div className="flex items-center gap-2.5 border-b border-ink-100 px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === 'Enter' && results[active]) {
                e.preventDefault();
                go(results[active]);
              }
            }}
            placeholder="Search records, units, employees…"
            className="h-12 flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
            aria-label="Search"
          />
          <Kbd>ESC</Kbd>
        </div>

        <div ref={listRef} className="data-grid-scroll flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-10 text-center text-xs text-ink-400">
              No matches for “{query}”. Try an incident number, employee name or unit code.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group} className="mb-1">
                <p className="px-2.5 py-1.5 text-[10px] font-semibold tracking-wider text-ink-400 uppercase">{group}</p>
                {results
                  .filter((r) => r.group === group)
                  .map((r) => {
                    cursor += 1;
                    const index = cursor;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        data-index={index}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => go(r)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                          index === active ? 'bg-ink-100' : 'hover:bg-ink-50',
                        )}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink-100 text-ink-500">
                          {r.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-ink-900">{r.title}</span>
                          <span className="block truncate text-[11px] text-ink-500">{r.subtitle}</span>
                        </span>
                        {r.status ? <StatusBadge value={r.status} size="xs" /> : null}
                        {index === active ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-ink-400" /> : null}
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-ink-100 bg-ink-50/70 px-4 py-2 text-[10px] text-ink-500">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> open
          </span>
          <span className="ml-auto">{results.length} results</span>
        </div>
      </div>
    </div>
  );
}
