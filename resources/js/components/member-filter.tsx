import { MemberDot } from '@/components/form-fields';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type Member } from '@/types';
import { router } from '@inertiajs/react';

export function MemberFilter({ members, value, only }: { members: Member[]; value: number | null; only: string[] }) {
    const select = (id: number | null) => {
        const params = Object.fromEntries(new URLSearchParams(window.location.search));
        if (id) params.member = String(id);
        else delete params.member;
        router.get(window.location.pathname, params, { preserveState: true, preserveScroll: true, only: [...only, 'filters'] });
    };

    if (members.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={value === null ? 'default' : 'outline'} onClick={() => select(null)}>
                Tous
            </Button>
            {members.map((m) => (
                <Button key={m.id} size="sm" variant={value === m.id ? 'default' : 'outline'} onClick={() => select(m.id)} className={cn('gap-2')}>
                    <MemberDot color={m.color} /> {m.name}
                </Button>
            ))}
        </div>
    );
}
