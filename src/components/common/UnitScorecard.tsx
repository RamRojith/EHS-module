import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge, StatusDot } from '@/components/ui';
import { StatusBadge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip } from '@/components/ui/tooltip';
import { STATUS_STYLES, type StatusKey } from '@/lib/theme';
import { formatNumber, formatPercent } from '@/lib/format';
import type { UnitMetrics } from '@/data/analytics';

/** One row of the unit comparison table. */
export function UnitScorecardRow({
  m,
  targets,
  onSelect,
  selected,
}: {
  m: UnitMetrics;
  targets: { ltifr: number; trainingCompliance: number; ppeCompliance: number };
  onSelect?: () => void;
  selected?: boolean;
}) {
  return (
    <tr
      onClick={onSelect}
      className={cn(
        'border-b border-ink-100 transition-colors last:border-0',
        onSelect && 'cursor-pointer hover:bg-safety-50/40',
        selected && 'bg-safety-50/60',
      )}
    >
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <StatusDot value={m.status} />
          <div className="min-w-0">
            <Link
              to={`/units/${m.unitId}`}
              onClick={(e) => e.stopPropagation()}
              className="block truncate text-[13px] font-semibold text-ink-900 hover:text-navy-700 hover:underline"
            >
              {m.unitCode}
            </Link>
            <p className="truncate text-[10px] text-ink-500">{m.unitName}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge value={m.status} size="xs" />
      </td>
      <td className="px-3 py-2.5 text-right text-[13px] font-semibold text-ink-900 tabular-nums">
        {m.ltifr.toFixed(2)}
        <span className="ml-1 text-[10px] font-normal text-ink-400">
          {m.ltifr <= targets.ltifr ? '✓' : `+${(m.ltifr - targets.ltifr).toFixed(2)}`}
        </span>
      </td>
      <td className="hidden px-3 py-2.5 text-right text-[13px] text-ink-700 tabular-nums md:table-cell">
        {m.trifr.toFixed(2)}
      </td>
      <td className="px-3 py-2.5 text-right text-[13px] text-ink-700 tabular-nums">{m.incidents}</td>
      <td className="px-3 py-2.5 text-right text-[13px] text-ink-700 tabular-nums">{m.nearMisses}</td>
      <td className="px-3 py-2.5 text-right text-[13px] text-ink-700 tabular-nums">{m.lostTimeInjuries}</td>
      <td className="px-3 py-2.5 text-right text-[13px] text-ink-700 tabular-nums">
        <span className={cn(m.overdueCapa > 0 && 'font-semibold text-red-600')}>{m.overdueCapa}</span>
      </td>
      <td className="hidden w-36 px-3 py-2.5 lg:table-cell">
        <Progress
          value={m.trainingCompliance}
          target={targets.trainingCompliance}
          size="sm"
          tone={
            m.trainingCompliance >= targets.trainingCompliance
              ? 'green'
              : m.trainingCompliance >= targets.trainingCompliance - 5
                ? 'amber'
                : 'red'
          }
        />
      </td>
      <td className="hidden w-36 px-3 py-2.5 lg:table-cell">
        <Progress
          value={m.ppeCompliance}
          target={targets.ppeCompliance}
          size="sm"
          tone={
            m.ppeCompliance >= targets.ppeCompliance
              ? 'green'
              : m.ppeCompliance >= targets.ppeCompliance - 5
                ? 'amber'
                : 'red'
          }
        />
      </td>
      <td className="hidden px-3 py-2.5 text-right text-[13px] text-ink-700 tabular-nums sm:table-cell">
        <span className="flex items-center justify-end gap-1">
          <Users className="h-3 w-3 text-ink-300" />
          {formatNumber(m.employees)}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <Link
          to={`/units/${m.unitId}`}
          className="inline-flex rounded p-1 text-ink-300 transition-colors hover:bg-ink-100 hover:text-navy-700"
          aria-label={`Open ${m.unitCode} unit dashboard`}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </td>
    </tr>
  );
}

export function UnitScorecard({
  metrics,
  targets,
  caption,
}: {
  metrics: UnitMetrics[];
  targets: { ltifr: number; trainingCompliance: number; ppeCompliance: number };
  caption?: string;
}) {
  const sorted = [...metrics].sort((a, b) => b.ltifr - a.ltifr);
  return (
    <div className="data-grid-scroll overflow-hidden rounded-lg border border-ink-200">
      <table className="w-full text-sm">
        <thead className="bg-ink-50">
          <tr className="border-b border-ink-200">
            {[
              { label: 'Unit', align: 'left' as const, cls: '' },
              { label: 'Status', align: 'left' as const, cls: '' },
              { label: 'LTIFR', align: 'right' as const, cls: '' },
              { label: 'TRIFR', align: 'right' as const, cls: 'hidden md:table-cell' },
              { label: 'Incidents', align: 'right' as const, cls: '' },
              { label: 'Near Misses', align: 'right' as const, cls: '' },
              { label: 'LTI', align: 'right' as const, cls: '' },
              { label: 'Overdue CAPA', align: 'right' as const, cls: '' },
              { label: `Training ≥${targets.trainingCompliance}%`, align: 'left' as const, cls: 'hidden lg:table-cell w-36' },
              { label: `PPE ≥${targets.ppeCompliance}%`, align: 'left' as const, cls: 'hidden lg:table-cell w-36' },
              { label: 'Headcount', align: 'right' as const, cls: 'hidden sm:table-cell' },
              { label: '', align: 'right' as const, cls: 'w-8' },
            ].map((h, i) => (
              <th
                key={i}
                scope="col"
                className={cn(
                  'h-9 px-3 text-[10px] font-semibold tracking-wide text-ink-500 uppercase whitespace-nowrap',
                  h.align === 'right' ? 'text-right' : 'text-left',
                  h.cls,
                )}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <UnitScorecardRow key={m.unitId} m={m} targets={targets} onSelect={() => undefined} />
          ))}
        </tbody>
      </table>
      {caption ? <p className="border-t border-ink-100 bg-ink-50/60 px-3 py-2 text-[10px] text-ink-500">{caption}</p> : null}
    </div>
  );
}

/** Status distribution strip (Good / Attention / Critical counts). */
export function StatusDistribution({
  counts,
  onSelect,
}: {
  counts: Record<string, number>;
  onSelect?: (status: string) => void;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const order: StatusKey[] = ['Good', 'Attention Required', 'Critical'];

  return (
    <div className="space-y-2.5">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
        {order.map((k) => {
          const pct = ((counts[k] ?? 0) / total) * 100;
          if (pct === 0) return null;
          return (
            <span
              key={k}
              className={STATUS_STYLES[k].solid}
              style={{ width: `${pct}%` }}
              title={`${k}: ${counts[k] ?? 0} unit${(counts[k] ?? 0) === 1 ? '' : 's'}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {order.map((k) => (
          <button
            key={k}
            type="button"
            disabled={!onSelect}
            onClick={() => onSelect?.(k)}
            className={cn(
              'flex items-center gap-1.5 text-[11px]',
              onSelect ? 'rounded transition-colors hover:bg-ink-100' : 'cursor-default',
            )}
          >
            <StatusDot value={k} />
            <span className="text-ink-600">{k}</span>
            <span className="font-semibold text-ink-900 tabular-nums">{counts[k] ?? 0}</span>
            <span className="text-ink-400">({formatPercent(((counts[k] ?? 0) / total) * 100, 0)})</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Small labelled metric used inside cards. */
export function MiniMetric({
  label,
  value,
  sub,
  tone = 'neutral',
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  const valueColor = {
    neutral: 'text-ink-900',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-red-700',
    info: 'text-blue-700',
  }[tone];

  const body = (
    <>
      <p className="flex items-center gap-1 truncate text-[10px] font-semibold tracking-wider text-ink-400 uppercase">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </p>
      <p className={cn('mt-0.5 text-lg leading-none font-semibold tracking-tight tabular-nums', valueColor)}>{value}</p>
      {sub ? <p className="mt-1 truncate text-[10px] text-ink-500">{sub}</p> : null}
    </>
  );

  return hint ? (
    <Tooltip content={hint}>
      <div className={cn('min-w-0 cursor-help', className)}>{body}</div>
    </Tooltip>
  ) : (
    <div className={cn('min-w-0', className)}>{body}</div>
  );
}

export { Badge };
