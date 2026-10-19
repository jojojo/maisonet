import { Field } from '@/components/form-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Member } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Famille', href: '/members' }];
const palette = ['#ec4899', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6'];

function MemberForm({ member, onDone }: { member?: Member; onDone: () => void }) {
    const form = useForm({ name: member?.name ?? '', color: member?.color ?? palette[5] });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: onDone };
        if (member) form.put(route('members.update', member.id), options);
        else form.post(route('members.store'), options);
    };

    return (
        <form onSubmit={submit} className="grid gap-4">
            <Field label="Prénom" error={form.errors.name}>
                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} autoFocus required />
            </Field>
            <div className="grid gap-1.5 text-sm font-medium">
                Couleur
                <div className="flex flex-wrap gap-2">
                    {palette.map((c) => (
                        <button
                            type="button"
                            key={c}
                            onClick={() => form.setData('color', c)}
                            style={{ backgroundColor: c }}
                            className={cn('size-8 rounded-full', form.data.color === c && 'ring-foreground ring-2 ring-offset-2')}
                            aria-label={`Couleur ${c}`}
                        />
                    ))}
                </div>
                {form.errors.color && <span className="text-destructive text-xs font-normal">{form.errors.color}</span>}
            </div>
            <DialogFooter>
                <Button type="submit" disabled={form.processing}>
                    {member ? 'Enregistrer' : 'Ajouter'}
                </Button>
            </DialogFooter>
        </form>
    );
}

function MemberDialog({ member, open, onOpenChange }: { member?: Member; open: boolean; onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{member ? 'Modifier le membre' : 'Nouveau membre'}</DialogTitle>
                    <DialogDescription>Les tâches peuvent être attribuées à chaque membre de la famille.</DialogDescription>
                </DialogHeader>
                <MemberForm member={member} onDone={() => onOpenChange(false)} />
            </DialogContent>
        </Dialog>
    );
}

function MemberCard({ member }: { member: Member }) {
    const [editing, setEditing] = useState(false);

    const remove = () => {
        if (confirm(`Supprimer ${member.name} ? Ses tâches deviendront non attribuées.`)) {
            router.delete(route('members.destroy', member.id), { preserveScroll: true });
        }
    };

    return (
        <Card>
            <CardContent className="flex items-center gap-3 p-4 sm:p-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white" style={{ backgroundColor: member.color }}>
                    {member.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-semibold">{member.name}</p>
                    <p className="text-muted-foreground text-xs">
                        {member.tasks_count} tâche(s) · {member.open_count} à faire
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                        {member.done_this_week} faite(s) cette semaine
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Modifier">
                        <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={remove} aria-label="Supprimer">
                        <Trash2 />
                    </Button>
                </div>
                <MemberDialog member={member} open={editing} onOpenChange={setEditing} />
            </CardContent>
        </Card>
    );
}

export default function Members({ members }: { members: Member[] }) {
    const [creating, setCreating] = useState(false);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Famille" />
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-xl font-semibold">Famille</h1>
                    <Button onClick={() => setCreating(true)}>
                        <Plus /> Nouveau membre
                    </Button>
                </div>
                {members.length === 0 ? (
                    <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">Ajoute les membres de la famille pour leur attribuer des tâches.</p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {members.map((m) => (
                            <MemberCard key={m.id} member={m} />
                        ))}
                    </div>
                )}
            </div>
            <MemberDialog open={creating} onOpenChange={setCreating} />
        </AppLayout>
    );
}
