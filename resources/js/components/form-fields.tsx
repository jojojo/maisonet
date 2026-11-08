import { cn } from '@/lib/utils';
import * as React from 'react';

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentPropsWithoutRef<'select'>>(({ className, ...props }, ref) => (
    <select ref={ref} className={cn('form-select', className)} {...props} />
));
NativeSelect.displayName = 'NativeSelect';

export function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
    return (
        <label className={cn('d-grid gap-2 small fw-medium', className)}>
            {label}
            {children}
            {error && <span className="text-danger small fw-normal">{error}</span>}
        </label>
    );
}

export function MemberDot({ color, className }: { color: string; className?: string }) {
    return <span className={cn('d-inline-block mn-icon-2-5 flex-shrink-0 rounded-pill', className)} style={{ backgroundColor: color }} aria-hidden />;
}
