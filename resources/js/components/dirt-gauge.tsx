import { dirtStyle } from '@/lib/tasks';
import { cn } from '@/lib/utils';

export function DirtGauge({ level, compact = false }: { level: number; compact?: boolean }) {
    const style = dirtStyle(level);

    return (
        <div className={cn('d-grid gap-2', compact ? 'mt-2' : 'mt-3')}>
            <div className={cn('d-flex align-items-center justify-content-between gap-2 small fw-medium', style.text)}>
                <span title={compact ? style.label : undefined}>
                    {style.emoji}
                    {!compact && ` ${style.label}`}
                </span>
                <span className="flex-shrink-0">
                    {level} %{!compact && ' de saleté'}
                </span>
            </div>
            <div
                role="meter"
                aria-label="Niveau de saleté estimé selon la récurrence"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={level}
                aria-valuetext={`${level} % de saleté : ${style.label}`}
                className="progress"
            >
                <div className={cn('progress-bar rounded-pill', style.fill)} style={{ width: `${level}%` }} />
            </div>
        </div>
    );
}
