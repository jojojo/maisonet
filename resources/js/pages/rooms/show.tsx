import { RoomFormDialog } from '@/components/room-form-dialog';
import { NewTaskButton } from '@/components/task-form-dialog';
import { TaskList } from '@/components/task-item';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Room, type Task } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
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
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-xl font-semibold">
                        {room.icon} {room.name}
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setEditing(true)} aria-label="Modifier la pièce">
                            <Pencil />
                        </Button>
                        <Button variant="outline" size="icon" onClick={remove} aria-label="Supprimer la pièce">
                            <Trash2 />
                        </Button>
                        <NewTaskButton defaultRoomId={room.id} />
                    </div>
                </div>
                <TaskList tasks={tasks} showRoom={false} empty="Aucune tâche dans cette pièce." />
            </div>
            <RoomFormDialog room={room} open={editing} onOpenChange={setEditing} />
        </AppLayout>
    );
}
