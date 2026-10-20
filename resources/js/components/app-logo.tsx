import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
export default function AppLogo() {
    const { household } = usePage<SharedData>().props;
    return (
        <>
            <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-white shadow-sm">
                <img src="/pwa-icons/icon-192.png" className="size-8 rounded-lg object-contain" alt="" />
            </div>
            <div className="ml-1 grid min-w-0 flex-1 text-left text-sm">
                <span className="truncate text-lg leading-none font-extrabold tracking-tight">
                    Maiso'net
                    <span className="ml-1 text-amber-500" aria-hidden>
                        ✦
                    </span>
                </span>
                <span className="text-muted-foreground mt-1 truncate text-[10px] font-medium">{household?.name}</span>
            </div>
        </>
    );
}
