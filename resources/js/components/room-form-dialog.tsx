import { Button } from '@/components/bootstrap/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/bootstrap/dialog';
import { Input } from '@/components/bootstrap/input';
import { Field } from '@/components/form-fields';
import { cn } from '@/lib/utils';
import { type Room } from '@/types';
import { useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

const icons = ['🍳', '🛋️', '🛏️', '🛁', '🚽', '🌳', '🚗', '🧺', '🧸', '💼', '🪴', '🏠', '🚪', '📚', '🐾', '🧹'];

export function RoomFormDialog({ room, open, onOpenChange }: { room?: Room; open: boolean; onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{room ? 'Modifier la pièce' : 'Nouvelle pièce'}</DialogTitle>
                    <DialogDescription>Cuisine, salon, chambre, jardin…</DialogDescription>
                </DialogHeader>
                <RoomForm room={room} onDone={() => onOpenChange(false)} />
            </DialogContent>
        </Dialog>
    );
}

function RoomForm({ room, onDone }: { room?: Room; onDone: () => void }) {
    const form = useForm({ name: room?.name ?? '', icon: room?.icon ?? '🏠' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: onDone };
        if (room) form.put(route('rooms.update', room.id), options);
        else form.post(route('rooms.store'), options);
    };

    return (
        <form onSubmit={submit} className="d-grid gap-3">
            <Field label="Nom" error={form.errors.name}>
                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} autoFocus required />
            </Field>
            <div className="d-grid gap-2 small fw-medium">
                Icône
                <div className="d-flex flex-wrap gap-2">
                    {icons.map((i) => (
                        <button
                            type="button"
                            key={i}
                            onClick={() => form.setData('icon', i)}
                            className={cn('mn-icon-9 rounded-2 border fs-5', form.data.icon === i && 'border-primary bg-primary border')}
                            aria-label={`Icône ${i}`}
                        >
                            {i}
                        </button>
                    ))}
                </div>
                {form.errors.icon && <span className="text-danger small fw-normal">{form.errors.icon}</span>}
            </div>
            <DialogFooter>
                <Button type="submit" disabled={form.processing}>
                    {room ? 'Enregistrer' : 'Créer la pièce'}
                </Button>
            </DialogFooter>
        </form>
    );
}
