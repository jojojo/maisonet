import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';
type Props = HTMLAttributes<HTMLDivElement>;
export function Card({ className, ...props }: Props) {
    return <div className={cn('card', className)} {...props} />;
}
export function CardHeader({ className, ...props }: Props) {
    return <div className={cn('card-header bg-transparent border-0', className)} {...props} />;
}
export function CardContent({ className, ...props }: Props) {
    return <div className={cn('card-body', className)} {...props} />;
}
export function CardFooter({ className, ...props }: Props) {
    return <div className={cn('card-footer', className)} {...props} />;
}
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return <h3 className={cn('card-title h5', className)} {...props} />;
}
export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn('card-text text-body-secondary', className)} {...props} />;
}
