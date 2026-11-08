import { Button } from '@/components/bootstrap/button';
import { Card, CardContent } from '@/components/bootstrap/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/bootstrap/dialog';
import { Input } from '@/components/bootstrap/input';
import { Field } from '@/components/form-fields';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Member, type SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
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
        <form onSubmit={submit} className="d-grid gap-3">
            <Field label="Prénom" error={form.errors.name}>
                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} autoFocus required />
            </Field>
            <div className="d-grid gap-2 small fw-medium">
                Couleur
                <div className="d-flex flex-wrap gap-2">
                    {palette.map((c) => (
                        <button
                            type="button"
                            key={c}
                            onClick={() => form.setData('color', c)}
                            style={{ backgroundColor: c }}
                            className={cn('mn-icon-8 rounded-pill', form.data.color === c && 'border border-primary')}
                            aria-label={`Couleur ${c}`}
                        />
                    ))}
                </div>
                {form.errors.color && <span className="text-danger small fw-normal">{form.errors.color}</span>}
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
    const { auth } = usePage<SharedData>().props;
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(false);

    const remove = () => {
        if (confirm(`Supprimer ${member.name} ? Ses tâches deviendront non attribuées.`)) {
            router.delete(route('members.destroy', member.id), { preserveScroll: true, onError: (errors) => setError(errors.member) });
        }
    };

    return (
        <Card>
            <CardContent className="d-flex align-items-center gap-3 p-3 p-sm-4">
                <span
                    className="d-flex mn-icon-12 flex-shrink-0 align-items-center justify-content-center rounded-pill fs-5 fw-semibold text-white"
                    style={{ backgroundColor: member.color }}
                >
                    {member.name.charAt(0).toUpperCase()}
                </span>
                <div className="mn-min-w-0 flex-fill mn-stack-1">
                    <p className="text-truncate fw-semibold">{member.name}</p>
                    <p className="text-body-secondary small">
                        {member.tasks_count} tâche(s) · {member.open_count} à faire
                    </p>
                    <p className="text-body-secondary small lh-lg">{member.done_this_week} faite(s) cette semaine</p>
                </div>
                {auth.user.is_parent && (
                    <div className="d-flex flex-shrink-0 align-items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Modifier">
                            <Pencil />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={remove} aria-label="Supprimer">
                            <Trash2 />
                        </Button>
                    </div>
                )}
                {error && (
                    <p role="alert" className="text-danger small">
                        {error}
                    </p>
                )}
                <MemberDialog member={member} open={editing} onOpenChange={setEditing} />
            </CardContent>
        </Card>
    );
}

export default function Members({ members }: { members: Member[] }) {
    const { auth } = usePage<SharedData>().props;
    const [creating, setCreating] = useState(false);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Famille" />
            <div className="mx-auto d-flex w-100 mn-content-4xl flex-column gap-4 p-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <h1 className="fs-4 fw-semibold">Famille</h1>
                    {auth.user.is_parent && (
                        <Button onClick={() => setCreating(true)}>
                            <Plus /> Nouveau membre
                        </Button>
                    )}
                </div>
                {members.length === 0 ? (
                    <p className="text-body-secondary rounded-3 border border-dashed p-5 text-center small">
                        Ajoute les membres de la famille pour leur attribuer des tâches.
                    </p>
                ) : (
                    <div className="d-grid gap-3 mn-sm-columns-2">
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
