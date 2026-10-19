import { Field, NativeSelect } from '@/components/form-fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { recurrenceOptions, todayISO } from '@/lib/tasks';
import { type Recurrence, type SharedData, type Task } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface Props {
    task?: Task;
    defaultRoomId?: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TaskFormDialog({ task, defaultRoomId, open, onOpenChange }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
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
        notes: task?.notes ?? '',
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
        return <p className="text-muted-foreground text-sm">Crée d'abord une pièce pour pouvoir y ajouter des tâches.</p>;
    }

    return (
        <form onSubmit={submit} className="grid gap-4">
            <Field label="Titre" error={form.errors.title}>
                <Input value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} placeholder="Passer l'aspirateur" autoFocus required />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
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

            <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">Attribuée à</legend>
                <div className="grid grid-cols-2 gap-2">
                    {members.map((member) => (
                        <label key={member.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.data.member_ids.includes(member.id)}
                                onChange={(event) => form.setData('member_ids', event.target.checked
                                    ? [...form.data.member_ids, member.id]
                                    : form.data.member_ids.filter((id) => id !== member.id))}
                            />
                            {member.name}
                        </label>
                    ))}
                </div>
                <p className="text-muted-foreground text-xs">Coche une ou plusieurs personnes. Aucune sélection : tâche non attribuée.</p>
                {Object.entries(form.errors).filter(([key]) => key === 'member_ids' || key.startsWith('member_ids.')).map(([key, error]) => (
                    <p key={key} role="alert" className="text-destructive text-xs">{error}</p>
                ))}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
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
                <Input
                    type="date"
                    value={form.data.next_due_date}
                    onChange={(e) => form.setData('next_due_date', e.target.value)}
                    required={!task}
                />
            </Field>

            <Field label="Notes" error={form.errors.notes}>
                <textarea
                    className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
