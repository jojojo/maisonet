import { useState } from 'react';
import type { MobileApi } from './api';
import type { Completion, Task } from './types';

export function MobileSkipControl({
    task,
    api,
    skipped,
    changed,
    busyChanged,
    initiallyOpen = false,
}: {
    task: Task;
    api: MobileApi;
    skipped: (result: Completion) => void;
    changed: (task: Task, message: string) => void;
    busyChanged?: (busy: boolean) => void;
    initiallyOpen?: boolean;
}) {
    const [open, setOpen] = useState(initiallyOpen);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function submit(undo = false) {
        setBusy(true);
        busyChanged?.(true);
        setError('');
        try {
            if (undo) {
                const result = await api.request<{ data: Task }>(`/tasks/${task.id}/skip`, {
                    method: 'DELETE',
                    body: { completion_id: task.completion_info?.id },
                });
                changed(result.data, 'L’occurrence est de nouveau à faire.');
            } else {
                const result = await api.request<{ data: Completion }>(`/tasks/${task.id}/skip`, { body: { due_on: task.next_due_date, reason } });
                skipped(result.data);
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Réessaie dans un instant.');
        } finally {
            setBusy(false);
            busyChanged?.(false);
        }
    }
    return (
        <div className="skip-section">
            {task.completion_info?.status === 'skipped' && (
                <>
                    <p className="list-note">Occurrence passée{task.completion_info.skip_reason ? ` : ${task.completion_info.skip_reason}` : ''}</p>
                    <button className="text-button" disabled={busy} onClick={() => void submit(true)}>
                        Annuler le passage
                    </button>
                </>
            )}
            {task.next_due_date && (
                <button className="text-button" disabled={busy} onClick={() => setOpen(!open)}>
                    Pas besoin cette fois
                </button>
            )}
            {open && (
                <div className="skip-panel">
                    <p>Passer cette occurrence sans points ? La date du dernier ménage restera inchangée.</p>
                    <label>
                        Motif facultatif
                        <input
                            value={reason}
                            maxLength={500}
                            disabled={busy}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder="Ex. : pas nécessaire cette semaine"
                        />
                    </label>
                    <button className="action" disabled={busy} onClick={() => void submit()}>
                        {busy ? 'Enregistrement…' : 'Passer cette occurrence'}
                    </button>
                </div>
            )}
            {error && (
                <p role="alert" className="message error">
                    {error}
                </p>
            )}
        </div>
    );
}
