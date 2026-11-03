import * as React from 'react';
import { cn } from '@/lib/utils';

/* ============================================================================
 * Dropdown menu — compound component; the content positions itself.
 * ==========================================================================*/

interface MenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const MenuContext = React.createContext<MenuContextValue | null>(null);

function useMenu(component: string): MenuContextValue {
  const ctx = React.useContext(MenuContext);
  if (!ctx) throw new Error(`<${component}> must be used inside <DropdownMenu>`);
  return ctx;
}

export function DropdownMenu({ children, className }: { children: React.ReactNode; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <MenuContext.Provider value={{ open, setOpen }}>
      <div ref={rootRef} className={cn('relative inline-flex', className)}>
        {children}
      </div>
    </MenuContext.Provider>
  );
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, children, ...props }, ref) => {
  const { open, setOpen } = useMenu('DropdownMenuTrigger');
  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={(e) => {
        onClick?.(e);
        setOpen(!open);
      }}
      className={cn('inline-flex items-center', className)}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

export function DropdownMenuContent({
  children,
  className,
  align = 'end',
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'end';
}) {
  const { open, setOpen } = useMenu('DropdownMenuContent');
  if (!open) return null;

  return (
    <div
      role="menu"
      onKeyDown={(e) => {
        const items = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'),
        );
        if (!items.length) return;
        const idx = items.indexOf(document.activeElement as HTMLElement);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          items[(idx + 1) % items.length]?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          items[(idx - 1 + items.length) % items.length]?.focus();
        } else if (e.key === 'Tab') {
          setOpen(false);
        }
      }}
      className={cn(
        'absolute top-[calc(100%+6px)] z-50 min-w-52 animate-fade-in rounded-lg border border-ink-200 bg-white p-1 shadow-overlay',
        align === 'end' ? 'right-0' : 'left-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onSelect,
  icon,
  danger,
  shortcut,
  className,
  disabled,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
  shortcut?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { setOpen } = useMenu('DropdownMenuItem');
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        setOpen(false);
      }}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
        'disabled:cursor-not-allowed disabled:text-ink-400',
        danger
          ? 'text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none'
          : 'text-ink-700 hover:bg-ink-100 focus:bg-ink-100 focus:outline-none',
        className,
      )}
    >
      {icon ? <span className="shrink-0 text-ink-400">{icon}</span> : null}
      <span className="truncate">{children}</span>
      {shortcut ? <span className="ml-auto text-[10px] text-ink-400 tabular-nums">{shortcut}</span> : null}
    </button>
  );
}

export function DropdownMenuLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-2.5 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-ink-400 uppercase', className)}>
      {children}
    </div>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-ink-100" role="separator" />;
}
