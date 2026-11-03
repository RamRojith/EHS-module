import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  size?: 'sm' | 'md';
  id?: string;
  'aria-label'?: string;
}

/**
 * Accessible single-select (combobox + listbox) with full keyboard support.
 * Hand-rolled so the module has no third-party UI runtime dependency.
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  disabled,
  className,
  triggerClassName,
  size = 'md',
  id,
  ...rest
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const generatedId = React.useId();
  const listId = `${generatedId}-list`;
  const triggerId = id ?? `${generatedId}-trigger`;

  const enabledIndexes = React.useMemo(
    () => options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0),
    [options],
  );

  React.useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  React.useEffect(() => {
    if (open) {
      listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, activeIndex]);

  const selected = options.find((o) => o.value === value);

  const commit = (v: string) => {
    onValueChange(v);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const openList = (startAt?: number) => {
    setOpen(true);
    const idx = startAt ?? enabledIndexes.find((i) => options[i].value === value) ?? enabledIndexes[0] ?? -1;
    setActiveIndex(idx);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openList();
      }
      return;
    }
    const pos = enabledIndexes.indexOf(activeIndex);
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(enabledIndexes[Math.min(enabledIndexes.length - 1, pos + 1)] ?? activeIndex);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(enabledIndexes[Math.max(0, pos - 1)] ?? activeIndex);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(enabledIndexes[0] ?? -1);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(enabledIndexes[enabledIndexes.length - 1] ?? -1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeIndex >= 0) commit(options[activeIndex].value);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={rootRef} className={cn('relative', className)} {...rest}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border border-ink-300 bg-white text-left text-ink-900 shadow-xs',
          'transition-colors hover:border-ink-400 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400',
          'focus-visible:border-navy-700 focus-visible:ring-2 focus-visible:ring-navy-700/15 focus-visible:outline-none',
          size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9.5 px-3 text-sm',
          triggerClassName,
        )}
      >
        <span className={cn('truncate', !selected && 'text-ink-400')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={triggerId}
          className="absolute left-0 z-50 mt-1 max-h-64 w-full min-w-max animate-fade-in overflow-y-auto rounded-lg border border-ink-200 bg-white p-1 shadow-overlay"
        >
          {options.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-ink-400">No options</div>
          ) : (
            options.map((o, i) => {
              const isActive = i === activeIndex;
              const isSelected = o.value === value;
              return (
                <div
                  key={o.value}
                  role="option"
                  data-index={i}
                  aria-selected={isSelected}
                  aria-disabled={o.disabled}
                  onMouseEnter={() => !o.disabled && setActiveIndex(i)}
                  onClick={() => !o.disabled && commit(o.value)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                    isActive && !o.disabled && 'bg-ink-100',
                    isSelected && 'font-medium text-navy-800',
                    o.disabled && 'cursor-not-allowed text-ink-400',
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
