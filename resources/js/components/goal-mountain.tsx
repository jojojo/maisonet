import { pointsLabel } from '@/lib/progress';

interface Props {
    name: string;
    color: string;
    points: number;
    target: number;
    stars: number;
    pending: number;
}

const trail = [
    [115, 340],
    [213, 292],
    [174, 243],
    [284, 196],
    [254, 148],
    [333, 92],
];

export function GoalMountain({ name, color, points, target, stars, pending }: Props) {
    const progress = Math.max(0, Math.min(1, points / target));
    const segment = Math.min(trail.length - 2, Math.floor(progress * (trail.length - 1)));
    const fraction = progress * (trail.length - 1) - segment;
    const x = trail[segment][0] + (trail[segment + 1][0] - trail[segment][0]) * fraction;
    const y = trail[segment][1] + (trail[segment + 1][1] - trail[segment][1]) * fraction;
    const complete = progress === 1;

    return (
        <section className="family-card relative isolate overflow-hidden rounded-[2rem] border-2 border-sky-200 bg-[#edf7fa] text-slate-800 dark:border-sky-900 dark:bg-[#152a3d] dark:text-sky-50">
            <div className="relative z-10 px-5 pt-5 sm:px-7 sm:pt-6">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold tracking-[0.16em] text-sky-700 uppercase dark:text-sky-200">L’ascension de {name}</p>
                    <span className="rounded-full bg-white/85 px-3 py-1.5 text-xs font-bold text-amber-800">Sommet : {stars} ★</span>
                </div>
                <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                    {complete ? 'Tu as décroché le sommet !' : points > 0 ? 'Chaque mission te fait grimper.' : 'Prêt pour l’aventure ?'}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-sky-100/75">
                    {complete
                        ? 'Bravo ! Tes étoiles ont rejoint ta réserve.'
                        : `Encore ${pointsLabel(Math.max(0, target - points))} points avant le sommet.`}
                </p>
            </div>
            <svg
                viewBox="0 0 560 405"
                className="mt-1 block w-full"
                role="img"
                aria-label={`${name} a gravi ${Math.round(progress * 100)} % de sa montagne : ${pointsLabel(points)} points sur ${target}.`}
            >
                <defs>
                    <linearGradient id="mountain-face" x1="0" y1="0" x2="1" y2="1">
                        <stop stopColor="#74b5a5" />
                        <stop offset="1" stopColor="#afd5b3" />
                    </linearGradient>
                </defs>
                <circle cx="451" cy="58" r="29" fill="#f9d985" />
                <g stroke="#9b6c28" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M440 54v3m19-3v3m-15 8q6 6 12 0" />
                    <path d="M451 17v-5m31 25 4-2m-67 3-4-2m65 45 4 3" stroke="#efc862" strokeWidth="3" />
                </g>
                <g fill="#efb48c" opacity=".7">
                    <ellipse cx="433" cy="63" rx="4" ry="2.5" />
                    <ellipse cx="467" cy="63" rx="4" ry="2.5" />
                </g>
                <g fill="white" opacity=".8">
                    <path d="M36 82a13 13 0 0 1 24-8 19 19 0 0 1 36 7 10 10 0 0 1 0 20H36a10 10 0 0 1 0-19" />
                    <path d="M372 121a10 10 0 0 1 18-7 15 15 0 0 1 29 6 8 8 0 0 1 0 16h-47a8 8 0 0 1 0-15" />
                </g>
                <path d="M0 309 105 161 216 324 406 174 560 322V405H0Z" fill="#c8dee1" />
                <path d="M80 365 321 88Q333 72 345 88L544 365Z" fill="url(#mountain-face)" stroke="#629c90" strokeWidth="2" strokeLinejoin="round" />
                <path d="m333 73 22 140 189 152Z" fill="#57918b" />
                <path d="m333 73-60 70 34-7 17 16 22-29 29 11Z" fill="#f7fbf7" />
                <path d="M0 365Q107 325 227 362T560 344V405H0Z" fill="#92bd88" />
                <path d="M0 389Q131 359 284 386T560 366V405H0Z" fill="#739f73" />
                <g fill="#427d70">
                    <path d="m53 293-15 32h30Z" />
                    <path d="m53 313-20 34h40Z" />
                    <path d="m467 291-14 30h28Z" />
                    <path d="m467 309-19 32h38Z" />
                    <path d="m422 322-12 26h24Z" />
                </g>
                <g stroke="#5f7555" strokeWidth="4">
                    <path d="M53 339v12M467 336v13M422 345v10" />
                </g>
                <path
                    d={`M${trail.map((point) => point.join(',')).join(' L')}`}
                    fill="none"
                    stroke="#f5f0d8"
                    strokeWidth="15"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d={`M${trail.map((point) => point.join(',')).join(' L')}`}
                    fill="none"
                    stroke="#9b9877"
                    strokeWidth="2"
                    strokeDasharray="2 9"
                    strokeLinecap="round"
                />
                {trail.slice(0, 5).map(([tx, ty], index) => (
                    <g key={index}>
                        <circle cx={tx} cy={ty} r="11" fill={progress >= index / 5 ? '#26745c' : '#fffdf1'} stroke="#fffdf1" strokeWidth="3" />
                        <text
                            x={tx + (index % 2 ? 23 : -23)}
                            y={ty + 5}
                            textAnchor={index % 2 ? 'start' : 'end'}
                            fontSize="13"
                            fontWeight="700"
                            fill="#244c41"
                        >
                            {pointsLabel((target * index) / 5)}
                        </text>
                    </g>
                ))}
                <path d="M365 83V42" stroke="#46616c" strokeWidth="3" strokeLinecap="round" />
                <path d="m366 43 37 8-37 12Z" fill={complete ? '#f4b740' : '#ed9477'} />
                <text x="365" y="30" textAnchor="middle" fontSize="23" fill="#d59c28">
                    ★
                </text>
                <g
                    style={{ transform: `translate(${x}px, ${y}px)`, transition: 'transform 900ms cubic-bezier(.2,.8,.2,1)' }}
                    className="motion-reduce:transition-none"
                >
                    <ellipse cy="14" rx="18" ry="4" fill="#244b42" opacity=".18" />
                    <path d="m-5 5-4 7m14-7 4 7" stroke="#345b55" strokeWidth="5" strokeLinecap="round" />
                    <rect x="-17" y="-17" width="13" height="21" rx="5" fill="#eec872" stroke="#345b55" strokeWidth="2" />
                    <path d="m-9-14-9 10m27-10 9 6" stroke="#345b55" strokeWidth="4" strokeLinecap="round" />
                    <rect x="-10" y="-19" width="21" height="25" rx="8" fill={color} stroke="white" strokeWidth="2.5" />
                    <circle cy="-30" r="12" fill="#ffdfb6" stroke="#345b55" strokeWidth="2" />
                    <path d="M-13-34q1-16 19-9l5 10Z" fill={color} stroke="#345b55" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M-15-33h29" stroke="#345b55" strokeWidth="3" strokeLinecap="round" />
                    <path d="M-4-28v1m9-1v1m-7 5q3 2 5 0" stroke="#345b55" strokeWidth="1.8" strokeLinecap="round" />
                    <text y="-2" textAnchor="middle" fill="white" fontSize="12" fontWeight="800">
                        {name.charAt(0).toUpperCase()}
                    </text>
                </g>
                {complete && (
                    <g fill="#f6b63f">
                        <path d="m292 52 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" />
                        <circle cx="389" cy="79" r="4" />
                        <circle cx="302" cy="90" r="3" />
                    </g>
                )}
            </svg>
            <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-emerald-900/10 bg-white/75 px-5 py-4 text-sm sm:px-7 dark:bg-slate-950/30">
                <p>
                    <strong className="text-lg">{pointsLabel(points)}</strong> / {target} points{' '}
                    <span className="text-slate-500 dark:text-sky-200">cette semaine</span>
                </p>
                {pending > 0 && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">+{pointsLabel(pending)} à valider</span>
                )}
            </div>
        </section>
    );
}
