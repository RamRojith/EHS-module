import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { printDocument } from '@/lib/export';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex flex-wrap items-center gap-1 text-[11px] text-ink-500', className)}>
      {items.map((item, i) => (
        <React.Fragment key={`${item.label}-${i}`}>
          {i > 0 ? <ChevronRight className="h-3 w-3 text-ink-300" /> : null}
          {item.to ? (
            <Link to={item.to} className="rounded transition-colors hover:text-navy-700 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-ink-700">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  icon?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  printTitle?: string;
  className?: string;
  /** Rendered under the title on small screens (filters, segmented controls…). */
  toolbar?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  icon,
  badges,
  actions,
  printTitle,
  className,
  toolbar,
}: PageHeaderProps) {
  return (
    <header className={cn('no-print mb-4', className)}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} className="mb-2" /> : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {icon ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-white">
                {icon}
              </span>
            ) : null}
            <h1 className="text-xl font-semibold tracking-tight text-ink-900">{title}</h1>
            {badges}
          </div>
          {description ? <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-500">{description}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button
            variant="outline"
            size="icon"
            onClick={() => printDocument(printTitle ?? title)}
            aria-label="Print / save as PDF"
            title="Print or save as PDF"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {toolbar ? <div className="mt-3">{toolbar}</div> : null}
    </header>
  );
}

export function BackLink({ to, label }: { to: string; label: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="no-print mb-2 inline-flex items-center gap-1 text-[11px] font-medium text-ink-500 transition-colors hover:text-navy-700"
    >
      <ChevronRight className="h-3 w-3 rotate-180" />
      {label}
    </button>
  );
}

/** Label / value pair used across every detail drawer and record view. */
export function DetailField({
  label,
  children,
  className,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">{label}</dt>
      <dd className={cn('mt-0.5 text-sm break-words text-ink-800', mono && 'font-mono text-xs')}>{children ?? '—'}</dd>
    </div>
  );
}

export function SectionTitle({
  children,
  className,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-sm font-semibold tracking-tight text-ink-900">{children}</h2>
      {action}
    </div>
  );
}
