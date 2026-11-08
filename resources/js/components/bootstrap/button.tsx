import { cn } from '@/lib/utils';
import { cloneElement, forwardRef, isValidElement, type ButtonHTMLAttributes, type ReactElement } from 'react';

type Variant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type Size = 'default' | 'sm' | 'lg' | 'icon';
const variants = {
    default: 'btn-primary',
    destructive: 'btn-danger',
    outline: 'btn-outline-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-light',
    link: 'btn-link',
};
export function buttonVariants({
    variant = 'default',
    size = 'default',
    className,
}: { variant?: Variant | null; size?: Size | null; className?: string } = {}) {
    return cn('btn', variants[variant ?? 'default'], size === 'sm' && 'btn-sm', size === 'lg' && 'btn-lg', size === 'icon' && 'btn-icon', className);
}
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    asChild?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ variant, size, asChild, className, children, ...props }, ref) => {
    const classes = buttonVariants({ variant, size, className });
    if (asChild && isValidElement(children)) {
        const child = children as ReactElement<{ className?: string }>;
        return cloneElement(child, { ...props, className: cn(classes, child.props.className) });
    }
    return (
        <button ref={ref} className={classes} {...props}>
            {children}
        </button>
    );
});
Button.displayName = 'Button';
