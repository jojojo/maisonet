import { NativeSelect } from '@/components/form-fields';
import { GoalMountain } from '@/components/goal-mountain';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { pointsLabel, requestStatus } from '@/lib/progress';
import { type Member, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, Backpack, Footprints, Gift, ShieldCheck, Star } from 'lucide-react';
import { useState } from 'react';

interface Reward {
    id: number;
    title: string;
    icon: string;
    description: string | null;
    star_cost: number;
    audience: string;
}
interface Progress extends Member {
    weekly_target: number;
    weekly_stars: number;
    week_points: number;
    pending_points: number;
    total_points: number;
    star_balance: number;
    progress: number;
    achieved: boolean;
    target_reward: Reward | null;
}
interface Account {
    id: number;
    name: string;
    email: string;
    member_id: number | null;
}
interface Pending {
    id: number;
    completed_on: string;
    effort_points: number | null;
    awards_points: boolean;
    task: { title: string; room?: { name: string } };
    participants: Member[];
    submitter: { name: string } | null;
}
interface Claim {
    id: number;
    reward_id: number | null;
    member_id: number;
    member: Member;
    title: string;
    icon: string;
    star_cost: number;
    status: string;
}
interface Props {
    canManage: boolean;
    members: Progress[];
    selectedMemberId: number | null;
    weekStart: string;
    weekEnd: string;
    familyProgress: { points: number; target: number };
    accounts: Account[];
    rewards: Reward[];
    pendingCompletions: Pending[];
    pendingCount: number;
    requests: Claim[];
    pointHistory: { id: number; task_title: string; completed_on: string; points: string; is_void: boolean }[];
    starHistory: { id: number; amount: number; type: string; weekly_goal: { week_start: string } | null; reward_request: { title: string } | null }[];
}
const date = (value: string) => new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const panel = 'min-w-0 rounded-2xl border bg-card p-5 sm:p-6';

function Meter({ value, label }: { value: number; label: string }) {
    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(value)}
            className="bg-muted h-3 overflow-hidden rounded-full"
        >
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
        </div>
    );
}

function Settings({ member }: { member: Progress }) {
    const form = useForm({ weekly_target: member.weekly_target, weekly_stars: member.weekly_stars });
    return (
        <form
            className="mt-4 grid gap-3 border-t pt-4"
            onSubmit={(event) => {
                event.preventDefault();
                form.patch(route('goals.settings', member.id), { preserveScroll: true });
            }}
        >
            <p className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="size-4" />
                Réglage parent
            </p>
            <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                    Points à atteindre
                    <Input
                        type="number"
                        min={1}
                        max={1000}
                        required
                        value={form.data.weekly_target}
                        onChange={(e) => form.setData('weekly_target', Number(e.target.value))}
                    />
                </label>
                <label className="grid gap-1 text-sm">
                    Étoiles à gagner
                    <Input
                        type="number"
                        min={1}
                        max={10}
                        required
                        value={form.data.weekly_stars}
                        onChange={(e) => form.setData('weekly_stars', Number(e.target.value))}
                    />
                </label>
            </div>
            <p className="text-muted-foreground text-xs">S’applique à cette semaine et aux suivantes. Les semaines passées restent inchangées.</p>
            {Object.values(form.errors).map((error) => (
                <p role="alert" key={error} className="text-destructive text-sm">
                    {error}
                </p>
            ))}
            <Button variant="outline" disabled={form.processing}>
                Ajuster l’objectif
            </Button>
        </form>
    );
}

function Review({ completion, members }: { completion: Pending; members: Member[] }) {
    const form = useForm({ decision: 'approve', member_ids: completion.participants.map((member) => member.id) });
    const submit = (decision: string) => {
        form.transform((data) => ({ ...data, decision }));
        form.post(route('goals.review-completion', completion.id), { preserveScroll: true });
    };
    return (
        <article className="grid gap-3 rounded-xl border p-4">
            <div>
                <h3 className="font-medium">{completion.task.title}</h3>
                <p className="text-muted-foreground text-xs">
                    {completion.task.room?.name} · {date(completion.completed_on)} · {completion.submitter?.name ?? 'Historique à vérifier'}
                </p>
            </div>
            <p className="text-sm">
                {completion.awards_points
                    ? `${completion.effort_points} points à partager entre les participants réels.`
                    : 'Réalisation sans points : tâche non cotée ou délai entre deux gains non atteint.'}
            </p>
            <fieldset className="flex flex-wrap gap-3">
                <legend className="mb-2 text-xs font-medium">Qui a participé ?</legend>
                {members.map((member) => (
                    <label key={member.id} className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.data.member_ids.includes(member.id)}
                            onChange={(e) =>
                                form.setData(
                                    'member_ids',
                                    e.target.checked ? [...form.data.member_ids, member.id] : form.data.member_ids.filter((id) => id !== member.id),
                                )
                            }
                        />
                        {member.name}
                    </label>
                ))}
            </fieldset>
            {Object.values(form.errors).map((error) => (
                <p role="alert" key={error} className="text-destructive text-sm">
                    {error}
                </p>
            ))}
            <div className="flex flex-wrap gap-2">
                <Button disabled={form.processing || (completion.awards_points && !form.data.member_ids.length)} onClick={() => submit('approve')}>
                    Valider
                </Button>
                <Button variant="outline" disabled={form.processing} onClick={() => submit('reject')}>
                    Refuser
                </Button>
            </div>
        </article>
    );
}

function AccountLink({ account, members }: { account: Account; members: Member[] }) {
    const form = useForm({ member_id: account.member_id === null ? '' : String(account.member_id) });
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.transform((data) => ({ member_id: data.member_id ? Number(data.member_id) : null }));
                form.patch(route('goals.link-account', account.id), { preserveScroll: true });
            }}
            className="grid gap-2 rounded-xl border p-3"
        >
            <div className="min-w-0">
                <p className="font-medium">{account.name}</p>
                <p className="text-muted-foreground text-xs break-all">{account.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <NativeSelect
                    aria-label={`Membre pour ${account.name}`}
                    className="min-w-0 flex-1"
                    value={form.data.member_id}
                    onChange={(e) => form.setData('member_id', e.target.value)}
                >
                    <option value="">Aucun membre relié</option>
                    {members.map((member) => (
                        <option key={member.id} value={member.id}>
                            {member.name}
                        </option>
                    ))}
                </NativeSelect>
                <Button variant="outline" disabled={form.processing}>
                    Relier
                </Button>
            </div>
            {form.errors.member_id && (
                <p role="alert" className="text-destructive text-sm">
                    {form.errors.member_id}
                </p>
            )}
        </form>
    );
}

export default function Goals(props: Props) {
    const { canManage, members, rewards, requests } = props;
    const { flash } = usePage<SharedData>().props;
    const selected = members.find((member) => member.id === props.selectedMemberId);
    const [view, setView] = useState<'adventure' | 'parents'>('adventure');
    const [choosing, setChoosing] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const act = (url: string, data: Record<string, string | number | null>, onSuccess?: () => void) => {
        setError('');
        setBusy(true);
        router.post(url, data, {
            preserveScroll: true,
            onSuccess,
            onError: (errors) => setError(Object.values(errors).join(' ')),
            onFinish: () => setBusy(false),
        });
    };
    const ownRequests = requests.filter((request) => request.member_id === selected?.id);
    const ongoing = ownRequests.filter((request) => ['pending', 'approved'].includes(request.status));
    const target = selected?.target_reward;
    const alreadyRequested = target && ongoing.some((request) => request.reward_id === target.id);
    const parentCount = props.pendingCount + requests.filter((request) => request.status === 'pending').length;
    const requestList = (items: Claim[], parent: boolean) => (
        <div className="grid gap-3">
            {items.map((request) => (
                <article key={request.id} className="bg-card flex flex-wrap items-center gap-3 rounded-2xl border p-4">
                    <span className="text-2xl" aria-hidden>
                        {request.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-medium">{request.title}</h3>
                        <p className="text-muted-foreground text-xs">
                            {parent && `${request.member.name} · `}
                            {request.star_cost} ★ · {requestStatus[request.status] ?? request.status}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {parent && request.status === 'pending' && (
                            <Button disabled={busy} onClick={() => act(route('goals.review-request', request.id), { action: 'approve' })}>
                                Accepter
                            </Button>
                        )}
                        {parent && request.status === 'approved' && (
                            <Button disabled={busy} onClick={() => act(route('goals.review-request', request.id), { action: 'fulfil' })}>
                                Marquer comme offerte
                            </Button>
                        )}
                        {parent && ['pending', 'approved'].includes(request.status) && (
                            <Button
                                variant="outline"
                                disabled={busy}
                                onClick={() => act(route('goals.review-request', request.id), { action: 'reject' })}
                            >
                                Refuser
                            </Button>
                        )}
                        {request.status === 'pending' && (
                            <Button
                                variant="ghost"
                                disabled={busy}
                                onClick={() => act(route('goals.review-request', request.id), { action: 'cancel' })}
                            >
                                Annuler
                            </Button>
                        )}
                    </div>
                </article>
            ))}
        </div>
    );

    return (
        <AppLayout breadcrumbs={[{ title: 'Mon aventure', href: '/goals' }]}>
            <Head title="Mon aventure" />
            <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-5 p-4 pb-8 sm:gap-6 sm:p-6">
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-muted-foreground text-xs font-medium">
                            Du {date(props.weekStart)} au {date(props.weekEnd)}
                        </p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                            À toi le sommet ! <span aria-hidden>🏔️</span>
                        </h1>
                    </div>
                    {canManage && (
                        <div className="bg-muted flex rounded-full p-1" aria-label="Vue des objectifs">
                            <Button
                                className="rounded-full"
                                variant={view === 'adventure' ? 'default' : 'ghost'}
                                aria-pressed={view === 'adventure'}
                                onClick={() => setView('adventure')}
                            >
                                L’aventure
                            </Button>
                            <Button
                                className="rounded-full"
                                variant={view === 'parents' ? 'default' : 'ghost'}
                                aria-pressed={view === 'parents'}
                                onClick={() => setView('parents')}
                            >
                                <ShieldCheck className="size-4" />
                                Coin parents
                                {parentCount > 0 && (
                                    <span className="flex size-5 items-center justify-center rounded-full bg-amber-200 text-xs text-amber-950">
                                        {parentCount}
                                    </span>
                                )}
                            </Button>
                        </div>
                    )}
                </header>
                {flash?.success && (
                    <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                        {flash.success}
                    </p>
                )}
                {error && (
                    <p role="alert" className="text-destructive rounded-xl border p-3">
                        {error}
                    </p>
                )}
                {canManage && (
                    <nav aria-label="Choisir un membre" className="flex flex-wrap gap-2">
                        {members.map((member) => (
                            <Link
                                key={member.id}
                                href={route('goals.index', { member_id: member.id })}
                                preserveState
                                preserveScroll
                                aria-current={selected?.id === member.id ? 'true' : undefined}
                                className={`flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-sm transition-colors ${selected?.id === member.id ? 'border-emerald-500 bg-emerald-50 font-semibold text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100' : 'bg-card hover:bg-muted'}`}
                            >
                                <span
                                    className="flex size-8 items-center justify-center rounded-full text-sm font-bold text-white"
                                    style={{ backgroundColor: member.color }}
                                >
                                    {member.name.charAt(0)}
                                </span>
                                {member.name}
                            </Link>
                        ))}
                    </nav>
                )}
                {view === 'adventure' && (
                    <>
                        {!selected && (
                            <section className={`${panel} text-center`}>
                                <span className="text-6xl" aria-hidden>
                                    🎒
                                </span>
                                <h2 className="mt-4 text-xl font-bold">Ton aventure va bientôt commencer</h2>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    Demande à un parent de relier ton compte à ton prénom dans le Coin parents.
                                </p>
                            </section>
                        )}
                        {selected && (
                            <>
                                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]">
                                    <div className="grid gap-3">
                                        <GoalMountain
                                            key={selected.id}
                                            name={selected.name}
                                            color={selected.color}
                                            points={selected.week_points}
                                            target={selected.weekly_target}
                                            stars={selected.weekly_stars}
                                            pending={selected.pending_points}
                                        />
                                        <Button asChild className="h-12 rounded-2xl text-base">
                                            <Link href={route('tasks.index', { member: selected.id })}>
                                                <Footprints className="size-5" />
                                                Choisir ma prochaine mission
                                                <ArrowRight className="size-4" />
                                            </Link>
                                        </Button>
                                        <p className="text-muted-foreground text-center text-xs">
                                            Une nouvelle montagne chaque lundi. Tes étoiles restent dans ton sac !
                                        </p>
                                    </div>
                                    <section className="grid gap-5 rounded-3xl border border-amber-200 bg-amber-50/50 p-5 sm:p-6 dark:border-amber-900 dark:bg-amber-950/20">
                                        <div className="flex items-center justify-between gap-3">
                                            <h2 className="flex items-center gap-2 font-bold">
                                                <Backpack className="size-5 text-amber-600" />
                                                Mon sac à étoiles
                                            </h2>
                                            <span className="rounded-full bg-amber-100 px-3 py-1 text-lg font-bold text-amber-900">
                                                {selected.star_balance} ★
                                            </span>
                                        </div>
                                        {selected.star_balance < 0 && (
                                            <p className="text-sm text-amber-900 dark:text-amber-200">
                                                Une mission annulée a retiré des étoiles déjà utilisées. Les prochaines rempliront d’abord ton sac.
                                            </p>
                                        )}
                                        <div className="bg-card rounded-2xl border border-amber-100 p-5 text-center dark:border-amber-900">
                                            <span
                                                className="mx-auto flex size-20 items-center justify-center rounded-3xl bg-amber-50 text-5xl dark:bg-amber-950"
                                                aria-hidden
                                            >
                                                {target?.icon ?? '🎁'}
                                            </span>
                                            <p className="text-muted-foreground mt-4 text-xs font-semibold tracking-widest uppercase">
                                                {target ? 'Mon trésor à décrocher' : 'Quel sera ton trésor ?'}
                                            </p>
                                            <h3 className="mt-2 text-xl font-bold">{target?.title ?? 'Une envie, une aventure'}</h3>
                                            {target ? (
                                                <>
                                                    <div
                                                        className="mt-4 flex flex-wrap justify-center gap-2"
                                                        aria-label={`${Math.max(0, selected.star_balance)} étoiles disponibles sur ${target.star_cost} nécessaires`}
                                                    >
                                                        {Array.from({ length: Math.min(8, target.star_cost) }, (_, index) => (
                                                            <Star
                                                                key={index}
                                                                className={`size-6 ${selected.star_balance >= ((index + 1) * target.star_cost) / Math.min(8, target.star_cost) ? 'fill-amber-400 text-amber-400' : 'text-stone-200 dark:text-stone-600'}`}
                                                                aria-hidden
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className="mt-3 text-sm">
                                                        {alreadyRequested
                                                            ? 'Ton trésor est demandé !'
                                                            : selected.star_balance >= target.star_cost
                                                              ? 'Ton sac est assez rempli !'
                                                              : `Encore ${Math.max(0, target.star_cost - selected.star_balance)} étoile(s) pour ce trésor.`}
                                                    </p>
                                                    <p className="text-muted-foreground mt-1 text-xs">
                                                        {target.star_cost} ★{target.audience === 'family' ? ' · À partager en famille' : ''}
                                                    </p>
                                                    <Button
                                                        className="mt-4 w-full rounded-xl"
                                                        disabled={busy || !!alreadyRequested || selected.star_balance < target.star_cost}
                                                        onClick={() =>
                                                            act(route('goals.request-reward'), { member_id: selected.id, reward_id: target.id })
                                                        }
                                                    >
                                                        {alreadyRequested ? 'Demande en cours' : 'Demander mon trésor'}
                                                    </Button>
                                                </>
                                            ) : (
                                                <p className="text-muted-foreground mt-3 text-sm">
                                                    Choisis ce qui te ferait plaisir. Chaque sommet t’en rapproche.
                                                </p>
                                            )}
                                            <Button
                                                className="mt-3 rounded-xl"
                                                variant={target ? 'ghost' : 'default'}
                                                onClick={() => setChoosing(true)}
                                            >
                                                {target ? 'Changer d’envie' : 'Choisir mon trésor'}
                                            </Button>
                                        </div>
                                        <p className="text-muted-foreground text-center text-xs">
                                            Les parents valident tes missions et tes demandes de trésors.
                                        </p>
                                    </section>
                                </div>
                                {ongoing.length > 0 && (
                                    <section className="grid gap-3">
                                        <h2 className="flex items-center gap-2 font-bold">
                                            <Gift className="size-5 text-amber-500" />
                                            Mes trésors en préparation
                                        </h2>
                                        {requestList(ongoing, false)}
                                        <p className="text-muted-foreground text-xs">
                                            Tes étoiles sont réservées. Elles reviennent dans ton sac si la demande est refusée ou annulée.
                                        </p>
                                    </section>
                                )}
                                <details className="bg-card rounded-2xl border p-4">
                                    <summary className="cursor-pointer text-sm font-medium">
                                        Mon carnet d’aventures · {pointsLabel(selected.total_points)} points depuis le début
                                    </summary>
                                    <div className="mt-4 grid gap-5 sm:grid-cols-2">
                                        <section>
                                            <h2 className="text-sm font-semibold">Mes derniers coups de main</h2>
                                            <ul className="mt-2 divide-y">
                                                {props.pointHistory.map((entry) => (
                                                    <li
                                                        key={entry.id}
                                                        className={`flex justify-between gap-3 py-2 text-sm ${entry.is_void ? 'text-muted-foreground line-through' : ''}`}
                                                    >
                                                        <span>
                                                            {entry.task_title}
                                                            <span className="text-muted-foreground block text-xs">
                                                                {date(entry.completed_on)}
                                                                {entry.is_void ? ' · Annulé' : ''}
                                                            </span>
                                                        </span>
                                                        <span className="shrink-0">+{pointsLabel(entry.points)} pts</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            {!props.pointHistory.length && (
                                                <p className="text-muted-foreground mt-2 text-sm">Ton premier coup de main t’attend !</p>
                                            )}
                                        </section>
                                        <section>
                                            <h2 className="text-sm font-semibold">Mes étoiles</h2>
                                            <ul className="mt-2 divide-y">
                                                {props.starHistory.map((entry) => (
                                                    <li key={entry.id} className="flex justify-between gap-3 py-2 text-sm">
                                                        <span>
                                                            {entry.type === 'goal'
                                                                ? `Sommet du ${date(entry.weekly_goal?.week_start ?? props.weekStart)}`
                                                                : `${entry.type === 'refund' ? 'Étoiles rendues' : 'Trésor demandé'} : ${entry.reward_request?.title ?? 'Récompense'}`}
                                                        </span>
                                                        <span className="shrink-0">
                                                            {entry.amount > 0 ? '+' : ''}
                                                            {entry.amount} ★
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    </div>
                                    {ownRequests.filter((request) => !['pending', 'approved'].includes(request.status)).length > 0 && (
                                        <div className="mt-4">
                                            {requestList(
                                                ownRequests.filter((request) => !['pending', 'approved'].includes(request.status)),
                                                false,
                                            )}
                                        </div>
                                    )}
                                </details>
                            </>
                        )}
                    </>
                )}
                {canManage && view === 'parents' && (
                    <div className="grid gap-5">
                        <section className={panel}>
                            <h2 className="flex items-center gap-2 text-lg font-bold">
                                <ShieldCheck className="size-5" />
                                Les missions à valider <span className="text-muted-foreground">({props.pendingCount})</span>
                            </h2>
                            <p className="text-muted-foreground mt-2 text-sm">
                                Vérifie qui a participé : les points sont partagés entre les participants.
                            </p>
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {props.pendingCompletions.map((completion) => (
                                    <Review key={completion.id} completion={completion} members={members} />
                                ))}
                            </div>
                            {!props.pendingCount && <p className="mt-4 text-sm">Tout est à jour, les aventuriers peuvent continuer !</p>}
                            {props.pendingCount > 100 && <p className="mt-3 text-sm">Les 100 plus anciennes missions sont affichées en premier.</p>}
                        </section>
                        <section className={panel}>
                            <h2 className="mb-4 text-lg font-bold">Les trésors demandés</h2>
                            {requestList(requests, true)}
                            {!requests.length && <p className="text-muted-foreground text-sm">Aucune demande pour le moment.</p>}
                            <Button asChild variant="outline" className="mt-4">
                                <Link href={route('rewards.index')}>
                                    <Gift className="size-4" />
                                    Gérer le catalogue de récompenses
                                </Link>
                            </Button>
                        </section>
                        <div className="grid items-start gap-5 lg:grid-cols-2">
                            {selected && (
                                <details className={panel}>
                                    <summary className="cursor-pointer font-semibold">Régler la montagne de {selected.name}</summary>
                                    <Settings key={selected.id} member={selected} />
                                </details>
                            )}
                            <details className={panel}>
                                <summary className="cursor-pointer font-semibold">La progression de la famille</summary>
                                <p className="text-muted-foreground mt-3 mb-3 text-sm">
                                    {pointsLabel(props.familyProgress.points)} / {props.familyProgress.target} points cette semaine. Chacun à son
                                    rythme.
                                </p>
                                <Meter
                                    value={props.familyProgress.target ? (props.familyProgress.points / props.familyProgress.target) * 100 : 0}
                                    label="Progression de la famille"
                                />
                            </details>
                        </div>
                        <details className={panel}>
                            <summary className="cursor-pointer font-semibold">Relier les comptes aux prénoms</summary>
                            <p className="text-muted-foreground mt-3 text-sm">
                                Relie chaque compte à un membre pour lui donner accès à son aventure.
                            </p>
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {props.accounts.map((account) => (
                                    <AccountLink key={`${account.id}-${account.member_id}`} account={account} members={members} />
                                ))}
                            </div>
                        </details>
                    </div>
                )}
                <Dialog open={choosing && !!selected} onOpenChange={setChoosing}>
                    <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Choisis ton prochain trésor</DialogTitle>
                            <DialogDescription>Une envie qui donne envie de grimper !</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {rewards.map((reward) => (
                                <button
                                    key={reward.id}
                                    disabled={busy}
                                    onClick={() => {
                                        if (selected)
                                            act(route('goals.target'), { member_id: selected.id, reward_id: reward.id }, () => setChoosing(false));
                                    }}
                                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors hover:border-amber-400 hover:bg-amber-50 disabled:opacity-50 dark:hover:bg-amber-950 ${target?.id === reward.id ? 'border-amber-400 bg-amber-50 dark:bg-amber-950' : ''}`}
                                >
                                    <span className="text-3xl" aria-hidden>
                                        {reward.icon}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-semibold">{reward.title}</span>
                                        <span className="text-muted-foreground mt-1 block text-xs">
                                            {reward.star_cost} ★{reward.audience === 'family' ? ' · En famille' : ''}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                        {!rewards.length && (
                            <p className="text-muted-foreground py-5 text-center text-sm">
                                Les parents préparent les trésors. Reviens bientôt !
                                {canManage && (
                                    <Link href={route('rewards.index')} className="mt-3 block underline">
                                        Activer des récompenses
                                    </Link>
                                )}
                            </p>
                        )}
                        {error && (
                            <p role="alert" className="text-destructive text-sm">
                                {error}
                            </p>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
