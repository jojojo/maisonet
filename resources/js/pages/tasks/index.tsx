import { Button } from '@/components/bootstrap/button';
import { Input } from '@/components/bootstrap/input';
import { NativeSelect } from '@/components/form-fields';
import { NewTaskButton } from '@/components/task-form-dialog';
import { TaskList } from '@/components/task-item';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData, type Task } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { BookOpen } from 'lucide-react';
import { FormEvent, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Tâches', href: '/tasks' }];

interface Filters {
    q?: string;
    room?: string | number;
    member?: string;
    status?: string;
}

export default function Tasks({ tasks, filters }: { tasks: Task[]; filters: Filters }) {
    const { rooms, members } = usePage<SharedData>().props;
    const [q, setQ] = useState(filters.q ?? '');

    const apply = (next: Filters) => {
        const params = Object.fromEntries(Object.entries({ ...filters, ...next }).filter(([, v]) => v !== undefined && v !== ''));
        router.get(route('tasks.index'), params, { preserveState: true, preserveScroll: true, only: ['tasks', 'filters'] });
    };

    const search = (e: FormEvent) => {
        e.preventDefault();
        apply({ q });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tâches" />
            <div className="mx-auto d-flex w-100 mn-content-4xl flex-column gap-4 p-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <h1 className="fs-4 fw-semibold">Toutes les tâches</h1>
                    <div className="d-flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <Link href={route('task-templates.index', filters.room ? { room_id: filters.room } : {})}>
                                <BookOpen /> Catalogue
                            </Link>
                        </Button>
                        <NewTaskButton />
                    </div>
                </div>

                <p className="text-body-secondary small">
                    🧽 Du rouge au vert : les missions les plus pressantes passent en premier. Une tâche faite, et sa jauge revient au vert !
                </p>

                <div className="d-grid gap-2 mn-sm-columns-2 mn-lg-columns-4">
                    <form onSubmit={search}>
                        <Input type="search" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
                    </form>
                    <NativeSelect value={String(filters.room ?? '')} onChange={(e) => apply({ room: e.target.value })} aria-label="Pièce">
                        <option value="">Toutes les pièces</option>
                        {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.icon} {r.name}
                            </option>
                        ))}
                    </NativeSelect>
                    <NativeSelect value={filters.member ?? ''} onChange={(e) => apply({ member: e.target.value })} aria-label="Membre">
                        <option value="">Tous les membres</option>
                        <option value="none">Non attribuées</option>
                        {members.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name}
                            </option>
                        ))}
                    </NativeSelect>
                    <NativeSelect value={filters.status ?? ''} onChange={(e) => apply({ status: e.target.value })} aria-label="Statut">
                        <option value="">Tous les statuts</option>
                        <option value="overdue">En retard</option>
                        <option value="today">Aujourd'hui</option>
                        <option value="upcoming">À venir</option>
                        <option value="done">Terminées</option>
                    </NativeSelect>
                </div>

                <TaskList tasks={tasks} empty="Aucune tâche ne correspond." />
            </div>
        </AppLayout>
    );
}
