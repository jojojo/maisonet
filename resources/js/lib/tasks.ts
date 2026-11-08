import { type Recurrence, type Task, type TaskStatus } from '@/types';

export const recurrenceOptions: { value: Recurrence; label: string; unit: string }[] = [
    { value: 'once', label: 'Ponctuelle', unit: '' },
    { value: 'daily', label: 'Quotidienne', unit: 'jour(s)' },
    { value: 'weekly', label: 'Hebdomadaire', unit: 'semaine(s)' },
    { value: 'monthly', label: 'Mensuelle', unit: 'mois' },
    { value: 'yearly', label: 'Annuelle', unit: 'an(s)' },
];

const every: Record<Exclude<Recurrence, 'once'>, [string, string]> = {
    daily: ['Tous les jours', 'jours'],
    weekly: ['Toutes les semaines', 'semaines'],
    monthly: ['Tous les mois', 'mois'],
    yearly: ['Tous les ans', 'ans'],
};

export function recurrenceLabel(recurrence: Recurrence, interval: number): string {
    if (recurrence === 'once') return 'Ponctuelle';
    const [single, plural] = every[recurrence];
    if (interval <= 1) return single;
    return `Tous les ${interval} ${plural}`.replace('Tous les', recurrence === 'weekly' ? 'Toutes les' : 'Tous les');
}

export function parseDate(value: string): Date {
    return new Date(`${value}T00:00:00`);
}

export function toISO(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(): string {
    return toISO(new Date());
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
    return parseDate(value).toLocaleDateString('fr-FR', options);
}

export function dueLabel(task: Pick<Task, 'status' | 'next_due_date'>): string {
    if (task.status === 'done' || !task.next_due_date) return 'Terminée';

    const days = Math.round((parseDate(task.next_due_date).getTime() - parseDate(todayISO()).getTime()) / 86_400_000);

    if (days < 0) return `En retard de ${-days} j`;
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Demain';
    if (days < 7) return `Dans ${days} j`;
    return formatDate(task.next_due_date);
}

export const statusStyles: Record<TaskStatus, string> = {
    overdue: 'text-danger',
    today: 'text-warning',
    upcoming: 'text-body-secondary',
    done: 'text-success',
};

export function dirtStyle(level: number) {
    if (level >= 90)
        return {
            label: 'Mission nettoyage !',
            emoji: '🧽',
            fill: 'bg-danger',
            text: 'text-danger-emphasis',
            surface: 'border-danger-subtle bg-danger-subtle',
        };
    if (level >= 65)
        return {
            label: 'Un coup de main ?',
            emoji: '🫧',
            fill: 'bg-warning',
            text: 'text-warning-emphasis',
            surface: 'border-warning-subtle bg-warning-subtle',
        };
    if (level >= 35)
        return {
            label: 'Ça se prépare',
            emoji: '🌤️',
            fill: 'bg-warning',
            text: 'text-warning-emphasis',
            surface: 'border-warning-subtle bg-warning-subtle',
        };
    return {
        label: 'Tout propre !',
        emoji: '✨',
        fill: 'bg-success',
        text: 'text-success-emphasis',
        surface: 'border-success-subtle bg-success-subtle',
    };
}

export function sortByDirt(tasks: Task[]): Task[] {
    const urgency = (task: Task) => task.dirt_level ?? (['overdue', 'today'].includes(task.status) ? 100 : task.status === 'done' ? -1 : 0);
    return [...tasks].sort(
        (a, b) =>
            urgency(b) - urgency(a) || (a.next_due_date ?? '9999').localeCompare(b.next_due_date ?? '9999') || a.title.localeCompare(b.title, 'fr'),
    );
}
