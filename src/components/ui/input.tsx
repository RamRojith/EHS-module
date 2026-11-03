import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-9.5 w-full rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-sm text-ink-900 shadow-xs',
        'placeholder:text-ink-400 transition-colors',
        'focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15 focus:outline-none',
        'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400',
        'aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-500/15',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-20 w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 shadow-xs',
        'placeholder:text-ink-400 transition-colors',
        'focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15 focus:outline-none',
        'disabled:cursor-not-allowed disabled:bg-ink-50',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-xs font-medium text-ink-700', className)}
      {...props}
    />
  ),
);
Label.displayName = 'Label';

export const Field = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5', className)} {...props} />
  ),
);
Field.displayName = 'Field';

export const FieldHint = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-[11px] text-ink-500', className)} {...props} />
);

export const FieldError = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-[11px] font-medium text-red-600', className)} {...props} />
);

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
  /** Convenience for controlled usage: `checked` + `onCheckedChange(checked)`. */
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, onCheckedChange, ...props }, ref) => {
    const generated = React.useId();
    const inputId = id ?? generated;
    return (
      <div className="flex items-start gap-2.5">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-ink-300 bg-white',
            'transition-colors checked:border-navy-800 checked:bg-navy-800',
            'checked:bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\' fill=\'none\' stroke=\'white\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M3.5 8.5l3 3 6-6\'/%3E%3C/svg%3E")] checked:bg-center checked:bg-no-repeat',
            'focus-visible:ring-2 focus-visible:ring-safety-500/40 focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:bg-ink-100',
            className,
          )}
          {...props}
        />
        {label ? (
          <label htmlFor={inputId} className="cursor-pointer text-sm leading-tight text-ink-700 select-none">
            {label}
            {description ? <span className="mt-0.5 block text-[11px] text-ink-500">{description}</span> : null}
          </label>
        ) : null}
      </div>
    );
  },
);
Checkbox.displayName = 'Checkbox';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
}

export function Switch({ checked, onCheckedChange, disabled, id, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-5.5 w-9.5 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-navy-800' : 'bg-ink-300',
        disabled && 'cursor-not-allowed opacity-60',
      )}
      {...rest}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-4.5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
