import { Button } from '@/components/bootstrap/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/bootstrap/dialog';
import { Input } from '@/components/bootstrap/input';
import { formatDate } from '@/lib/tasks';
import { type SharedData, type Task } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { SkipForward, Undo2 } from 'lucide-react';
import { useState } from 'react';

export function TaskSkipControl({ task, kiosk = false }: { task: Task; kiosk?: boolean }) {
    const { auth } = usePage<SharedData>().props;
    const [action, setAction] = useState<'skip' | 'undo' | null>(null);
    const form = useForm({ due_on: task.next_due_date ?? '', reason: '', password: '', completion_id: task.completion_info?.id ?? 0 });
    if (!auth.user.is_parent || task.projected) return null;
    const passed = task.completion_info?.status === 'skipped';
    function submit() {
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setAction(null);
                form.reset();
            },
        };
        if (action === 'undo') form.delete(route(kiosk ? 'kiosk.undo-skip' : 'tasks.undo-skip', task.id), options);
        else form.post(route(kiosk ? 'kiosk.skip' : 'tasks.skip', task.id), options);
    }
    function open(next: 'skip' | 'undo') {
        form.clearErrors();
        form.setData({ due_on: task.next_due_date ?? '', reason: '', password: '', completion_id: task.completion_info?.id ?? 0 });
        setAction(next);
    }
    return (
        <div className="mt-2 d-flex flex-wrap align-items-center column-gap-3 row-gap-1 small">
            {task.next_due_date && (
                <button type="button" className="btn btn-link text-body-secondary p-0 mn-min-h-8" onClick={() => open('skip')}>
                    <SkipForward className="mn-icon-3-5" />
                    Pas besoin cette fois
                </button>
            )}
            {passed && (
                <>
                    <span className="text-body-secondary" title={task.completion_info?.skip_reason ?? undefined}>
                        Occurrence passée{task.completion_info?.skip_reason ? ` : ${task.completion_info.skip_reason}` : ''}
                    </span>
                    <button
                        type="button"
                        className="d-inline-flex mn-min-h-8 align-items-center gap-1 text-decoration-underline"
                        onClick={() => open('undo')}
                    >
                        <Undo2 className="mn-icon-3-5" />
                        Annuler le passage
                    </button>
                </>
            )}
            <Dialog
                open={action !== null}
                onOpenChange={(open) => {
                    if (!open && !form.processing) setAction(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{action === 'undo' ? 'Remettre cette occurrence à faire ?' : 'Pas besoin cette fois ?'}</DialogTitle>
                        <DialogDescription>{task.title}</DialogDescription>
                    </DialogHeader>
                    <p className="small">
                        {action === 'undo'
                            ? 'La date précédente sera restaurée, sans modifier les points.'
                            : `L’occurrence du ${task.next_due_date ? formatDate(task.next_due_date) : ''} sera passée sans points. ${task.recurrence === 'once' ? 'Cette tâche ponctuelle sera classée comme passée.' : 'La prochaine échéance sera calculée à partir de cette date, ou d’aujourd’hui si elle est en retard.'}`}
                    </p>
                    {action === 'skip' && (
                        <label className="d-grid gap-2 small">
                            Motif facultatif
                            <Input
                                maxLength={500}
                                value={form.data.reason}
                                onChange={(event) => form.setData('reason', event.target.value)}
                                placeholder="Ex. : la terre est encore humide"
                                disabled={form.processing}
                            />
                        </label>
                    )}
                    {kiosk && (
                        <label className="d-grid gap-2 small">
                            Mot de passe parent
                            <Input
                                type="password"
                                autoComplete="current-password"
                                value={form.data.password}
                                onChange={(event) => form.setData('password', event.target.value)}
                                disabled={form.processing}
                            />
                        </label>
                    )}
                    {Object.values(form.errors).map((error) => (
                        <p className="text-danger small" role="alert" key={error}>
                            {error}
                        </p>
                    ))}
                    <DialogFooter>
                        <Button variant="outline" disabled={form.processing} onClick={() => setAction(null)}>
                            Retour
                        </Button>
                        <Button disabled={form.processing} onClick={submit}>
                            {form.processing ? 'Enregistrement…' : action === 'undo' ? 'Remettre à faire' : 'Passer cette occurrence'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
