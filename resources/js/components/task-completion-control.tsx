import { MemberDot } from '@/components/form-fields';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { pointsLabel } from '@/lib/progress';
import { formatDate, todayISO } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { type SharedData, type Task } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

function CompletionDialog({ task, onClose, onCompleted }: { task: Task; onClose: () => void; onCompleted?: (title: string) => void }) {
    const { members, auth } = usePage<SharedData>().props;
    const own = auth.user.member_id;
    const initial = !auth.user.is_parent && own ? [own] : task.members.length === 1 ? [task.members[0].id] : own ? [own] : [];
    const form = useForm({ member_ids: initial as number[] });
    const selected = [...form.data.member_ids].sort((a, b) => a - b);
    const cents = task.can_earn_points ? (task.effort_points ?? 0) * 100 : 0;
    const submit = () =>
        form.post(route('tasks.complete', task.id), {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
                onCompleted?.(task.title);
            },
        });

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Qui a réalisé cette mission ?</DialogTitle>
                    <DialogDescription>{task.title}</DialogDescription>
                </DialogHeader>
                {!auth.user.is_parent && !own ? (
                    <p className="text-sm">
                        Un parent doit d’abord relier ton compte à ton profil familial dans{' '}
                        <Link href={route('goals.index')} className="underline">
                            Objectifs
                        </Link>
                        .
                    </p>
                ) : (
                    <>
                        <p className="text-muted-foreground text-sm">
                            Coche les personnes qui ont vraiment participé. Les points sont partagés entre elles.
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {members.map((member) => {
                                const index = selected.indexOf(member.id);
                                const share =
                                    index >= 0 && selected.length
                                        ? (Math.floor(cents / selected.length) + (index < cents % selected.length ? 1 : 0)) / 100
                                        : 0;
                                return (
                                    <label key={member.id} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={index >= 0}
                                            disabled={form.processing || (!auth.user.is_parent && own === member.id)}
                                            onChange={(event) =>
                                                form.setData(
                                                    'member_ids',
                                                    event.target.checked
                                                        ? [...form.data.member_ids, member.id]
                                                        : form.data.member_ids.filter((id) => id !== member.id),
                                                )
                                            }
                                        />
                                        <MemberDot color={member.color} />
                                        <span className="min-w-0 flex-1 break-words">{member.name}</span>
                                        {index >= 0 && <span className="text-xs font-semibold">{pointsLabel(share)} pts</span>}
                                    </label>
                                );
                            })}
                        </div>
                        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                            {task.can_earn_points
                                ? `${task.effort_points} point(s) d’effort au total.`
                                : task.effort_points
                                  ? `Les points ont déjà été attribués ou réservés pour cette période.${task.points_available_on ? ` Nouvelle attribution possible le ${formatDate(task.points_available_on)}.` : ''}`
                                  : 'Cette tâche n’est pas cotée : elle ne rapporte pas de points.'}{' '}
                            {!auth.user.is_parent && 'Un parent doit valider la réalisation avant que les points comptent.'}
                        </p>
                        {Object.values(form.errors).map((error) => (
                            <p key={error} role="alert" className="text-destructive text-sm">
                                {error}
                            </p>
                        ))}
                        <DialogFooter>
                            <Button onClick={submit} disabled={form.processing || (!!task.effort_points && !selected.length)}>
                                {form.processing ? 'Enregistrement…' : auth.user.is_parent ? 'Valider la réalisation' : 'Envoyer aux parents'}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

export function TaskCompletionControl({ task, className, onCompleted }: { task: Task; className?: string; onCompleted?: (title: string) => void }) {
    const { auth } = usePage<SharedData>().props;
    const [open, setOpen] = useState(false);
    const passed = task.completion_info?.status === 'skipped';
    const done = !passed && (task.status === 'done' || task.last_completed_at === todayISO());
    const canUndo = auth.user.is_parent || (task.completion_info?.status === 'pending' && task.completion_info.submitted_by === auth.user.id);
    const label = done ? (canUndo ? 'Annuler cette réalisation' : 'Réalisation validée par un parent') : 'Déclarer la mission terminée';

    if (passed && task.status === 'done')
        return (
            <span
                className={cn('bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl border-2 text-xl', className)}
                title="Occurrence passée sans réalisation"
                aria-label="Occurrence passée"
            >
                −
            </span>
        );

    return (
        <>
            <Checkbox
                className={cn(
                    'bg-card hover:bg-accent data-[state=checked]:bg-primary size-12 touch-manipulation rounded-xl border-[3px] border-[var(--cartoon-ink)] shadow-[2px_3px_0_var(--cartoon-shadow)] transition-[background-color,box-shadow,transform] active:translate-y-px active:shadow-none data-[state=checked]:border-[var(--cartoon-ink)] motion-reduce:transform-none motion-reduce:transition-none [&_svg]:size-8 [&_svg]:stroke-[3.5]',
                    className,
                )}
                checked={done}
                disabled={done && !canUndo}
                aria-label={`${label} : ${task.title}`}
                title={label}
                onCheckedChange={() => (done ? router.delete(route('tasks.undo', task.id), { preserveScroll: true }) : setOpen(true))}
            />
            {open && <CompletionDialog task={task} onClose={() => setOpen(false)} onCompleted={onCompleted} />}
        </>
    );
}
