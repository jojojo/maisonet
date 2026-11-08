import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
    <input ref={ref} className={cn('form-control', className)} {...props} />
));
Input.displayName = 'Input';
