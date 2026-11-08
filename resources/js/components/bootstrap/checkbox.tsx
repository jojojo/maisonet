import { cn } from '@/lib/utils';
import { forwardRef, useEffect, useRef, type InputHTMLAttributes } from 'react';
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'checked' | 'onChange'> & {
    checked?: boolean | 'indeterminate';
    onCheckedChange?: (checked: boolean) => void;
};
export const Checkbox = forwardRef<HTMLInputElement, Props>(({ checked, onCheckedChange, className, ...props }, ref) => {
    const input = useRef<HTMLInputElement | null>(null);
    useEffect(() => {
        if (input.current) input.current.indeterminate = checked === 'indeterminate';
    }, [checked]);
    return (
        <input
            {...props}
            type="checkbox"
            className={cn('form-check-input', className)}
            checked={checked === true}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            ref={(node) => {
                input.current = node;
                if (typeof ref === 'function') ref(node);
                else if (ref) ref.current = node;
            }}
        />
    );
});
Checkbox.displayName = 'Checkbox';
