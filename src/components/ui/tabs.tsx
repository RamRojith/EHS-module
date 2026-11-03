import * as React from 'react';
import { cn } from '@/lib/utils';

/* ============================================================================
 * Tabs — roving focus, arrow-key navigation, ARIA tablist semantics.
 * ==========================================================================*/

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
  baseId: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs(component: string): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error(`<${component}> must be used inside <Tabs>`);
  return ctx;
}

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  const baseId = React.useId();
  return (
    <TabsContext.Provider value={{ value, setValue: onValueChange, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        'flex gap-1 overflow-x-auto border-b border-ink-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...props}
    />
  ),
);
TabsList.displayName = 'TabsList';

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  count?: number;
}

export function TabsTrigger({ value, count, className, children, onClick, onKeyDown, ...props }: TabsTriggerProps) {
  const ctx = useTabs('TabsTrigger');
  const isActive = ctx.value === value;
  const tabId = `${ctx.baseId}-tab-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const triggers = Array.from(
      e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
    );
    const current = triggers.indexOf(e.currentTarget);
    let next = current;
    if (e.key === 'ArrowRight') next = (current + 1) % triggers.length;
    if (e.key === 'ArrowLeft') next = (current - 1 + triggers.length) % triggers.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = triggers.length - 1;
    triggers[next]?.focus();
    triggers[next]?.click();
  };

  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      data-state={isActive ? 'active' : 'inactive'}
      onClick={(e) => {
        ctx.setValue(value);
        onClick?.(e);
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
        isActive
          ? 'border-safety-500 text-navy-900'
          : 'border-transparent text-ink-500 hover:border-ink-200 hover:text-ink-800',
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined ? (
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
            isActive ? 'bg-safety-100 text-safety-700' : 'bg-ink-100 text-ink-500',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
  keepMounted = false,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  keepMounted?: boolean;
}) {
  const ctx = useTabs('TabsContent');
  const isActive = ctx.value === value;

  if (!isActive && !keepMounted) return null;

  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-panel-${value}`}
      aria-labelledby={`${ctx.baseId}-tab-${value}`}
      hidden={!isActive}
      className={cn(isActive ? 'animate-fade-in pt-4' : 'hidden', className)}
    >
      {children}
    </div>
  );
}

/* ------------------------------- Segmented ------------------------------- */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export function Segmented<T extends string>({
  options,
  value,
  onValueChange,
  size = 'md',
  className,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center gap-0.5 rounded-lg bg-ink-100 p-0.5', className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-all',
              size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
              active ? 'bg-white text-navy-900 shadow-sm' : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {opt.icon}
            {opt.label}
            {opt.count !== undefined ? (
              <span className={cn('tabular-nums', active ? 'text-ink-500' : 'text-ink-400')}>{opt.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
