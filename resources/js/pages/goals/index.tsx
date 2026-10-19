import { NativeSelect } from '@/components/form-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { pointsLabel, requestStatus } from '@/lib/progress';
import { type Member, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Gift, ShieldCheck, Star, Target, Trophy } from 'lucide-react';
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
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const act = (url: string, data: Record<string, string | number | null>) => {
        setError('');
        setBusy(true);
        router.post(url, data, {
            preserveScroll: true,
            onError: (errors) => setError(Object.values(errors).join(' ')),
            onFinish: () => setBusy(false),
        });
    };
    return (
        <AppLayout breadcrumbs={[{ title: 'Objectifs', href: '/goals' }]}>
            <Head title="Objectifs" />
            <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-6 p-4 pb-8">
                <header className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-amber-50 p-5 sm:p-7 dark:border-emerald-900 dark:from-emerald-950 dark:to-amber-950">
                    <p className="flex items-center gap-2 text-sm font-medium">
                        <Target className="size-4" />À chacun son rythme
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold">Des efforts qui font grandir les envies.</h1>
                    <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">
                        Réalise tes missions, fais valider tes points et atteins ton objectif de la semaine. Les étoiles gagnées s’accumulent pour les
                        récompenses choisies en famille.
                    </p>
                    <p className="mt-3 text-sm">
                        Semaine du {date(props.weekStart)} au {date(props.weekEnd)} · Les points repartent le lundi, les étoiles restent.
                    </p>
                </header>
                {flash?.success && (
                    <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
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
                                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${selected?.id === member.id ? 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100' : ''}`}
                            >
                                <span className="size-3 rounded-full" style={{ backgroundColor: member.color }} />
                                {member.name}
                                <span className="text-xs">{member.star_balance} ★</span>
                            </Link>
                        ))}
                    </nav>
                )}
                {!selected && (
                    <section className={panel}>
                        <h2 className="text-lg font-semibold">Ton espace attend son prénom</h2>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Un parent doit relier ton compte à ton membre de la famille dans cette page. Tes points seront alors affichés ici.
                        </p>
                    </section>
                )}
                {selected && (
                    <>
                        <div className="grid gap-4 lg:grid-cols-2">
                            <section className={panel}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-muted-foreground text-sm">L’objectif de {selected.name}</p>
                                        <h2 className="mt-1 text-2xl font-semibold">
                                            {pointsLabel(selected.week_points)}{' '}
                                            <span className="text-muted-foreground text-base font-normal">/ {selected.weekly_target} points</span>
                                        </h2>
                                    </div>
                                    <Trophy className="size-8 text-amber-500" />
                                </div>
                                <div className="mt-4">
                                    <Meter value={selected.progress} label="Objectif de la semaine" />
                                </div>
                                <p className="mt-3 text-sm">
                                    {selected.achieved
                                        ? `Bravo ! ${selected.weekly_stars} étoile(s) gagnée(s) cette semaine.`
                                        : `Encore ${pointsLabel(Math.max(0, selected.weekly_target - selected.week_points))} points pour gagner ${selected.weekly_stars} étoile(s).`}
                                </p>
                                <p className="text-muted-foreground mt-2 text-xs">
                                    {pointsLabel(selected.pending_points)} point(s) en attente de validation · {pointsLabel(selected.total_points)}{' '}
                                    points validés depuis le début.
                                </p>
                                {canManage && <Settings key={selected.id} member={selected} />}
                            </section>
                            <section className={`${panel} border-amber-200`}>
                                <p className="flex items-center gap-2 text-sm">
                                    <Star className="size-5 text-amber-500" />
                                    Ma réserve d’étoiles
                                </p>
                                <p className="mt-3 text-4xl font-semibold">
                                    {selected.star_balance} <span className="text-amber-500">★</span>
                                </p>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    Les étoiles réservées pour une demande sont déjà déduites. Elles sont rendues en cas de refus ou d’annulation.
                                </p>
                                {selected.star_balance < 0 && (
                                    <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
                                        Une mission annulée a retiré des étoiles déjà utilisées. Les prochaines étoiles combleront ce solde avant une
                                        nouvelle demande.
                                    </p>
                                )}
                                <label className="mt-5 grid gap-2 text-sm font-medium">
                                    Ma prochaine envie
                                    <NativeSelect
                                        disabled={busy}
                                        value={selected.target_reward?.id ?? ''}
                                        onChange={(e) =>
                                            act(route('goals.target'), {
                                                member_id: selected.id,
                                                reward_id: e.target.value ? Number(e.target.value) : null,
                                            })
                                        }
                                    >
                                        <option value="">Choisir une récompense à viser</option>
                                        {rewards.map((reward) => (
                                            <option key={reward.id} value={reward.id}>
                                                {reward.icon} {reward.title} · {reward.star_cost} ★
                                            </option>
                                        ))}
                                    </NativeSelect>
                                </label>
                                {selected.target_reward && (
                                    <div className="mt-3 grid gap-2">
                                        <Meter
                                            value={(selected.star_balance / selected.target_reward.star_cost) * 100}
                                            label="Progression vers la récompense"
                                        />
                                        <p className="text-muted-foreground text-xs">
                                            {Math.max(0, selected.target_reward.star_cost - selected.star_balance)} étoile(s) à gagner pour cette
                                            envie.
                                        </p>
                                    </div>
                                )}
                            </section>
                        </div>
                        <section className={panel}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="flex items-center gap-2 text-lg font-semibold">
                                    <Gift className="size-5" />
                                    Les envies à portée d’étoiles
                                </h2>
                                <Link href={route('rewards.index')} className="text-sm underline">
                                    {canManage ? 'Gérer le catalogue' : 'Voir les récompenses'}
                                </Link>
                            </div>
                            <p className="text-muted-foreground mt-2 text-sm">
                                Une demande réserve les étoiles de {selected.name}, puis un parent la valide. Une récompense collective se finance
                                aussi avec cette réserve et profite à toute la famille.
                            </p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {rewards.map((reward) => {
                                    const existing = requests.some(
                                        (request) =>
                                            request.member_id === selected.id &&
                                            request.reward_id === reward.id &&
                                            ['pending', 'approved'].includes(request.status),
                                    );
                                    return (
                                        <article key={reward.id} className="flex flex-col gap-3 rounded-xl border p-4">
                                            <p className="text-2xl" aria-hidden>
                                                {reward.icon}
                                            </p>
                                            <h3 className="font-medium">{reward.title}</h3>
                                            <p className="text-muted-foreground flex-1 text-sm">{reward.description}</p>
                                            <p className="text-sm font-medium">
                                                {reward.star_cost} ★ · {reward.audience === 'family' ? 'En famille' : 'Pour soi'}
                                            </p>
                                            <Button
                                                disabled={busy || existing || selected.star_balance < reward.star_cost}
                                                onClick={() => act(route('goals.request-reward'), { member_id: selected.id, reward_id: reward.id })}
                                            >
                                                {existing
                                                    ? 'Déjà demandée'
                                                    : selected.star_balance < reward.star_cost
                                                      ? `Encore ${reward.star_cost - selected.star_balance} ★`
                                                      : 'Demander cette récompense'}
                                            </Button>
                                        </article>
                                    );
                                })}
                            </div>
                            {!rewards.length && (
                                <p className="text-muted-foreground mt-4 text-sm">
                                    Les parents peuvent activer les premières envies dans le catalogue de récompenses.
                                </p>
                            )}
                        </section>
                    </>
                )}
                <section className={panel}>
                    <h2 className="text-lg font-semibold">Ensemble pour la maison</h2>
                    <p className="text-muted-foreground mt-2 mb-3 text-sm">
                        {pointsLabel(props.familyProgress.points)} / {props.familyProgress.target} points cette semaine. Chaque coup de main compte,
                        chacun avance à son rythme.
                    </p>
                    <Meter
                        value={props.familyProgress.target ? (props.familyProgress.points / props.familyProgress.target) * 100 : 0}
                        label="Progression de la famille"
                    />
                </section>
                {canManage && (
                    <section className={panel}>
                        <h2 className="flex items-center gap-2 text-lg font-semibold">
                            <ShieldCheck className="size-5" />
                            Missions à valider ({props.pendingCount})
                        </h2>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Vérifie les participants avant de valider : les points sont partagés, jamais multipliés. Les tâches cotées de l’ancien
                            historique attendent aussi ta vérification.
                        </p>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {props.pendingCompletions.map((completion) => (
                                <Review key={completion.id} completion={completion} members={members} />
                            ))}
                        </div>
                        {!props.pendingCount && <p className="text-muted-foreground mt-4 text-sm">Tout est à jour !</p>}
                        {props.pendingCount > 100 && (
                            <p className="mt-3 text-sm">
                                Les 100 plus anciennes missions sont affichées. Les suivantes apparaîtront après validation.
                            </p>
                        )}
                    </section>
                )}
                <section className={panel}>
                    <h2 className="text-lg font-semibold">Demandes de récompenses</h2>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {requests.map((request) => (
                            <article key={request.id} className="grid gap-3 rounded-xl border p-4">
                                <p className="font-medium">
                                    {request.icon} {request.title}
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    {request.member.name} · {request.star_cost} ★ · {requestStatus[request.status] ?? request.status}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {canManage && request.status === 'pending' && (
                                        <Button disabled={busy} onClick={() => act(route('goals.review-request', request.id), { action: 'approve' })}>
                                            Accepter
                                        </Button>
                                    )}
                                    {canManage && request.status === 'approved' && (
                                        <Button disabled={busy} onClick={() => act(route('goals.review-request', request.id), { action: 'fulfil' })}>
                                            Marquer comme offerte
                                        </Button>
                                    )}
                                    {canManage && ['pending', 'approved'].includes(request.status) && (
                                        <Button
                                            variant="outline"
                                            disabled={busy}
                                            onClick={() => act(route('goals.review-request', request.id), { action: 'reject' })}
                                        >
                                            Refuser et rendre les étoiles
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
                    {!requests.length && <p className="text-muted-foreground mt-3 text-sm">Aucune demande pour le moment.</p>}
                </section>
                {selected && (
                    <div className="grid gap-4 lg:grid-cols-2">
                        <section className={panel}>
                            <h2 className="font-semibold">Les derniers points de {selected.name}</h2>
                            <ul className="mt-3 divide-y">
                                {props.pointHistory.map((entry) => (
                                    <li
                                        key={entry.id}
                                        className={`flex justify-between gap-3 py-3 text-sm ${entry.is_void ? 'text-muted-foreground line-through' : ''}`}
                                    >
                                        <span>
                                            {entry.task_title}
                                            <span className="text-muted-foreground block text-xs">
                                                {date(entry.completed_on)}
                                                {entry.is_void ? ' · Annulé' : ''}
                                            </span>
                                        </span>
                                        <span className="shrink-0">+{pointsLabel(Number(entry.points))} pts</span>
                                    </li>
                                ))}
                            </ul>
                            {!props.pointHistory.length && (
                                <p className="text-muted-foreground mt-3 text-sm">Les premières missions validées apparaîtront ici.</p>
                            )}
                        </section>
                        <section className={panel}>
                            <h2 className="font-semibold">Le parcours des étoiles</h2>
                            <ul className="mt-3 divide-y">
                                {props.starHistory.map((entry) => (
                                    <li key={entry.id} className="flex justify-between gap-3 py-3 text-sm">
                                        <span>
                                            {entry.type === 'goal'
                                                ? `Objectif du ${date(entry.weekly_goal?.week_start ?? props.weekStart)}`
                                                : `${entry.type === 'refund' ? 'Étoiles rendues' : 'Étoiles réservées'} : ${entry.reward_request?.title ?? 'Récompense'}`}
                                        </span>
                                        <span className="shrink-0">
                                            {entry.amount > 0 ? '+' : ''}
                                            {entry.amount} ★
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            {!props.starHistory.length && (
                                <p className="text-muted-foreground mt-3 text-sm">Atteins ton objectif pour gagner tes premières étoiles.</p>
                            )}
                        </section>
                    </div>
                )}
                {canManage && (
                    <section className={panel}>
                        <h2 className="text-lg font-semibold">Relier les comptes à la famille</h2>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Chaque compte peut être relié à une personne. Les enfants voient alors leur progression et peuvent demander leurs
                            récompenses. Seuls les parents modifient ces liens.
                        </p>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {props.accounts.map((account) => (
                                <AccountLink key={`${account.id}-${account.member_id}`} account={account} members={members} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
