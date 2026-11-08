import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
export default function AppLogo() {
    const { household } = usePage<SharedData>().props;
    return (
        <>
            <div className="d-flex mn-aspect-1-1 mn-icon-9 align-items-center justify-content-center rounded-3 bg-white shadow-sm">
                <img src="/pwa-icons/icon-192.png" className="mn-icon-8 rounded-3 object-fit-contain" alt="" />
            </div>
            <div className="ms-1 d-grid mn-min-w-0 flex-fill text-start small">
                <span className="text-truncate fs-5 lh-1 fw-bold">
                    Maiso'net
                    <span className="ms-1 text-warning" aria-hidden>
                        ✦
                    </span>
                </span>
                <span className="text-body-secondary mt-1 text-truncate mn-type-10px fw-medium">{household?.name}</span>
            </div>
        </>
    );
}
