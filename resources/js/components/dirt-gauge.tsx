import { dirtStyle } from '@/lib/tasks';
import { cn } from '@/lib/utils';

export function DirtGauge({ level, compact = false }: { level: number; compact?: boolean }) {
    const style = dirtStyle(level);

    return (
        <div className={cn('grid gap-1.5', compact ? 'mt-2' : 'mt-3')}>
            <div className={cn('flex items-center justify-between gap-2 text-xs font-medium', style.text)}>
                <span>{style.emoji} {style.label}</span>
                <span>{level} % de saleté</span>
            </div>
            <div
                role="meter"
                aria-label="Niveau de saleté estimé selon la récurrence"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={level}
                aria-valuetext={`${level} % de saleté : ${style.label}`}
                className="h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
            >
                <div className={cn('h-full rounded-full transition-[width,background-color] duration-700 motion-reduce:transition-none', style.fill)} style={{ width: `${level}%` }} />
            </div>
        </div>
    );
}
