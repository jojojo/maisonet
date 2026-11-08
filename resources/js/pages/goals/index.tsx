import { Button } from '@/components/bootstrap/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/bootstrap/dialog';
import { Input } from '@/components/bootstrap/input';
import { NativeSelect } from '@/components/form-fields';
import { GoalMountain } from '@/components/goal-mountain';
import { PointAdjustment } from '@/components/point-adjustment';
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
    target_points: number;
    next_target_points: number;
    reward_stars: number;
    next_reward_stars: number;
    mountain_points: number;
    ascent_number: number;
    summits: number;
    pending_points: number;
    total_points: number;
    star_balance: number;
    progress: number;
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
    familyProgress: { points: number; target: number };
    accounts: Account[];
    rewards: Reward[];
    pendingCompletions: Pending[];
    pendingCount: number;
    requests: Claim[];
    pointHistory: { id: number; task_title: string; completed_on: string; points: string; is_void: boolean }[];
    starHistory: {
        id: number;
        amount: number;
        type: string;
        weekly_goal: { week_start: string } | null;
        mountain_goal: { sequence: number } | null;
        reward_request: { title: string } | null;
    }[];
}
const date = (value: string) => new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const panel = 'mn-min-w-0 rounded-4 border bg-body p-4 p-sm-4';

function Meter({ value, label }: { value: number; label: string }) {
    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(value)}
            className="bg-body-tertiary mn-h-3 overflow-hidden rounded-pill"
        >
            <div className="h-100 rounded-pill bg-success" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
        </div>
    );
}

function Settings({ member }: { member: Progress }) {
    const form = useForm({ target_points: member.next_target_points, reward_stars: member.next_reward_stars });
    return (
        <form
            className="mt-3 d-grid gap-3 border-top pt-3"
            onSubmit={(event) => {
                event.preventDefault();
                form.patch(route('goals.settings', member.id), { preserveScroll: true });
            }}
        >
            <p className="d-flex align-items-center gap-2 small fw-medium">
                <ShieldCheck className="mn-icon-4" />
                Réglage parent
            </p>
            <div className="d-grid mn-columns-2 gap-3">
                <label className="d-grid gap-1 small">
                    Points à atteindre
                    <Input
                        type="number"
                        min={1}
                        max={1000}
                        required
                        value={form.data.target_points}
                        onChange={(e) => form.setData('target_points', Number(e.target.value))}
                    />
                </label>
                <label className="d-grid gap-1 small">
                    Étoiles à gagner
                    <Input
                        type="number"
                        min={1}
                        max={10}
                        required
                        value={form.data.reward_stars}
                        onChange={(e) => form.setData('reward_stars', Number(e.target.value))}
                    />
                </label>
            </div>
            <p className="text-body-secondary small">S’applique aux prochaines ascensions. La montagne en cours garde son objectif et ses étoiles.</p>
            {Object.values(form.errors).map((error) => (
                <p role="alert" key={error} className="text-danger small">
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
    const form = useForm({
        decision: 'approve',
        member_ids: completion.participants.map((member) => member.id),
        awarded_points: String(completion.effort_points ?? 0),
        review_note: '',
    });
    const validPoints =
        form.data.awarded_points !== '' &&
        Number.isInteger(Number(form.data.awarded_points)) &&
        Number(form.data.awarded_points) >= 0 &&
        Number(form.data.awarded_points) <= 100;
    const submit = (decision: string) => {
        form.transform((data) => ({
            ...data,
            decision,
            awarded_points: decision === 'approve' && completion.awards_points ? Number(data.awarded_points) : null,
        }));
        form.post(route('goals.review-completion', completion.id), { preserveScroll: true });
    };
    return (
        <article className="d-grid gap-3 rounded-3 border p-3">
            <div>
                <h3 className="fw-medium">{completion.task.title}</h3>
                <p className="text-body-secondary small">
                    {completion.task.room?.name} · {date(completion.completed_on)} · {completion.submitter?.name ?? 'Historique à vérifier'}
                </p>
            </div>
            <p className="small">
                {completion.awards_points
                    ? `${form.data.awarded_points || '0'} points à partager entre les participants réels.`
                    : 'Réalisation sans points : tâche non cotée ou délai entre deux gains non atteint.'}
            </p>
            <fieldset className="d-flex flex-wrap gap-3">
                <legend className="mb-2 small fw-medium">Qui a participé ?</legend>
                {members.map((member) => (
                    <label key={member.id} className="d-flex align-items-center gap-2 small">
                        <input
                            className="form-check-input"
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
            {completion.awards_points && (
                <PointAdjustment
                    basePoints={completion.effort_points ?? 0}
                    value={form.data.awarded_points}
                    onChange={(value) => form.setData('awarded_points', value)}
                    note={form.data.review_note}
                    onNoteChange={(value) => form.setData('review_note', value)}
                    disabled={form.processing}
                />
            )}
            {Object.values(form.errors).map((error) => (
                <p role="alert" key={error} className="text-danger small">
                    {error}
                </p>
            ))}
            <div className="d-flex flex-wrap gap-2">
                <Button
                    disabled={form.processing || (completion.awards_points && (!form.data.member_ids.length || !validPoints))}
                    onClick={() => submit('approve')}
                >
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
            className="d-grid gap-2 rounded-3 border p-3"
        >
            <div className="mn-min-w-0">
                <p className="fw-medium">{account.name}</p>
                <p className="text-body-secondary small text-break">{account.email}</p>
            </div>
            <div className="d-flex flex-wrap gap-2">
                <NativeSelect
                    aria-label={`Membre pour ${account.name}`}
                    className="mn-min-w-0 flex-fill"
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
                <p role="alert" className="text-danger small">
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
        <div className="d-grid gap-3">
            {items.map((request) => (
                <article key={request.id} className="bg-body d-flex flex-wrap align-items-center gap-3 rounded-4 border p-3">
                    <span className="fs-3" aria-hidden>
                        {request.icon}
                    </span>
                    <div className="mn-min-w-0 flex-fill">
                        <h3 className="fw-medium">{request.title}</h3>
                        <p className="text-body-secondary small">
                            {parent && `${request.member.name} · `}
                            {request.star_cost} ★ · {requestStatus[request.status] ?? request.status}
                        </p>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
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
            <div className="mx-auto d-grid w-100 mn-content-6xl mn-min-w-0 gap-4 p-3 pb-5 gap-sm-4 p-sm-4">
                <header className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div>
                        <p className="text-body-secondary small fw-medium">
                            Ascension n° {selected?.ascent_number ?? 1} · {selected?.summits ?? 0} sommet(s) atteint(s)
                        </p>
                        <h1 className="mt-1 fs-3 fw-bold mn-sm-heading-3xl">
                            À toi le sommet ! <span aria-hidden>🏔️</span>
                        </h1>
                    </div>
                    {canManage && (
                        <div className="bg-body-tertiary d-flex rounded-pill p-1" aria-label="Vue des objectifs">
                            <Button
                                className="rounded-pill"
                                variant={view === 'adventure' ? 'default' : 'ghost'}
                                aria-pressed={view === 'adventure'}
                                onClick={() => setView('adventure')}
                            >
                                L’aventure
                            </Button>
                            <Button
                                className="rounded-pill"
                                variant={view === 'parents' ? 'default' : 'ghost'}
                                aria-pressed={view === 'parents'}
                                onClick={() => setView('parents')}
                            >
                                <ShieldCheck className="mn-icon-4" />
                                Coin parents
                                {parentCount > 0 && (
                                    <span className="d-flex mn-icon-5 align-items-center justify-content-center rounded-pill bg-warning-subtle small text-warning-emphasis">
                                        {parentCount}
                                    </span>
                                )}
                            </Button>
                        </div>
                    )}
                </header>
                {flash?.success && (
                    <p role="status" className="rounded-3 bg-success-subtle p-3 small text-success-emphasis">
                        {flash.success}
                    </p>
                )}
                {error && (
                    <p role="alert" className="text-danger rounded-3 border p-3">
                        {error}
                    </p>
                )}
                {canManage && (
                    <nav aria-label="Choisir un membre" className="d-flex flex-wrap gap-2">
                        {members.map((member) => (
                            <Link
                                key={member.id}
                                href={route('goals.index', { member_id: member.id })}
                                preserveState
                                preserveScroll
                                aria-current={selected?.id === member.id ? 'true' : undefined}
                                className={`d-flex align-items-center gap-2 rounded-pill border py-2 pe-3 ps-2 small ${selected?.id === member.id ? 'border-success bg-success-subtle fw-semibold text-success-emphasis' : 'bg-body'}`}
                            >
                                <span
                                    className="d-flex mn-icon-8 align-items-center justify-content-center rounded-pill small fw-bold text-white"
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
                                <span className="display-4" aria-hidden>
                                    🎒
                                </span>
                                <h2 className="mt-3 fs-4 fw-bold">Ton aventure va bientôt commencer</h2>
                                <p className="text-body-secondary mt-2 small">
                                    Demande à un parent de relier ton compte à ton prénom dans le Coin parents.
                                </p>
                            </section>
                        )}
                        {selected && (
                            <>
                                <div className="d-grid align-items-start gap-4 mn-lg-columns-minmax-0-1-55fr-minmax-280px-1fr">
                                    <div className="d-grid gap-3">
                                        <GoalMountain
                                            key={selected.id}
                                            name={selected.name}
                                            color={selected.color}
                                            points={selected.mountain_points}
                                            target={selected.target_points}
                                            stars={selected.reward_stars}
                                            pending={selected.pending_points}
                                        />
                                        <Button asChild className="mn-h-12 rounded-4 fs-6">
                                            <Link href={route('tasks.index', { member: selected.id })}>
                                                <Footprints className="mn-icon-5" />
                                                Choisir ma prochaine mission
                                                <ArrowRight className="mn-icon-4" />
                                            </Link>
                                        </Button>
                                        <p className="text-body-secondary text-center small">
                                            Chaque sommet donne ses étoiles, puis la montagne repart à zéro, sans report du dépassement. Aucun retour
                                            à zéro le lundi.
                                        </p>
                                    </div>
                                    <section className="family-card d-grid gap-4 mn-round-2rem border-2 border-warning bg-warning-subtle p-4 p-sm-4">
                                        <div className="d-flex align-items-center justify-content-between gap-3">
                                            <h2 className="d-flex align-items-center gap-2 fw-bold">
                                                <Backpack className="mn-icon-5 text-warning" />
                                                Mon sac à étoiles
                                            </h2>
                                            <span className="rounded-pill bg-warning-subtle px-3 py-1 fs-5 fw-bold text-warning-emphasis">
                                                {selected.star_balance} ★
                                            </span>
                                        </div>
                                        {selected.star_balance < 0 && (
                                            <p className="small text-warning-emphasis">
                                                Une mission annulée a retiré des étoiles déjà utilisées. Les prochaines rempliront d’abord ton sac.
                                            </p>
                                        )}
                                        <div className="bg-body rounded-4 border border-warning-subtle p-4 text-center">
                                            <span
                                                className="mx-auto d-flex mn-icon-20 align-items-center justify-content-center rounded-5 border-2 border-warning-subtle bg-warning-subtle display-5 shadow-sm"
                                                aria-hidden
                                            >
                                                {target?.icon ?? '🎁'}
                                            </span>
                                            <p className="text-body-secondary mt-3 small fw-semibold eyebrow-spacing text-uppercase">
                                                {target ? 'Mon trésor à décrocher' : 'Quel sera ton trésor ?'}
                                            </p>
                                            <h3 className="mt-2 fs-4 fw-bold">{target?.title ?? 'Une envie, une aventure'}</h3>
                                            {target ? (
                                                <>
                                                    <div
                                                        className="mt-3 d-flex flex-wrap justify-content-center gap-2"
                                                        aria-label={`${Math.max(0, selected.star_balance)} étoiles disponibles sur ${target.star_cost} nécessaires`}
                                                    >
                                                        {Array.from({ length: Math.min(8, target.star_cost) }, (_, index) => (
                                                            <Star
                                                                key={index}
                                                                className={`mn-icon-6 ${selected.star_balance >= ((index + 1) * target.star_cost) / Math.min(8, target.star_cost) ? 'mn-fill-warning text-warning' : 'text-secondary'}`}
                                                                aria-hidden
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className="mt-3 small">
                                                        {alreadyRequested
                                                            ? 'Ton trésor est demandé !'
                                                            : selected.star_balance >= target.star_cost
                                                              ? 'Ton sac est assez rempli !'
                                                              : `Encore ${Math.max(0, target.star_cost - selected.star_balance)} étoile(s) pour ce trésor.`}
                                                    </p>
                                                    <p className="text-body-secondary mt-1 small">
                                                        {target.star_cost} ★{target.audience === 'family' ? ' · À partager en famille' : ''}
                                                    </p>
                                                    <Button
                                                        className="mt-3 w-100 rounded-3"
                                                        disabled={busy || !!alreadyRequested || selected.star_balance < target.star_cost}
                                                        onClick={() =>
                                                            act(route('goals.request-reward'), { member_id: selected.id, reward_id: target.id })
                                                        }
                                                    >
                                                        {alreadyRequested ? 'Demande en cours' : 'Demander mon trésor'}
                                                    </Button>
                                                </>
                                            ) : (
                                                <p className="text-body-secondary mt-3 small">
                                                    Choisis ce qui te ferait plaisir. Chaque sommet t’en rapproche.
                                                </p>
                                            )}
                                            <Button
                                                className="mt-3 rounded-3"
                                                variant={target ? 'ghost' : 'default'}
                                                onClick={() => setChoosing(true)}
                                            >
                                                {target ? 'Changer d’envie' : 'Choisir mon trésor'}
                                            </Button>
                                        </div>
                                        <p className="text-body-secondary text-center small">
                                            Les parents valident tes missions et tes demandes de trésors.
                                        </p>
                                    </section>
                                </div>
                                {ongoing.length > 0 && (
                                    <section className="d-grid gap-3">
                                        <h2 className="d-flex align-items-center gap-2 fw-bold">
                                            <Gift className="mn-icon-5 text-warning" />
                                            Mes trésors en préparation
                                        </h2>
                                        {requestList(ongoing, false)}
                                        <p className="text-body-secondary small">
                                            Tes étoiles sont réservées. Elles reviennent dans ton sac si la demande est refusée ou annulée.
                                        </p>
                                    </section>
                                )}
                                <details className="bg-body rounded-4 border p-3">
                                    <summary className="cursor-pointer small fw-medium">
                                        Mon carnet d’aventures · {pointsLabel(selected.total_points)} points depuis le début
                                    </summary>
                                    <div className="mt-3 d-grid gap-4 mn-sm-columns-2">
                                        <section>
                                            <h2 className="small fw-semibold">Mes derniers coups de main</h2>
                                            <ul className="mt-2 divided-list">
                                                {props.pointHistory.map((entry) => (
                                                    <li
                                                        key={entry.id}
                                                        className={`d-flex justify-content-between gap-3 py-2 small ${entry.is_void ? 'text-body-secondary text-decoration-line-through' : ''}`}
                                                    >
                                                        <span>
                                                            {entry.task_title}
                                                            <span className="text-body-secondary d-block small">
                                                                {date(entry.completed_on)}
                                                                {entry.is_void ? ' · Annulé' : ''}
                                                            </span>
                                                        </span>
                                                        <span className="flex-shrink-0">+{pointsLabel(entry.points)} pts</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            {!props.pointHistory.length && (
                                                <p className="text-body-secondary mt-2 small">Ton premier coup de main t’attend !</p>
                                            )}
                                        </section>
                                        <section>
                                            <h2 className="small fw-semibold">Mes étoiles</h2>
                                            <ul className="mt-2 divided-list">
                                                {props.starHistory.map((entry) => (
                                                    <li key={entry.id} className="d-flex justify-content-between gap-3 py-2 small">
                                                        <span>
                                                            {entry.type === 'goal' || entry.type === 'mountain'
                                                                ? entry.mountain_goal
                                                                    ? `Sommet n° ${entry.mountain_goal.sequence}${entry.amount === 0 ? ' · annulé' : ''}`
                                                                    : `Ancien objectif du ${date(entry.weekly_goal?.week_start ?? '')}`
                                                                : `${entry.type === 'refund' ? 'Étoiles rendues' : 'Trésor demandé'} : ${entry.reward_request?.title ?? 'Récompense'}`}
                                                        </span>
                                                        <span className="flex-shrink-0">
                                                            {entry.amount > 0 ? '+' : ''}
                                                            {entry.amount} ★
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    </div>
                                    {ownRequests.filter((request) => !['pending', 'approved'].includes(request.status)).length > 0 && (
                                        <div className="mt-3">
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
                    <div className="d-grid gap-4">
                        <section className={panel}>
                            <h2 className="d-flex align-items-center gap-2 fs-5 fw-bold">
                                <ShieldCheck className="mn-icon-5" />
                                Les missions à valider <span className="text-body-secondary">({props.pendingCount})</span>
                            </h2>
                            <p className="text-body-secondary mt-2 small">
                                Vérifie qui a participé : les points sont partagés entre les participants.
                            </p>
                            <div className="mt-3 d-grid gap-3 mn-md-columns-2">
                                {props.pendingCompletions.map((completion) => (
                                    <Review key={completion.id} completion={completion} members={members} />
                                ))}
                            </div>
                            {!props.pendingCount && <p className="mt-3 small">Tout est à jour, les aventuriers peuvent continuer !</p>}
                            {props.pendingCount > 100 && <p className="mt-3 small">Les 100 plus anciennes missions sont affichées en premier.</p>}
                        </section>
                        <section className={panel}>
                            <h2 className="mb-3 fs-5 fw-bold">Les trésors demandés</h2>
                            {requestList(requests, true)}
                            {!requests.length && <p className="text-body-secondary small">Aucune demande pour le moment.</p>}
                            <Button asChild variant="outline" className="mt-3">
                                <Link href={route('rewards.index')}>
                                    <Gift className="mn-icon-4" />
                                    Gérer le catalogue de récompenses
                                </Link>
                            </Button>
                        </section>
                        <div className="d-grid align-items-start gap-4 mn-lg-columns-2">
                            {selected && (
                                <details className={panel}>
                                    <summary className="cursor-pointer fw-semibold">Régler la montagne de {selected.name}</summary>
                                    <Settings key={selected.id} member={selected} />
                                </details>
                            )}
                            <details className={panel}>
                                <summary className="cursor-pointer fw-semibold">La progression de la famille</summary>
                                <p className="text-body-secondary mt-3 mb-3 small">
                                    {pointsLabel(props.familyProgress.points)} / {props.familyProgress.target} points sur les montagnes en cours.
                                    Chacun à son rythme.
                                </p>
                                <Meter
                                    value={props.familyProgress.target ? (props.familyProgress.points / props.familyProgress.target) * 100 : 0}
                                    label="Progression de la famille"
                                />
                            </details>
                        </div>
                        <details className={panel}>
                            <summary className="cursor-pointer fw-semibold">Relier les comptes aux prénoms</summary>
                            <p className="text-body-secondary mt-3 small">Relie chaque compte à un membre pour lui donner accès à son aventure.</p>
                            <div className="mt-3 d-grid gap-3 mn-md-columns-2">
                                {props.accounts.map((account) => (
                                    <AccountLink key={`${account.id}-${account.member_id}`} account={account} members={members} />
                                ))}
                            </div>
                        </details>
                    </div>
                )}
                <Dialog open={choosing && !!selected} onOpenChange={setChoosing}>
                    <DialogContent className="mn-max-h-85svh overflow-y-auto mn-sm-content-2xl">
                        <DialogHeader>
                            <DialogTitle>Choisis ton prochain trésor</DialogTitle>
                            <DialogDescription>Une envie qui donne envie de grimper !</DialogDescription>
                        </DialogHeader>
                        <div className="d-grid gap-3 mn-sm-columns-2">
                            {rewards.map((reward) => (
                                <button
                                    key={reward.id}
                                    disabled={busy}
                                    onClick={() => {
                                        if (selected)
                                            act(route('goals.target'), { member_id: selected.id, reward_id: reward.id }, () => setChoosing(false));
                                    }}
                                    className={`d-flex align-items-center gap-3 rounded-4 border p-3 text-start ${target?.id === reward.id ? 'border-warning bg-warning-subtle' : ''}`}
                                >
                                    <span className="fs-2" aria-hidden>
                                        {reward.icon}
                                    </span>
                                    <span className="mn-min-w-0">
                                        <span className="d-block fw-semibold">{reward.title}</span>
                                        <span className="text-body-secondary mt-1 d-block small">
                                            {reward.star_cost} ★{reward.audience === 'family' ? ' · En famille' : ''}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                        {!rewards.length && (
                            <p className="text-body-secondary py-4 text-center small">
                                Les parents préparent les trésors. Reviens bientôt !
                                {canManage && (
                                    <Link href={route('rewards.index')} className="mt-3 d-block text-decoration-underline">
                                        Activer des récompenses
                                    </Link>
                                )}
                            </p>
                        )}
                        {error && (
                            <p role="alert" className="text-danger small">
                                {error}
                            </p>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
