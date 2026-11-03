import * as React from 'react';
import { ArrowDownRight, ArrowUpRight, Info, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from './card';

export type KpiTone = 'navy' | 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'slate';

const TONE_MAP: Record<KpiTone, { icon: string; accent: string }> = {
  navy: { icon: 'bg-navy-800 text-white', accent: 'bg-navy-800' },
  blue: { icon: 'bg-blue-50 text-blue-600', accent: 'bg-blue-500' },
  green: { icon: 'bg-emerald-50 text-emerald-600', accent: 'bg-emerald-500' },
  amber: { icon: 'bg-amber-50 text-amber-600', accent: 'bg-amber-500' },
  red: { icon: 'bg-red-50 text-red-600', accent: 'bg-red-500' },
  orange: { icon: 'bg-safety-50 text-safety-600', accent: 'bg-safety-500' },
  slate: { icon: 'bg-ink-100 text-ink-600', accent: 'bg-ink-500' },
};

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  icon?: LucideIcon;
  tone?: KpiTone;
  trend?: { value: number; label?: string; direction?: 'up' | 'down' | 'flat'; goodWhen?: 'up' | 'down' };
  target?: { label: string; met: boolean };
  hint?: string;
  onClick?: () => void;
  footer?: React.ReactNode;
  className?: string;
}

export function KpiCard({
  label,
  value,
  unit,
  icon: Icon,
  tone = 'slate',
  trend,
  target,
  hint,
  onClick,
  footer,
  className,
}: KpiCardProps) {
  const toneStyle = TONE_MAP[tone];
  const direction = trend?.direction ?? (trend && trend.value !== 0 ? (trend.value > 0 ? 'up' : 'down') : 'flat');
  const TrendIcon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;
  const isGood = trend?.goodWhen ? (direction === 'flat' ? true : (direction === 'up') === (trend.goodWhen === 'up')) : null;

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-ink-500 uppercase">
          {label}
          {hint ? (
            <span title={hint} aria-label={hint} className="cursor-help text-ink-300 hover:text-ink-500">
              <Info className="h-3 w-3" />
            </span>
          ) : null}
        </p>
        {Icon ? (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', toneStyle.icon)}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="text-2xl leading-none font-semibold tracking-tight text-ink-900 tabular-nums">{value}</span>
        {unit ? <span className="text-xs font-medium text-ink-500">{unit}</span> : null}
      </div>

      <div className="mt-2.5 flex min-h-4 items-center gap-2">
        {trend ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[11px] font-semibold tabular-nums',
              isGood === null
                ? 'bg-ink-100 text-ink-600'
                : isGood
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700',
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {Math.abs(trend.value).toFixed(Math.abs(trend.value) < 10 ? 1 : 0)}%
          </span>
        ) : null}
        {trend?.label ? <span className="truncate text-[11px] text-ink-400">{trend.label}</span> : null}
        {target ? (
          <span
            className={cn(
              'ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
              target.met ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
            )}
          >
            {target.met ? 'On target' : 'Off target'}
          </span>
        ) : null}
      </div>

      {footer ? <div className="mt-3 border-t border-ink-100 pt-2.5 text-[11px] text-ink-500">{footer}</div> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn('block w-full text-left', className)}>
        <Card className="h-full transition-all hover:border-ink-300 hover:shadow-raised">{body}</Card>
      </button>
    );
  }

  return <Card className={cn('h-full', className)}>{body}</Card>;
}
