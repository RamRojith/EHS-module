import { cn } from '@/lib/utils';

/* ============================================================================
 * Progress — bar and radial variants used for training / PPE compliance.
 * ==========================================================================*/

export function Progress({
  value,
  max = 100,
  className,
  barClassName,
  tone = 'auto',
  showTarget,
  target = 95,
  size = 'md',
  label,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  tone?: 'auto' | 'blue' | 'green' | 'amber' | 'red' | 'orange';
  showTarget?: boolean;
  target?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const resolved =
    tone !== 'auto'
      ? tone
      : ratio >= target
        ? 'green'
        : ratio >= target - 5
          ? 'amber'
          : 'red';

  const fills: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    orange: 'bg-safety-500',
  };

  const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-2.5' } as const;
  const targetPos = max > 0 ? Math.max(0, Math.min(100, (target / max) * 100)) : 0;

  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-ink-600">{label}</span>
          <span className="font-semibold tabular-nums text-ink-900">{ratio.toFixed(ratio % 1 === 0 ? 0 : 1)}%</span>
        </div>
      ) : null}
      <div
        className={cn('relative w-full overflow-hidden rounded-full bg-ink-100', heights[size])}
        role="progressbar"
        aria-valuenow={Math.round(ratio)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out', fills[resolved], barClassName)}
          style={{ width: `${ratio}%` }}
        />
        {showTarget ? (
          <span
            className="absolute top-0 h-full w-px bg-ink-800/45"
            style={{ left: `${targetPos}%` }}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}

export function ProgressCircle({
  value,
  size = 108,
  stroke = 9,
  tone = 'auto',
  target = 95,
  className,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: 'auto' | 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'navy';
  target?: number;
  className?: string;
  label?: string;
  sublabel?: string;
}) {
  const ratio = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (ratio / 100) * circumference;

  const resolved =
    tone !== 'auto'
      ? tone
      : ratio >= target
        ? 'green'
        : ratio >= target - 5
          ? 'amber'
          : 'red';

  const strokes: Record<string, string> = {
    blue: '#2563eb',
    green: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
    orange: '#f97316',
    navy: '#1e3a5f',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label ?? 'Progress'}: ${ratio}%`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eceef2" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokes[resolved]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-semibold tabular-nums tracking-tight text-ink-900">
          {ratio.toFixed(ratio % 1 === 0 ? 0 : 1)}%
        </span>
        {label ? <span className="mt-0.5 max-w-[80%] text-[10px] leading-tight text-ink-500">{label}</span> : null}
        {sublabel ? <span className="text-[10px] text-ink-400">{sublabel}</span> : null}
      </div>
    </div>
  );
}
