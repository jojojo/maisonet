import { cn } from '@/lib/utils';
import * as React from 'react';

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentPropsWithoutRef<'select'>>(({ className, ...props }, ref) => (
    <select
        ref={ref}
        className={cn(
            'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50',
            className,
        )}
        {...props}
    />
));
NativeSelect.displayName = 'NativeSelect';

export function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
    return (
        <label className={cn('grid gap-1.5 text-sm font-medium', className)}>
            {label}
            {children}
            {error && <span className="text-destructive text-xs font-normal">{error}</span>}
        </label>
    );
}

export function MemberDot({ color, className }: { color: string; className?: string }) {
    return <span className={cn('inline-block size-2.5 shrink-0 rounded-full', className)} style={{ backgroundColor: color }} aria-hidden />;
}
