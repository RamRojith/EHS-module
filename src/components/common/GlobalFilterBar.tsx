import * as React from 'react';
import { CalendarRange, Filter, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Select } from '@/components/ui';
import { useData } from '@/context/DataContext';
import { RANGE_PRESETS, type RangePreset } from '@/data/analytics';
import { DEFAULT_FILTER, DEFAULT_RANGE } from '@/data/analytics';
import { formatDate } from '@/lib/format';

const PRESET_VALUES = RANGE_PRESETS.filter((p) => p.key !== 'CUSTOM').map((p) => ({ value: p.key, label: p.label }));

export function GlobalFilterBar({ className, showUnit = true }: { className?: string; showUnit?: boolean }) {
  const { filter, setRange, setCustomRange, setUnitFilter, resetFilter, activeFilterCount, units } = useData();

  const [customOpen, setCustomOpen] = React.useState(filter.range.preset === 'CUSTOM');
  const [from, setFrom] = React.useState(filter.range.from);
  const [to, setTo] = React.useState(filter.range.to);

  React.useEffect(() => {
    setFrom(filter.range.from);
    setTo(filter.range.to);
    setCustomOpen(filter.range.preset === 'CUSTOM');
  }, [filter.range]);

  const isCustom = filter.range.preset === 'CUSTOM';

  return (
    <div className={cn('no-print', className)}>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2.5 shadow-xs">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink-500 uppercase">
          <Filter className="h-3.5 w-3.5" />
          Scope
        </span>

        {showUnit ? (
          <Select
            size="sm"
            className="w-44"
            aria-label="Unit filter"
            value={filter.unitId}
            onValueChange={(v) => setUnitFilter(v)}
            options={[
              { value: 'ALL', label: 'All 8 units' },
              ...units.map((u) => ({ value: u.id, label: `${u.code} · ${u.shortName}` })),
            ]}
          />
        ) : null}

        <Select
          size="sm"
          className="w-40"
          aria-label="Date range preset"
          value={isCustom ? 'CUSTOM' : filter.range.preset}
          onValueChange={(v) => {
            if (v === 'CUSTOM') {
              setCustomOpen(true);
              return;
            }
            setCustomOpen(false);
            setRange(v as RangePreset);
          }}
          options={[...PRESET_VALUES, { value: 'CUSTOM', label: 'Custom range' }]}
        />

        {isCustom || customOpen ? (
          <div className="flex items-center gap-1.5">
            <label className="sr-only" htmlFor="range-from">
              From date
            </label>
            <input
              id="range-from"
              type="date"
              value={from}
              max={to}
              onChange={(e) => {
                setFrom(e.target.value);
                setCustomOpen(true);
              }}
              onBlur={() => from && setCustomRange(from, to)}
              className="h-8 rounded-md border border-ink-300 px-2 text-xs text-ink-800 focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15 focus:outline-none"
            />
            <span className="text-xs text-ink-400">to</span>
            <label className="sr-only" htmlFor="range-to">
              To date
            </label>
            <input
              id="range-to"
              type="date"
              value={to}
              min={from}
              onChange={(e) => {
                setTo(e.target.value);
                setCustomOpen(true);
              }}
              onBlur={() => to && setCustomRange(from, to)}
              className="h-8 rounded-md border border-ink-300 px-2 text-xs text-ink-800 focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15 focus:outline-none"
            />
          </div>
        ) : null}

        <span className="hidden items-center gap-1 text-[11px] text-ink-400 lg:flex">
          <CalendarRange className="h-3.5 w-3.5" />
          {formatDate(filter.range.from)} – {formatDate(filter.range.to)}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {activeFilterCount > 0 ? (
            <>
              <span className="rounded bg-safety-100 px-1.5 py-0.5 text-[10px] font-semibold text-safety-700">
                {activeFilterCount} active
              </span>
              <Button size="sm" variant="ghost" onClick={resetFilter} title={`Reset to ${DEFAULT_RANGE.preset.replace('_', ' ')}`}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {isCustom && customOpen ? (
        <div className="mt-1.5 flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setCustomOpen(false);
              setRange('THIS_YEAR');
            }}
          >
            <X className="h-3.5 w-3.5" />
            Use {DEFAULT_FILTER.range.preset.replace('_', ' ').toLowerCase()} instead
          </Button>
          <Button size="sm" variant="primary" onClick={() => setCustomRange(from, to)}>
            Apply range
          </Button>
        </div>
      ) : null}
    </div>
  );
}
