export function HouseBuddy({ className }: { className?: string }) {
    return (
        <img
            src="/mascot.png"
            alt=""
            aria-hidden="true"
            width={180}
            height={180}
            className={className}
            style={{ height: 'auto', objectFit: 'contain' }}
        />
    );
}
