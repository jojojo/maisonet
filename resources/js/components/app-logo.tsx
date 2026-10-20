export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-white shadow-sm">
                <img src="/pwa-icons/icon-192.png" className="size-8 rounded-lg object-contain" alt="" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="truncate text-lg leading-none font-extrabold tracking-tight">
                    Maiso'net
                    <span className="ml-1 text-amber-500" aria-hidden>
                        ✦
                    </span>
                </span>
            </div>
        </>
    );
}
