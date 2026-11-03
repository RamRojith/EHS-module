import * as React from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="data-grid-scroll w-full">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  ),
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn('sticky top-0 z-10 bg-ink-50/95 backdrop-blur-sm [&_tr]:border-b [&_tr]:border-ink-200', className)}
      {...props}
    />
  ),
);
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  ),
);
TableBody.displayName = 'TableBody';

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean; selected?: boolean }
>(({ className, clickable, selected, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-ink-100 transition-colors last:border-0',
      clickable && 'cursor-pointer hover:bg-safety-50/50',
      selected && 'bg-safety-50/70',
      className,
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { sortable?: boolean; sorted?: 'asc' | 'desc' | false }
>(({ className, sortable, sorted, children, ...props }, ref) => (
  <th
    ref={ref}
    scope="col"
    className={cn(
      'h-10 whitespace-nowrap px-3 text-left align-middle text-[11px] font-semibold tracking-wide text-ink-500 uppercase',
      sortable && 'cursor-pointer select-none hover:text-ink-800',
      className,
    )}
    {...props}
  >
    {sortable ? (
      <button
        type="button"
        className="inline-flex items-center gap-1 transition-colors"
        onClick={props.onClick as unknown as () => void}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') (props.onClick as unknown as () => void)?.();
        }}
      >
        {children}
        {sorted === 'asc' ? (
          <ChevronUp className="h-3.5 w-3.5 text-navy-700" />
        ) : sorted === 'desc' ? (
          <ChevronDown className="h-3.5 w-3.5 text-navy-700" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-ink-300" />
        )}
      </button>
    ) : (
      children
    )}
  </th>
));
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn('px-3 py-2.5 align-middle text-ink-700', className)} {...props} />
  ),
);
TableCell.displayName = 'TableCell';

export const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn('mt-3 text-xs text-ink-500', className)} {...props} />
  ),
);
TableCaption.displayName = 'TableCaption';
