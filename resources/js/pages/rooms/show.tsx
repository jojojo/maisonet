import { Button } from '@/components/bootstrap/button';
import { RoomFormDialog } from '@/components/room-form-dialog';
import { NewTaskButton } from '@/components/task-form-dialog';
import { TaskList } from '@/components/task-item';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Room, type Task } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { BookOpen, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function RoomShow({ room, tasks }: { room: Room; tasks: Task[] }) {
    const [editing, setEditing] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Pièces', href: '/rooms' },
        { title: room.name, href: `/rooms/${room.id}` },
    ];

    const remove = () => {
        if (confirm(`Supprimer « ${room.name} » et ses ${tasks.length} tâche(s) ?`)) {
            router.delete(route('rooms.destroy', room.id));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={room.name} />
            <div className="mx-auto d-flex w-100 mn-content-4xl flex-column gap-4 p-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <h1 className="fs-4 fw-semibold">
                        {room.icon} {room.name}
                    </h1>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setEditing(true)} aria-label="Modifier la pièce">
                            <Pencil />
                        </Button>
                        <Button variant="outline" size="icon" onClick={remove} aria-label="Supprimer la pièce">
                            <Trash2 />
                        </Button>
                        <NewTaskButton defaultRoomId={room.id} />
                        <Button variant="outline" asChild>
                            <Link href={route('task-templates.index', { room_id: room.id })}>
                                <BookOpen /> Ajouter des modèles
                            </Link>
                        </Button>
                    </div>
                </div>
                <TaskList tasks={tasks} showRoom={false} empty="Aucune tâche dans cette pièce." />
            </div>
            <RoomFormDialog room={room} open={editing} onOpenChange={setEditing} />
        </AppLayout>
    );
}
