import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';
export function Badge({
    variant = 'default',
    className,
    ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'secondary' | 'destructive' | 'outline' }) {
    return (
        <span
            className={cn(
                'badge d-inline-flex align-items-center gap-1',
                variant === 'default'
                    ? 'text-bg-primary'
                    : variant === 'destructive'
                      ? 'text-bg-danger'
                      : variant === 'outline'
                        ? 'border text-body'
                        : 'bg-secondary-subtle text-secondary-emphasis',
                className,
            )}
            {...props}
        />
    );
}
