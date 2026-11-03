import * as React from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Input, Select } from '@/components/ui';
import { NoResults } from '@/components/ui/empty-state';
import { exportToExcel } from '@/lib/export';

/* ============================================================================
 * Generic DataTable
 * ----------------------------------------------------------------------------
 * One table implementation powers every register in the module:
 *  - client-side search, sorting and pagination
 *  - optional column filters (select or free text)
 *  - sticky header, zebra-free enterprise styling, print friendly
 *  - CSV / Excel export of the *filtered* rows
 * ==========================================================================*/

export type SortDirection = 'asc' | 'desc';

export interface Column<T> {
  key: string;
  header: string;
  /** Cell renderer. */
  cell: (row: T) => React.ReactNode;
  /** Sort accessor; omit to disable sorting for this column. */
  sortValue?: (row: T) => string | number | null;
  /** Wider columns get more room. */
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'right' | 'center';
  /** Hidden below `lg` to keep narrow screens readable. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  /** Free-text filter placeholder; set to enable a text filter on this column. */
  filterPlaceholder?: string;
  /** Select filter options; set to enable a dropdown filter on this column. */
  filterOptions?: { value: string; label: string }[];
  /** Export value (defaults to the sort value). */
  exportValue?: (row: T) => string | number;
}

export interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  allLabel?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  searchable?: boolean;
  /** Extra selects rendered next to search. */
  filters?: FilterDef[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  pageSize?: number;
  exportName?: string;
  exportTitle?: string;
  toolbarExtra?: React.ReactNode;
  emptyLabel?: string;
  className?: string;
  dense?: boolean;
  showExport?: boolean;
  footerSummary?: React.ReactNode;
}

const HIDE_CLASS = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
} as const;

const ALIGN_CLASS = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

export function DataTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  searchPlaceholder = 'Search records…',
  searchable = true,
  filters = [],
  filterValues = {},
  onFilterChange,
  pageSize: pageSizeProp,
  exportName = 'export',
  exportTitle,
  toolbarExtra,
  emptyLabel,
  className,
  dense,
  showExport = true,
  footerSummary,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState<{ key: string; dir: SortDirection } | null>(null);
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(pageSizeProp ?? 10);

  React.useEffect(() => {
    if (pageSizeProp) setPageSize(pageSizeProp);
  }, [pageSizeProp]);

  const activeFilters = React.useMemo(
    () => filters.filter((f) => filterValues[f.key] && filterValues[f.key] !== 'ALL'),
    [filters, filterValues],
  );

  const columnFilters = React.useMemo(() => {
    const map: Record<string, string> = {};
    columns.forEach((c) => {
      if (c.filterPlaceholder || c.filterOptions) {
        const v = filterValues[`col:${c.key}`] ?? '';
        if (v) map[c.key] = v;
      }
    });
    return map;
  }, [columns, filterValues]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = data;

    if (q) {
      rows = rows.filter((row) =>
        columns.some((c) => {
          const v = c.sortValue?.(row);
          return v != null && String(v).toLowerCase().includes(q);
        }),
      );
    }

    activeFilters.forEach((f) => {
      const value = filterValues[f.key];
      const col = columns.find((c) => c.key === f.key);
      rows = rows.filter((row) => String(col?.sortValue?.(row) ?? '') === value);
    });

    Object.entries(columnFilters).forEach(([key, value]) => {
      const col = columns.find((c) => c.key === key);
      rows = rows.filter((row) => String(col?.sortValue?.(row) ?? '').toLowerCase().includes(value.toLowerCase()));
    });

    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        rows = [...rows].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          if (av == null) return 1;
          if (bv == null) return -1;
          const cmp =
            typeof av === 'number' && typeof bv === 'number'
              ? av - bv
              : String(av).localeCompare(String(bv), undefined, { numeric: true });
          return sort.dir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return rows;
  }, [data, query, columns, activeFilters, filterValues, columnFilters, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = React.useMemo(
    () => filtered.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [filtered, safePage, pageSize],
  );

  React.useEffect(() => {
    setPage(0);
  }, [query, filterValues, data.length]);

  const hasQuery = query.trim().length > 0;
  const hasAnyFilter = hasQuery || activeFilters.length > 0 || Object.keys(columnFilters).length > 0;

  const clearAll = () => {
    setQuery('');
    filters.forEach((f) => onFilterChange?.(f.key, 'ALL'));
    columns.forEach((c) => {
      if (c.filterPlaceholder || c.filterOptions) onFilterChange?.(`col:${c.key}`, '');
    });
  };

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const doExport = () => {
    exportToExcel(
      exportName,
      exportTitle ?? exportName,
      filtered,
      columns.map((c) => ({
        header: c.header,
        value: (row: T) => c.exportValue?.(row) ?? c.sortValue?.(row) ?? '',
      })),
    );
  };

  return (
    <div className={cn('w-full', className)}>
      {(searchable || filters.length > 0 || toolbarExtra || showExport) && (
        <div className="no-print mb-3 flex flex-wrap items-center gap-2">
          {searchable ? (
            <div className="relative min-w-52 flex-1 sm:max-w-72">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-8"
                aria-label={searchPlaceholder}
              />
              {hasQuery ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}

          {filters.map((f) => (
            <Select
              key={f.key}
              size="sm"
              className="w-40"
              value={filterValues[f.key] ?? 'ALL'}
              onValueChange={(v) => onFilterChange?.(f.key, v)}
              aria-label={f.label}
              options={[
                { value: 'ALL', label: f.allLabel ?? `All ${f.label.toLowerCase()}` },
                ...f.options,
              ]}
            />
          ))}

          <div className="ml-auto flex items-center gap-2">
            {toolbarExtra}
            {showExport ? (
              <Button size="sm" variant="outline" onClick={doExport} disabled={filtered.length === 0}>
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {hasAnyFilter ? (
        <div className="no-print mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-ink-500">{filtered.length} of {data.length} records</span>
          {activeFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange?.(f.key, 'ALL')}
              className="inline-flex items-center gap-1 rounded bg-ink-100 px-1.5 py-0.5 font-medium text-ink-600 hover:bg-ink-200"
            >
              {f.label}: {f.options.find((o) => o.value === filterValues[f.key])?.label ?? filterValues[f.key]}
              <X className="h-3 w-3" />
            </button>
          ))}
          {Object.entries(columnFilters).map(([key, value]) => (
            <button
              key={key}
              type="button"
              onClick={() => onFilterChange?.(`col:${key}`, '')}
              className="inline-flex items-center gap-1 rounded bg-ink-100 px-1.5 py-0.5 font-medium text-ink-600 hover:bg-ink-200"
            >
              {columns.find((c) => c.key === key)?.header}: {value}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button type="button" onClick={clearAll} className="font-semibold text-navy-700 hover:underline">
            Clear all
          </button>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <NoResults onReset={hasAnyFilter ? clearAll : undefined} label={emptyLabel} />
      ) : (
        <>
          <div className="data-grid-scroll overflow-hidden rounded-lg border border-ink-200">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-ink-50">
                <tr className="border-b border-ink-200">
                  {columns.map((c) => {
                    const sorted = sort?.key === c.key ? sort.dir : false;
                    return (
                      <th
                        key={c.key}
                        scope="col"
                        className={cn(
                          'h-10 px-3 text-[11px] font-semibold tracking-wide text-ink-500 uppercase whitespace-nowrap',
                          ALIGN_CLASS[c.align ?? 'left'],
                          c.hideBelow && HIDE_CLASS[c.hideBelow],
                          c.headerClassName,
                        )}
                      >
                        {c.sortValue ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(c.key)}
                            className={cn(
                              'inline-flex items-center gap-1 transition-colors hover:text-ink-800',
                              c.align === 'right' && 'flex-row-reverse',
                            )}
                          >
                            {c.header}
                            <ArrowUpDown className={cn('h-3 w-3', sorted ? 'text-navy-700' : 'text-ink-300')} />
                          </button>
                        ) : (
                          c.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b border-ink-100 last:border-0',
                      onRowClick && 'cursor-pointer transition-colors hover:bg-safety-50/40',
                    )}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          'px-3 align-middle text-ink-700',
                          dense ? 'py-1.5' : 'py-2.5',
                          ALIGN_CLASS[c.align ?? 'left'],
                          c.hideBelow && HIDE_CLASS[c.hideBelow],
                          c.className,
                        )}
                      >
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="no-print mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-500">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <Select
                size="sm"
                className="w-20"
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(0);
                }}
                aria-label="Rows per page"
                options={[10, 25, 50, 100].map((n) => ({ value: String(n), label: String(n) }))}
              />
              {footerSummary ? <span className="hidden sm:inline">{footerSummary}</span> : null}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="tabular-nums">
                Page {safePage + 1} of {totalPages}
              </span>
              <Button
                size="icon-sm"
                variant="outline"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
