export type DayPeriod = 'all_day' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'bedtime';

export const dayPeriodOptions: { value: DayPeriod; label: string; emoji: string }[] = [
    { value: 'all_day', label: 'Toute la journée', emoji: '📅' },
    { value: 'morning', label: 'Matin', emoji: '🌅' },
    { value: 'midday', label: 'Midi', emoji: '☀️' },
    { value: 'afternoon', label: 'Après-midi', emoji: '🌤️' },
    { value: 'evening', label: 'Soirée', emoji: '🌆' },
    { value: 'bedtime', label: 'Coucher', emoji: '🌙' },
];

export function dayPeriodLabel(value: DayPeriod): string {
    return dayPeriodOptions.find((option) => option.value === value)?.label ?? 'Toute la journée';
}
