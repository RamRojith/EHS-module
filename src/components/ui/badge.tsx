import * as React from 'react';
import { cn } from '@/lib/utils';
import { TONE_STYLES, toneForValue, type Tone } from '@/lib/theme';

type BadgeVariant = 'soft' | 'solid' | 'outline';

const TONE_SOLID: Record<Tone, string> = {
  neutral: 'bg-ink-600 text-white',
  info: 'bg-blue-600 text-white',
  success: 'bg-emerald-600 text-white',
  warning: 'bg-amber-500 text-white',
  danger: 'bg-red-600 text-white',
  accent: 'bg-safety-500 text-white',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  size?: 'xs' | 'sm';
  /** Renders a small filled dot before the label (status pills). */
  showDot?: boolean;
}

export function Badge({
  tone = 'neutral',
  variant = 'soft',
  icon,
  size = 'sm',
  showDot,
  className,
  children,
  ...props
}: BadgeProps) {
  const t = TONE_STYLES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium whitespace-nowrap',
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
        variant === 'solid' && TONE_SOLID[tone],
        variant === 'soft' && cn(t.bg, t.text, t.border),
        variant === 'outline' && cn('bg-transparent', t.text, t.border),
        className,
      )}
      {...props}
    >
      {showDot ? <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', t.dot)} /> : null}
      {icon}
      {children}
    </span>
  );
}

/** Badge that derives its own tone from the value string. */
export function StatusBadge({
  value,
  variant = 'soft',
  size,
  className,
  showDot,
}: {
  value: string | null | undefined;
  variant?: BadgeVariant;
  size?: 'xs' | 'sm';
  className?: string;
  showDot?: boolean;
}) {
  if (!value) return <span className="text-ink-400">—</span>;
  return (
    <Badge tone={toneForValue(value)} variant={variant} size={size} className={className} showDot={showDot}>
      {value}
    </Badge>
  );
}

/** Coloured dot only — used in dense tables and legends. */
export function StatusDot({ value, className }: { value: string | null | undefined; className?: string }) {
  const tone = toneForValue(value);
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', TONE_STYLES[tone].dot, className)} />;
}
