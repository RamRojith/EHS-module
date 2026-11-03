import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/* ============================================================================
 * Empty / error / no-results states
 * ==========================================================================*/

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
  compact,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center',
        compact ? 'py-10' : 'py-16',
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-ink-100 text-ink-400">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-500">{description}</p> : null}
      {action ??
      (actionLabel ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null)}
    </div>
  );
}

export function NoResults({ onReset, label = 'No results found' }: { onReset?: () => void; label?: string }) {
  return (
    <EmptyState
      compact
      title={label}
      description="Try adjusting your search terms, filters, or selected date range."
      actionLabel={onReset ? 'Clear all filters' : undefined}
      onAction={onReset}
    />
  );
}
