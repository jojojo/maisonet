import { Button } from '@/components/bootstrap/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/bootstrap/dialog';
import { Input } from '@/components/bootstrap/input';
import { Field, NativeSelect } from '@/components/form-fields';
import { dayPeriodOptions, type DayPeriod } from '@/lib/day-periods';
import { recurrenceOptions, todayISO } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { type EffortSize, type Recurrence, type SharedData, type Task } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface Props {
    task?: Task;
    defaultRoomId?: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const effortOptions: { size: EffortSize; points: number; label: string }[] = [
    { size: 'XS', points: 1, label: 'Très léger' },
    { size: 'S', points: 2, label: 'Léger' },
    { size: 'M', points: 3, label: 'Moyen' },
    { size: 'L', points: 5, label: 'Important' },
    { size: 'XL', points: 8, label: 'Très important' },
];

export function TaskFormDialog({ task, defaultRoomId, open, onOpenChange }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="mn-max-h-90vh overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{task ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
                    <DialogDescription>Pièce, personnes responsables et fréquence de la tâche.</DialogDescription>
                </DialogHeader>
                <TaskForm task={task} defaultRoomId={defaultRoomId} onDone={() => onOpenChange(false)} />
            </DialogContent>
        </Dialog>
    );
}

function TaskForm({ task, defaultRoomId, onDone }: { task?: Task; defaultRoomId?: number; onDone: () => void }) {
    const { rooms, members } = usePage<SharedData>().props;

    const form = useForm({
        title: task?.title ?? '',
        day_period: task?.day_period ?? ('all_day' as DayPeriod),
        notes: task?.notes ?? '',
        effort_size: task?.effort_size ?? ('' as EffortSize | ''),
        room_id: String(task?.room_id ?? defaultRoomId ?? rooms[0]?.id ?? ''),
        member_ids: task?.members.map((member) => member.id) ?? ([] as number[]),
        recurrence: (task?.recurrence ?? 'weekly') as Recurrence,
        interval: task?.interval ?? 1,
        next_due_date: task?.next_due_date ?? (task ? '' : todayISO()),
    });

    const unit = recurrenceOptions.find((o) => o.value === form.data.recurrence)?.unit;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: onDone };
        if (task) form.put(route('tasks.update', task.id), options);
        else form.post(route('tasks.store'), options);
    };

    if (rooms.length === 0) {
        return <p className="text-body-secondary small">Crée d'abord une pièce pour pouvoir y ajouter des tâches.</p>;
    }

    return (
        <form onSubmit={submit} className="d-grid gap-3">
            <Field label="Titre" error={form.errors.title}>
                <Input
                    value={form.data.title}
                    onChange={(e) => form.setData('title', e.target.value)}
                    placeholder="Passer l'aspirateur"
                    autoFocus
                    required
                />
            </Field>

            <fieldset className="d-grid gap-2">
                <legend className="mb-2 small fw-medium">Taille d’effort</legend>
                <div className="d-grid mn-columns-5 gap-2">
                    {effortOptions.map((option) => (
                        <label
                            key={option.size}
                            title={option.label}
                            className={cn(
                                'position-relative d-flex cursor-pointer flex-column align-items-center gap-1 rounded-3 border p-2 text-center',
                                form.data.effort_size === option.size ? 'border-primary bg-primary-subtle text-primary-emphasis' : '',
                            )}
                        >
                            <input
                                type="radio"
                                name="effort_size"
                                value={option.size}
                                checked={form.data.effort_size === option.size}
                                onChange={() => form.setData('effort_size', option.size)}
                                className="form-check-input visually-hidden"
                            />
                            <span className="fw-semibold">{option.size}</span>
                            <span className="small">
                                {option.points} {option.points === 1 ? 'pt' : 'pts'}
                            </span>
                        </label>
                    ))}
                </div>
                <label className="text-body-secondary d-flex align-items-center gap-2 small">
                    <input
                        className="form-check-input"
                        type="radio"
                        name="effort_size"
                        value=""
                        checked={form.data.effort_size === ''}
                        onChange={() => form.setData('effort_size', '')}
                    />
                    Non cotée
                </label>
                <p className="text-body-secondary small">De XS (très léger) à XL (très important), selon le temps et l’énergie nécessaires.</p>
                {form.errors.effort_size && (
                    <p role="alert" className="text-danger small">
                        {form.errors.effort_size}
                    </p>
                )}
            </fieldset>

            <div className="d-grid gap-3 mn-sm-columns-2">
                <Field label="Pièce" error={form.errors.room_id}>
                    <NativeSelect value={form.data.room_id} onChange={(e) => form.setData('room_id', e.target.value)}>
                        {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.icon} {r.name}
                            </option>
                        ))}
                    </NativeSelect>
                </Field>
            </div>

            <fieldset className="d-grid gap-2">
                <legend className="mb-2 small fw-medium">Attribuée à</legend>
                <div className="d-grid mn-columns-2 gap-2">
                    {members.map((member) => (
                        <label key={member.id} className="d-flex align-items-center gap-2 rounded-2 border p-2 small">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                checked={form.data.member_ids.includes(member.id)}
                                onChange={(event) =>
                                    form.setData(
                                        'member_ids',
                                        event.target.checked
                                            ? [...form.data.member_ids, member.id]
                                            : form.data.member_ids.filter((id) => id !== member.id),
                                    )
                                }
                            />
                            {member.name}
                        </label>
                    ))}
                </div>
                <p className="text-body-secondary small">Coche une ou plusieurs personnes. Aucune sélection : tâche non attribuée.</p>
                {Object.entries(form.errors)
                    .filter(([key]) => key === 'member_ids' || key.startsWith('member_ids.'))
                    .map(([key, error]) => (
                        <p key={key} role="alert" className="text-danger small">
                            {error}
                        </p>
                    ))}
            </fieldset>

            <div className="d-grid gap-3 mn-sm-columns-2">
                <Field label="Récurrence" error={form.errors.recurrence}>
                    <NativeSelect value={form.data.recurrence} onChange={(e) => form.setData('recurrence', e.target.value as Recurrence)}>
                        {recurrenceOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </NativeSelect>
                </Field>
                {form.data.recurrence !== 'once' && (
                    <Field label={`Tous les… (${unit})`} error={form.errors.interval}>
                        <Input
                            type="number"
                            min={1}
                            max={365}
                            value={form.data.interval}
                            onChange={(e) => form.setData('interval', Number(e.target.value))}
                        />
                    </Field>
                )}
            </div>

            <Field label={task ? 'Prochaine échéance' : 'Première échéance'} error={form.errors.next_due_date}>
                <Input type="date" value={form.data.next_due_date} onChange={(e) => form.setData('next_due_date', e.target.value)} required={!task} />
            </Field>

            <Field label="Moment de la journée" error={form.errors.day_period}>
                <NativeSelect value={form.data.day_period} onChange={(e) => form.setData('day_period', e.target.value as DayPeriod)}>
                    {dayPeriodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.emoji} {option.label}
                        </option>
                    ))}
                </NativeSelect>
                <p className="text-body-secondary mt-1 small">Un seul créneau, conservé à chaque récurrence.</p>
            </Field>

            <Field label="Notes" error={form.errors.notes}>
                <textarea
                    className="form-control border bg-body mn-min-h-20 w-100 rounded-2 px-3 py-2 small shadow-sm"
                    value={form.data.notes}
                    onChange={(e) => form.setData('notes', e.target.value)}
                />
            </Field>

            <DialogFooter>
                <Button type="submit" disabled={form.processing}>
                    {task ? 'Enregistrer' : 'Créer la tâche'}
                </Button>
            </DialogFooter>
        </form>
    );
}

export function NewTaskButton({ defaultRoomId }: { defaultRoomId?: number }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setOpen(true)}>
                <Plus /> Nouvelle tâche
            </Button>
            <TaskFormDialog open={open} onOpenChange={setOpen} defaultRoomId={defaultRoomId} />
        </>
    );
}
