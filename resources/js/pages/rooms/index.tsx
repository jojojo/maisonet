import { RoomFormDialog } from '@/components/room-form-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Room } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Pièces', href: '/rooms' }];
const roomTints = [
    'bg-amber-100 dark:bg-amber-950/40',
    'bg-rose-100 dark:bg-rose-950/40',
    'bg-sky-100 dark:bg-sky-950/40',
    'bg-emerald-100 dark:bg-emerald-950/40',
    'bg-violet-100 dark:bg-violet-950/40',
];

export default function Rooms({ rooms }: { rooms: Room[] }) {
    const [creating, setCreating] = useState(false);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pièces" />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-extrabold">Les petits coins de la maison</h1>
                        <p className="text-muted-foreground mt-1 text-sm">À chaque pièce, ses petites missions.</p>
                    </div>
                    <Button onClick={() => setCreating(true)}>
                        <Plus /> Nouvelle pièce
                    </Button>
                </div>

                {rooms.length === 0 ? (
                    <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
                        Aucune pièce pour le moment. Commence par créer la cuisine, le salon…
                    </p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {rooms.map((room, index) => (
                            <Link key={room.id} href={route('rooms.show', room.id)} className="min-w-0" prefetch>
                                <Card className="room-card hover:bg-accent/30 h-full transition-[transform,background-color] duration-200 motion-reduce:transition-none">
                                    <CardContent className="flex h-full items-center gap-4 p-4 sm:p-5">
                                        <span
                                            className={`flex size-16 shrink-0 -rotate-3 items-center justify-center rounded-[1.3rem] border border-black/5 text-4xl ${roomTints[index % roomTints.length]}`}
                                        >
                                            {room.icon}
                                        </span>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <p className="font-semibold break-words">{room.name}</p>
                                            <p className="text-muted-foreground text-sm">{room.tasks_count} tâche(s)</p>
                                            {(!!room.overdue_count || !!room.today_count) && (
                                                <p className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
                                                    {!!room.overdue_count && (
                                                        <span className="text-red-600 dark:text-red-400">{room.overdue_count} en retard</span>
                                                    )}
                                                    {!!room.today_count && (
                                                        <span className="text-amber-600 dark:text-amber-400">{room.today_count} aujourd'hui</span>
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
            <RoomFormDialog open={creating} onOpenChange={setCreating} />
        </AppLayout>
    );
}
