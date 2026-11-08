import { Button } from '@/components/bootstrap/button';
import { Card, CardContent } from '@/components/bootstrap/card';
import { RoomFormDialog } from '@/components/room-form-dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Room } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Pièces', href: '/rooms' }];
const roomTints = ['bg-warning-subtle', 'bg-danger-subtle', 'bg-info-subtle', 'bg-success-subtle', 'bg-primary-subtle'];

export default function Rooms({ rooms }: { rooms: Room[] }) {
    const [creating, setCreating] = useState(false);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pièces" />
            <div className="mx-auto d-flex w-100 mn-content-5xl flex-column gap-4 p-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div>
                        <h1 className="fs-3 fw-bold">Les petits coins de la maison</h1>
                        <p className="text-body-secondary mt-1 small">À chaque pièce, ses petites missions.</p>
                    </div>
                    <Button onClick={() => setCreating(true)}>
                        <Plus /> Nouvelle pièce
                    </Button>
                </div>

                {rooms.length === 0 ? (
                    <p className="text-body-secondary rounded-3 border border-dashed p-5 text-center small">
                        Aucune pièce pour le moment. Commence par créer la cuisine, le salon…
                    </p>
                ) : (
                    <div className="d-grid gap-3 mn-sm-columns-2 mn-lg-columns-3">
                        {rooms.map((room, index) => (
                            <Link key={room.id} href={route('rooms.show', room.id)} className="mn-min-w-0" prefetch>
                                <Card className="room-card h-100">
                                    <CardContent className="d-flex h-100 align-items-center gap-3 p-3 p-sm-4">
                                        <span
                                            className={`d-flex mn-icon-16 flex-shrink-0 align-items-center justify-content-center mn-round-1-3rem border border-dark fs-1 ${roomTints[index % roomTints.length]}`}
                                        >
                                            {room.icon}
                                        </span>
                                        <div className="mn-min-w-0 flex-fill mn-stack-1">
                                            <p className="fw-semibold text-break">{room.name}</p>
                                            <p className="text-body-secondary small">{room.tasks_count} tâche(s)</p>
                                            {(!!room.overdue_count || !!room.today_count) && (
                                                <p className="d-flex flex-wrap column-gap-2 row-gap-1 small">
                                                    {!!room.overdue_count && <span className="text-danger">{room.overdue_count} en retard</span>}
                                                    {!!room.today_count && <span className="text-warning">{room.today_count} aujourd'hui</span>}
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
