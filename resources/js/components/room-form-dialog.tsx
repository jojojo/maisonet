import { Field } from '@/components/form-fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
        <form onSubmit={submit} className="grid gap-4">
            <Field label="Nom" error={form.errors.name}>
                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} autoFocus required />
            </Field>
            <div className="grid gap-1.5 text-sm font-medium">
                Icône
                <div className="flex flex-wrap gap-1.5">
                    {icons.map((i) => (
                        <button
                            type="button"
                            key={i}
                            onClick={() => form.setData('icon', i)}
                            className={cn('size-9 rounded-md border text-lg', form.data.icon === i && 'border-primary bg-primary/10 ring-primary ring-2')}
                            aria-label={`Icône ${i}`}
                        >
                            {i}
                        </button>
                    ))}
                </div>
                {form.errors.icon && <span className="text-destructive text-xs font-normal">{form.errors.icon}</span>}
            </div>
            <DialogFooter>
                <Button type="submit" disabled={form.processing}>
                    {room ? 'Enregistrer' : 'Créer la pièce'}
                </Button>
            </DialogFooter>
        </form>
    );
}
