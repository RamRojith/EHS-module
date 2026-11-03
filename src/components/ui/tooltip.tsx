import * as React from 'react';
import { cn } from '@/lib/utils';

export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 250,
  className,
}: {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<number>();
  const id = React.useId();

  const show = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  } as const;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      {React.cloneElement(children, {
        'aria-describedby': open ? id : undefined,
      })}
      {open ? (
        <span
          role="tooltip"
          id={id}
          className={cn(
            'pointer-events-none absolute z-60 w-max max-w-64 animate-fade-in rounded-md bg-ink-900 px-2 py-1 text-[11px] leading-snug font-medium text-white shadow-overlay',
            positions[side],
            className,
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-ink-300 bg-ink-50 px-1.5 font-sans text-[10px] font-medium text-ink-600',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
