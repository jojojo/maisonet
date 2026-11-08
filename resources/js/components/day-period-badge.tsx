import { Badge } from '@/components/bootstrap/badge';
import { dayPeriodOptions, type DayPeriod } from '@/lib/day-periods';

export function DayPeriodBadge({ period }: { period: DayPeriod }) {
    const option = dayPeriodOptions.find((option) => option.value === period);
    if (!option) return null;

    return (
        <Badge variant="secondary">
            <span aria-hidden>{option.emoji}</span> {option.label}
        </Badge>
    );
}
