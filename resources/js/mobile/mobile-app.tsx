import * as Dialog from '@radix-ui/react-dialog';
import { Check, ChevronRight, ClipboardCheck, Home, LoaderCircle, LogOut, RefreshCw, ShieldCheck, Sparkles, Star, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { HouseBuddy } from '../components/house-buddy';
import { ApiError, MobileApi } from './api';
import { browserSessionStore, validSession, type SessionStore } from './session-store';
import type { Account, Completion, Member, Page, Session, Task } from './types';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Une erreur est survenue. Réessaie.');
const pointLabel = (points: number) => `${points.toLocaleString('fr-FR')} point${points > 1 ? 's' : ''}`;
function dueLabel(task: Task) {
    if (task.status === 'done') return 'Terminée';
    if (task.status === 'overdue') return 'À rattraper';
    if (task.status === 'today') return 'Aujourd’hui';
    return task.next_due_date
        ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(`${task.next_due_date}T12:00:00`))
        : '';
}
function recurrenceLabel(task: Task) {
    const units = { daily: 'jour', weekly: 'semaine', monthly: 'mois', yearly: 'an', once: '' };
    if (task.recurrence === 'once') return 'Une seule fois';
    return task.interval === 1
        ? `Chaque ${units[task.recurrence]}`
        : `Tous les ${task.interval} ${units[task.recurrence]}${['daily', 'weekly', 'yearly'].includes(task.recurrence) ? 's' : ''}`;
}

export function MobileApp({ storage = browserSessionStore, platform = 'web' }: { storage?: SessionStore; platform?: string }) {
    const [session, setSession] = useState<Session | null>(null);
    const activeToken = useRef<string | null>(null);
    const [ready, setReady] = useState(false);
    const [bootError, setBootError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [notice, setNotice] = useState('');
    useEffect(() => {
        let cancelled = false;
        setBootError(false);
        void (async () => {
            try {
                const saved = await storage.read();
                const next = validSession(saved) ? saved : null;
                if (saved && !next) await storage.write(null);
                if (!cancelled) {
                    activeToken.current = next?.token ?? null;
                    setSession(next);
                    setReady(true);
                }
            } catch {
                if (!cancelled) setBootError(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [storage, attempt]);
    const connect = async (next: Session) => {
        try {
            await storage.write(next);
        } catch {
            await new MobileApi(next.token).request('/auth/logout', { method: 'POST' }).catch(() => {});
            throw new Error('Impossible de sécuriser ta connexion sur cet appareil. Réessaie.');
        }
        activeToken.current = next.token;
        setNotice('');
        setSession(next);
    };
    const disconnect = useCallback(
        (token: string, expired = false) => {
            if (activeToken.current !== token) return;
            activeToken.current = null;
            setSession(null);
            if (expired) setNotice('Ta session a expiré. Reconnecte-toi pour retrouver tes missions.');
            void storage.write(null).catch(() => setNotice('Ta session est fermée. Le nettoyage du stockage local n’a pas pu être confirmé.'));
        },
        [storage],
    );
    if (bootError)
        return (
            <main className="mobile-login empty">
                <HouseBuddy />
                <h1>Un petit instant…</h1>
                <p>Impossible d’ouvrir la connexion sécurisée sur cet appareil.</p>
                <button className="action primary" onClick={() => setAttempt((value) => value + 1)}>
                    Réessayer
                </button>
            </main>
        );
    if (!ready)
        return (
            <main className="mobile-login empty" role="status">
                <LoaderCircle className="spin" />
                <p>On prépare ta maison…</p>
            </main>
        );
    return session ? (
        <Workspace key={session.token} session={session} disconnect={disconnect} platform={platform} />
    ) : (
        <Login connect={connect} notice={notice} platform={platform} />
    );
}

function Login({ connect, notice, platform }: { connect: (session: Session) => Promise<void>; notice: string; platform: string }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError('');
        try {
            const result = await new MobileApi(null).request<{ access_token: string; expires_at: string }>('/auth/login', {
                body: {
                    email: form.get('email'),
                    password: form.get('password'),
                    device_name: `Maiso’net · ${platform === 'web' ? 'navigateur' : platform}`,
                },
            });
            await connect({ token: result.access_token, expiresAt: result.expires_at });
        } catch (error) {
            setError(errorMessage(error));
        } finally {
            setBusy(false);
        }
    }
    return (
        <main className="mobile-login">
            <a href="/login" className="brand">
                <img src="/logo.png" alt="Maiso’net" />
            </a>
            <div className="welcome-art">
                <span className="sticker">En équipe, c’est mieux !</span>
                <HouseBuddy />
            </div>
            <div className="login-heading">
                <p className="eyebrow">LE PETIT QG DE LA FAMILLE</p>
                <h1>
                    Petites missions.
                    <br />
                    Grandes victoires<span> ✨</span>
                </h1>
                <p>Un coup de main, des points et une maison où il fait bon vivre.</p>
            </div>
            <form onSubmit={submit} className="mobile-panel login-form">
                <h2>Bienvenue chez toi</h2>
                {notice && (
                    <p className="message info" role="status">
                        {notice}
                    </p>
                )}
                {error && (
                    <p className="message error" role="alert">
                        {error}
                    </p>
                )}
                <label>
                    Adresse e-mail
                    <input name="email" type="email" autoComplete="username" required placeholder="toi@exemple.fr" autoCapitalize="none" />
                </label>
                <label>
                    Mot de passe
                    <input name="password" type="password" autoComplete="current-password" required placeholder="Ton mot de passe" />
                </label>
                <button className="action primary" disabled={busy}>
                    {busy ? <LoaderCircle className="spin" /> : <Sparkles />} C’est parti !
                </button>
                <a href="/forgot-password" className="quiet-link">
                    Mot de passe oublié ?
                </a>
            </form>
            <p className="login-foot">
                Ton compte Maiso’net habituel suffit.
                <br />
                <a href="/register">
                    Créer ou rejoindre une famille <ChevronRight size={14} />
                </a>
            </p>
        </main>
    );
}

type Selection = { kind: 'complete'; task: Task } | { kind: 'review'; completion: Completion };
function Workspace({
    session,
    disconnect,
    platform,
}: {
    session: Session;
    disconnect: (token: string, expired?: boolean) => void;
    platform: string;
}) {
    const api = useMemo(() => new MobileApi(session.token, () => disconnect(session.token, true)), [session.token, disconnect]);
    const [account, setAccount] = useState<Account | null>(null);
    const [tasks, setTasks] = useState<Page<Task> | null>(null);
    const [pending, setPending] = useState<Page<Completion> | null>(null);
    const [tab, setTab] = useState<'missions' | 'review' | 'profile'>('missions');
    const [mine, setMine] = useState(false);
    const [room, setRoom] = useState('');
    const [loading, setLoading] = useState(true);
    const [moreBusy, setMoreBusy] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');
    const [selection, setSelection] = useState<Selection | null>(null);
    const [logoutBusy, setLogoutBusy] = useState(false);

    const taskQuery = `per_page=30${mine ? '&mine=1' : ''}${room ? `&room_id=${encodeURIComponent(room)}` : ''}`;
    const refresh = useCallback(
        async (signal?: AbortSignal) => {
            setLoading(true);
            setError('');
            try {
                const { data: me } = await api.request<{ data: Account }>('/me', { signal });
                const [list, reviews] = await Promise.all([
                    api.request<Page<Task>>(`/tasks?${taskQuery}`, { signal }),
                    me.is_parent ? api.request<Page<Completion>>('/completions/pending?per_page=30', { signal }) : Promise.resolve(null),
                ]);
                if (signal?.aborted) return;
                setAccount(me);
                setTasks(list);
                setPending(reviews);
            } catch (error) {
                if (!(error instanceof Error && error.name === 'AbortError')) setError(errorMessage(error));
            } finally {
                if (!signal?.aborted) setLoading(false);
            }
        },
        [api, taskQuery],
    );

    useEffect(() => {
        const controller = new AbortController();
        void refresh(controller.signal);
        return () => controller.abort();
    }, [refresh]);
    useEffect(() => {
        if (!toast) return;
        const timeout = window.setTimeout(() => setToast(''), 6500);
        return () => window.clearTimeout(timeout);
    }, [toast]);

    useEffect(() => {
        const back = (event: Event) => {
            if (tab !== 'missions') {
                event.preventDefault();
                setTab('missions');
            }
        };
        const resume = () => {
            if (!selection && !loading && !moreBusy) void refresh();
        };
        window.addEventListener('maisonet:back', back);
        window.addEventListener('maisonet:resume', resume);
        return () => {
            window.removeEventListener('maisonet:back', back);
            window.removeEventListener('maisonet:resume', resume);
        };
    }, [tab, selection, loading, moreBusy, refresh]);

    async function more(kind: 'tasks' | 'reviews') {
        const page = kind === 'tasks' ? tasks : pending;
        if (!page || page.meta.current_page >= page.meta.last_page) return;
        setMoreBusy(true);
        setError('');
        try {
            const nextPage = page.meta.current_page + 1;
            if (kind === 'tasks') {
                const result = await api.request<Page<Task>>(`/tasks?${taskQuery}&page=${nextPage}`);
                setTasks((previous) => ({
                    ...result,
                    data: [...(previous?.data ?? []), ...result.data].filter((item, i, all) => all.findIndex((other) => other.id === item.id) === i),
                }));
            } else {
                const result = await api.request<Page<Completion>>(`/completions/pending?per_page=30&page=${nextPage}`);
                setPending((previous) => ({
                    ...result,
                    data: [...(previous?.data ?? []), ...result.data].filter((item, i, all) => all.findIndex((other) => other.id === item.id) === i),
                }));
            }
        } catch (error) {
            setError(errorMessage(error));
        } finally {
            setMoreBusy(false);
        }
    }
    async function logout() {
        setLogoutBusy(true);
        setError('');
        try {
            await api.request('/auth/logout', { method: 'POST' });
            disconnect(session.token);
        } catch (error) {
            setError(errorMessage(error));
        } finally {
            setLogoutBusy(false);
        }
    }
    function completed(result: Completion) {
        setSelection(null);
        setTasks((previous) =>
            previous ? { ...previous, data: previous.data.map((task) => (task.id === result.task_id ? result.task : task)) } : previous,
        );
        setPending((previous) =>
            previous
                ? {
                      ...previous,
                      data: previous.data.filter((item) => item.id !== result.id),
                      meta: {
                          ...previous.meta,
                          total: Math.max(0, previous.meta.total - (previous.data.some((item) => item.id === result.id) ? 1 : 0)),
                      },
                  }
                : previous,
        );
        setToast(
            result.status === 'pending'
                ? 'Bravo ! Ta mission attend la validation d’un parent.'
                : result.status === 'rejected'
                  ? 'Mission refusée. Le planning a été mis à jour.'
                  : result.awards_points
                    ? 'Bien joué ! Les points ont été attribués ✨'
                    : 'Bien joué ! La mission est enregistrée.',
        );
        void refresh();
    }

    const visibleTasks = (tasks?.data ?? []).filter(
        (task) => (!mine || task.members.some((member) => member.id === account?.member_id)) && (!room || task.room?.id === Number(room)),
    );
    const urgent = visibleTasks.filter((task) => task.status === 'overdue' || task.status === 'today');
    const upcoming = visibleTasks.filter((task) => task.status === 'upcoming');
    const done = visibleTasks.filter((task) => task.status === 'done');

    return (
        <div className="mobile-shell">
            <header className="mobile-header">
                <a href="/mobile" className="brand">
                    <img src="/logo.png" alt="Maiso’net" />
                </a>
                <span className="family-pill">
                    <Home size={14} /> {account?.family.name ?? 'À la maison'}
                </span>
            </header>
            <main className="mobile-main" id="main">
                {error && (
                    <div className="message error" role="alert">
                        <span>{error}</span>
                        <button className="text-button" onClick={() => void refresh()} disabled={loading}>
                            Réessayer
                        </button>
                    </div>
                )}
                {!account && loading && (
                    <div className="empty">
                        <LoaderCircle className="spin" />
                        <p>On prépare tes missions…</p>
                    </div>
                )}
                {account && (
                    <>
                        {tab === 'missions' && (
                            <>
                                <section className="mission-hero">
                                    <div>
                                        <p className="eyebrow">BONJOUR {account.name.split(' ')[0].toLocaleUpperCase('fr-FR')} ☀️</p>
                                        <h1>On fait équipe ?</h1>
                                        <p>Chaque petit geste compte.</p>
                                        <span className="hero-chip">
                                            <Sparkles size={15} /> À toi de jouer !
                                        </span>
                                    </div>
                                    <HouseBuddy />
                                </section>
                                {!account.is_parent && account.member_id === null && (
                                    <p className="message info">
                                        Un parent doit relier ton compte à ton profil familial pour que tu puisses déclarer tes missions.
                                    </p>
                                )}
                                <div className="mission-toolbar">
                                    <div className="segment" aria-label="Voir les missions">
                                        <button aria-pressed={!mine} disabled={loading || moreBusy} onClick={() => setMine(false)}>
                                            Toute la famille
                                        </button>
                                        <button aria-pressed={mine} disabled={loading || moreBusy} onClick={() => setMine(true)}>
                                            Pour moi
                                        </button>
                                    </div>
                                    <button
                                        className="icon-button"
                                        aria-label="Actualiser les missions"
                                        disabled={loading || moreBusy}
                                        onClick={() => void refresh()}
                                    >
                                        <RefreshCw className={loading ? 'spin' : ''} size={19} />
                                    </button>
                                </div>
                                <label className="room-filter">
                                    <Home size={17} />
                                    <span className="sr-only">Filtrer par pièce</span>
                                    <select disabled={loading || moreBusy} value={room} onChange={(event) => setRoom(event.target.value)}>
                                        <option value="">Toutes les pièces</option>
                                        {account.rooms.map((room) => (
                                            <option key={room.id} value={room.id}>
                                                {room.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <TaskGroup
                                    title="Les missions du moment"
                                    subtitle="Aujourd’hui et à rattraper"
                                    tasks={urgent}
                                    canComplete={account.is_parent || account.member_id !== null}
                                    choose={(task) => setSelection({ kind: 'complete', task })}
                                />
                                {!urgent.length && (
                                    <div className="mobile-panel empty">
                                        <span className="empty-emoji">🌈</span>
                                        <h3>Tout roule pour le moment !</h3>
                                        <p>Aucune mission à faire maintenant dans cette sélection.</p>
                                    </div>
                                )}
                                <TaskGroup
                                    title="Un peu d’avance ?"
                                    subtitle="Les prochaines missions"
                                    tasks={upcoming}
                                    canComplete={account.is_parent || account.member_id !== null}
                                    choose={(task) => setSelection({ kind: 'complete', task })}
                                />
                                {done.length > 0 && (
                                    <details className="finished-list">
                                        <summary>
                                            {done.length} mission{done.length > 1 ? 's' : ''} terminée{done.length > 1 ? 's' : ''}
                                        </summary>
                                        {done.map((task) => (
                                            <p key={task.id}>
                                                <Check size={16} /> {task.title}
                                            </p>
                                        ))}
                                    </details>
                                )}
                                {tasks && tasks.meta.current_page < tasks.meta.last_page && (
                                    <button className="action more" disabled={moreBusy || loading} onClick={() => void more('tasks')}>
                                        {moreBusy ? 'Chargement…' : 'Voir les missions suivantes'}
                                    </button>
                                )}
                                {tasks && tasks.meta.last_page > 1 && (
                                    <p className="list-note">
                                        {tasks.data.length} missions chargées sur {tasks.meta.total}. Les filtres s’appliquent aux missions chargées.
                                    </p>
                                )}
                            </>
                        )}
                        {tab === 'review' && account.is_parent && (
                            <>
                                <div className="page-heading">
                                    <span className="heading-icon">
                                        <ShieldCheck />
                                    </span>
                                    <p className="eyebrow">LE COIN DES PARENTS</p>
                                    <h1>Leurs petites victoires</h1>
                                    <p>Un coup d’œil, un bravo… et les points arrivent !</p>
                                </div>
                                <div className="section-title">
                                    <h2>
                                        À valider <span>{pending?.meta.total ?? 0}</span>
                                    </h2>
                                    <button
                                        className="icon-button"
                                        aria-label="Actualiser les validations"
                                        disabled={loading || moreBusy}
                                        onClick={() => void refresh()}
                                    >
                                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                                    </button>
                                </div>
                                {pending?.data.map((completion) => (
                                    <article className="mobile-panel review-card" key={completion.id}>
                                        <div className="task-meta">
                                            <span>🎉 Mission accomplie</span>
                                            <span>{completion.completed_on.split('-').reverse().join('/')}</span>
                                        </div>
                                        <h3>{completion.task.title}</h3>
                                        <p>{completion.task.room?.name}</p>
                                        <div className="people-row">
                                            {completion.participants.map((member) => (
                                                <span className="person-chip" key={member.id}>
                                                    <span style={{ background: member.color }}>{member.name.charAt(0)}</span>
                                                    {member.name}
                                                </span>
                                            ))}
                                        </div>
                                        <button className="action primary" onClick={() => setSelection({ kind: 'review', completion })}>
                                            Vérifier et valider <ChevronRight size={18} />
                                        </button>
                                    </article>
                                ))}
                                {!pending?.data.length && (
                                    <div className="mobile-panel empty">
                                        <span className="empty-emoji">🙌</span>
                                        <h3>Tout est à jour !</h3>
                                        <p>Les prochaines missions déclarées par les enfants apparaîtront ici.</p>
                                    </div>
                                )}
                                {pending && pending.meta.current_page < pending.meta.last_page && (
                                    <button className="action more" disabled={moreBusy || loading} onClick={() => void more('reviews')}>
                                        Voir les suivantes
                                    </button>
                                )}
                            </>
                        )}
                        {tab === 'profile' && (
                            <>
                                <div className="page-heading">
                                    <span className="profile-avatar">{account.name.charAt(0)}</span>
                                    <h1>{account.name}</h1>
                                    <p>{account.email}</p>
                                </div>
                                <section className="mobile-panel profile-card">
                                    <h2>Ma tribu</h2>
                                    <p>{account.family.name}</p>
                                    <div className="people-row">
                                        {account.members.map((member) => (
                                            <span className="person-chip" key={member.id}>
                                                <span style={{ background: member.color }}>{member.name.charAt(0)}</span>
                                                {member.name}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="role-label">
                                        <ShieldCheck size={17} />
                                        {account.is_parent ? 'Compte parent · tu peux valider les missions' : 'Compte membre de la famille'}
                                    </div>
                                </section>
                                <a className="mobile-panel site-link" href="/dashboard">
                                    <Home /> Ouvrir le site complet <ChevronRight />
                                </a>
                                <button className="action logout" onClick={() => void logout()} disabled={logoutBusy}>
                                    <LogOut size={18} />
                                    {logoutBusy ? 'Déconnexion…' : 'Me déconnecter'}
                                </button>
                                <p className="list-note">
                                    {platform === 'web'
                                        ? 'Cette connexion est propre à cet onglet. Déconnecte-toi avant de partager ton appareil.'
                                        : 'Ta connexion est conservée dans le stockage sécurisé de cet appareil. Déconnecte-toi avant de le partager.'}
                                </p>
                            </>
                        )}
                    </>
                )}
            </main>
            <nav className="bottom-nav" aria-label="Navigation mobile">
                <button aria-current={tab === 'missions' ? 'page' : undefined} onClick={() => setTab('missions')}>
                    <Home />
                    Missions
                </button>
                {account?.is_parent && (
                    <button aria-current={tab === 'review' ? 'page' : undefined} onClick={() => setTab('review')}>
                        <span className="nav-icon">
                            <ClipboardCheck />
                            {(pending?.meta.total ?? 0) > 0 && <b>{pending!.meta.total}</b>}
                        </span>
                        À valider
                    </button>
                )}
                <button aria-current={tab === 'profile' ? 'page' : undefined} onClick={() => setTab('profile')}>
                    <UserRound />
                    Ma tribu
                </button>
            </nav>
            {toast && (
                <div className="mobile-toast" role="status">
                    <Sparkles size={20} />
                    <span>{toast}</span>
                    <button aria-label="Fermer le message" onClick={() => setToast('')}>
                        <X size={16} />
                    </button>
                </div>
            )}
            {selection && account && (
                <MissionDialog
                    key={`${selection.kind}-${selection.kind === 'complete' ? selection.task.id : selection.completion.id}`}
                    selection={selection}
                    account={account}
                    api={api}
                    close={() => setSelection(null)}
                    success={completed}
                />
            )}
        </div>
    );
}

function TaskGroup({
    title,
    subtitle,
    tasks,
    canComplete,
    choose,
}: {
    title: string;
    subtitle: string;
    tasks: Task[];
    canComplete: boolean;
    choose: (task: Task) => void;
}) {
    if (!tasks.length) return null;
    return (
        <section className="task-group">
            <div className="section-title">
                <div>
                    <h2>
                        {title} <span>{tasks.length}</span>
                    </h2>
                    <p>{subtitle}</p>
                </div>
            </div>
            {tasks.map((task) => {
                const level = task.dirt_level;
                const color = level !== null && level >= 75 ? 'coral' : level !== null && level >= 40 ? 'gold' : 'mint';
                return (
                    <article key={task.id} className={`mobile-panel mission-card ${color}`}>
                        <div className="task-meta">
                            <span>
                                {task.room?.icon} {task.room?.name ?? 'À la maison'}
                            </span>
                            <span className={task.status === 'overdue' ? 'overdue-label' : ''}>{dueLabel(task)}</span>
                        </div>
                        <div className="mission-line">
                            <div className="mission-name">
                                <h3>{task.title}</h3>
                                <p>{task.members.map((member) => member.name).join(', ') || 'Qui veut donner un coup de main ?'}</p>
                            </div>
                            <button
                                className="task-check"
                                aria-label={`Terminer : ${task.title}`}
                                disabled={!canComplete}
                                onClick={() => choose(task)}
                            >
                                <Check size={25} />
                            </button>
                        </div>
                        <div className="task-footer">
                            <span className="effort-chip">
                                <Star size={13} />
                                {task.effort_size ? `${task.effort_size} · ${pointLabel(task.effort_points ?? 0)}` : 'Petit coup de main'}
                            </span>
                            {task.completion_info?.status === 'pending' && <span className="pending-chip">Validation en attente</span>}
                        </div>
                        {level !== null && (
                            <div className="dirt-row">
                                <div
                                    className="dirt-track"
                                    role="meter"
                                    aria-label={`Saleté : ${task.title}`}
                                    aria-valuenow={level}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                >
                                    <span style={{ width: `${level}%` }} />
                                </div>
                                <span>{level}%</span>
                            </div>
                        )}
                    </article>
                );
            })}
        </section>
    );
}

function MissionDialog({
    selection,
    account,
    api,
    close,
    success,
}: {
    selection: Selection;
    account: Account;
    api: MobileApi;
    close: () => void;
    success: (completion: Completion) => void;
}) {
    const task = selection.kind === 'complete' ? selection.task : selection.completion.task;
    const initial =
        selection.kind === 'review'
            ? selection.completion.participants.map((member) => member.id)
            : !account.is_parent
              ? [account.member_id!]
              : task.members.length
                ? task.members.map((member) => member.id)
                : account.member_id
                  ? [account.member_id]
                  : [];
    const [ids, setIds] = useState<number[]>(initial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [reject, setReject] = useState(false);
    async function submit(decision: 'approve' | 'reject' = 'approve') {
        setBusy(true);
        setError('');
        try {
            const path = selection.kind === 'complete' ? `/tasks/${task.id}/complete` : `/completions/${selection.completion.id}/review`;
            const result = await api.request<{ data: Completion }>(path, {
                body: { member_ids: ids, ...(selection.kind === 'review' ? { decision } : {}) },
            });
            success(result.data);
        } catch (error) {
            setError(
                error instanceof ApiError && error.status === 403
                    ? 'Cette action demande un compte parent. Actualise la page pour mettre ton compte à jour.'
                    : errorMessage(error),
            );
        } finally {
            setBusy(false);
        }
    }
    function toggle(member: Member) {
        setIds((previous) => (previous.includes(member.id) ? previous.filter((id) => id !== member.id) : [...previous, member.id]));
    }
    return (
        <Dialog.Root
            open
            onOpenChange={(open) => {
                if (!open && !busy) close();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="mobile-overlay" />
                <Dialog.Content
                    className="mission-dialog"
                    onEscapeKeyDown={(event) => {
                        if (busy) event.preventDefault();
                    }}
                    onPointerDownOutside={(event) => {
                        if (busy) event.preventDefault();
                    }}
                >
                    <Dialog.Close className="icon-button dialog-close" aria-label="Fermer" disabled={busy}>
                        <X size={20} />
                    </Dialog.Close>
                    <span className="dialog-emoji">{selection.kind === 'review' ? '🎉' : '🧽'}</span>
                    <Dialog.Title>{selection.kind === 'review' ? 'Une victoire à valider !' : 'Mission accomplie ?'}</Dialog.Title>
                    <Dialog.Description>
                        {task.title} · {task.room?.name ?? 'À la maison'}
                    </Dialog.Description>
                    {task.notes && <p className="task-notes">{task.notes}</p>}
                    <p className="recurrence-note">{recurrenceLabel(task)}</p>
                    <fieldset disabled={busy}>
                        <legend>Qui a donné un coup de main ?</legend>
                        <div className="participant-options">
                            {account.members.map((member) => (
                                <label key={member.id} className={ids.includes(member.id) ? 'selected' : ''}>
                                    <input
                                        type="checkbox"
                                        checked={ids.includes(member.id)}
                                        disabled={!account.is_parent && member.id === account.member_id}
                                        onChange={() => toggle(member)}
                                    />
                                    <span className="member-dot" style={{ background: member.color }}>
                                        {member.name.charAt(0)}
                                    </span>
                                    {member.name}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <p className="points-note">
                        <Star size={19} />
                        {selection.kind === 'review'
                            ? selection.completion.awards_points
                                ? `${pointLabel(selection.completion.effort_points ?? 0)} à partager entre les participants.`
                                : 'Cette réalisation ne rapporte pas de nouveaux points.'
                            : task.can_earn_points
                              ? `${pointLabel(task.effort_points ?? 0)} à partager${account.is_parent ? '.' : ' après validation d’un parent.'}`
                              : 'Un coup de main utile ! Aucun nouveau point disponible pour cette réalisation.'}
                    </p>
                    {error && (
                        <p className="message error" role="alert">
                            {error}
                        </p>
                    )}
                    {reject ? (
                        <div className="reject-confirm">
                            <p>Refuser cette réalisation ? La tâche pourra être remise à faire.</p>
                            <button className="action danger" disabled={busy} onClick={() => void submit('reject')}>
                                Oui, refuser
                            </button>
                            <button className="text-button" disabled={busy} onClick={() => setReject(false)}>
                                Revenir
                            </button>
                        </div>
                    ) : (
                        <>
                            <button className="action primary" disabled={busy || ids.length === 0} onClick={() => void submit()}>
                                {busy ? <LoaderCircle className="spin" /> : <Check />}
                                {busy ? 'Enregistrement…' : selection.kind === 'review' ? 'Valider la mission' : 'Oui, c’est fait !'}
                            </button>
                            {selection.kind === 'review' && (
                                <button className="text-button reject-button" disabled={busy} onClick={() => setReject(true)}>
                                    Refuser cette réalisation
                                </button>
                            )}
                        </>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
