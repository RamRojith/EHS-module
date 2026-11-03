import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TONE_STYLES, type Tone } from '@/lib/theme';

const ICONS: Record<Tone, React.ComponentType<{ className?: string }>> = {
  neutral: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  accent: AlertTriangle,
};

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: Tone;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  onDismiss?: () => void;
  variant?: 'soft' | 'outline' | 'left-bar';
}

export function Alert({
  tone = 'info',
  title,
  icon,
  onDismiss,
  variant = 'soft',
  className,
  children,
  ...props
}: AlertProps) {
  const t = TONE_STYLES[tone];
  const Icon = ICONS[tone];
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-lg text-sm',
        variant === 'soft' && cn(t.bg, t.border, 'border p-3.5'),
        variant === 'outline' && cn('border bg-white p-3.5', t.border),
        variant === 'left-bar' && cn('border-y border-r bg-white py-3 pr-3.5 pl-4', t.border),
        className,
      )}
      {...props}
    >
      <span className={cn('mt-0.5 shrink-0', t.text)}>{icon ?? <Icon className="h-4 w-4" />}</span>
      <div className="min-w-0 flex-1">
        {title ? <p className={cn('font-semibold', t.text)}>{title}</p> : null}
        {children ? <div className={cn('text-ink-600', title && 'mt-0.5 text-xs')}>{children}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mt-0.5 h-6 w-6 shrink-0 rounded text-ink-400 transition-colors hover:bg-black/5 hover:text-ink-700"
        >
          <X className="mx-auto h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm font-semibold text-ink-900', className)} {...props} />;
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-xs text-ink-600', className)} {...props} />;
}
