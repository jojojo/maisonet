import { Badge } from '@/components/bootstrap/badge';
import { Button } from '@/components/bootstrap/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/bootstrap/dialog';
import { Input } from '@/components/bootstrap/input';
import { Field, NativeSelect } from '@/components/form-fields';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Check, Gift, Pencil, Plus, Search, ShieldCheck, Sparkles, Star, Users } from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface Category {
    key: string;
    name: string;
    icon: string;
}
interface Reward {
    id?: number;
    template_key: string | null;
    title: string;
    description: string | null;
    icon: string;
    category: string;
    star_cost: number;
    audience: 'individual' | 'family';
    is_active: boolean;
}
interface Template extends Omit<Reward, 'id' | 'is_active'> {
    reward: Reward | null;
}
interface Account {
    id: number;
    name: string;
    email: string;
    is_parent: boolean;
}
interface Props {
    canManage: boolean;
    rewards: Reward[];
    templates: Template[];
    categories: Category[];
    accounts: Account[];
}
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Récompenses', href: '/rewards' }];
const normalize = (text: string) =>
    text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

function RewardDialog({ reward, categories, onClose }: { reward: Reward; categories: Category[]; onClose: () => void }) {
    const form = useForm({
        template_key: reward.template_key,
        title: reward.title,
        description: reward.description ?? '',
        icon: reward.icon,
        category: reward.category,
        star_cost: reward.star_cost,
        audience: reward.audience,
        is_active: reward.is_active,
    });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };
        if (reward.id) form.patch(route('rewards.update', reward.id), options);
        else form.post(route('rewards.store'), options);
    };

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="mn-max-h-90svh overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{reward.id || reward.template_key ? 'Personnaliser la récompense' : 'Une récompense bien à vous'}</DialogTitle>
                    <DialogDescription>Choisis ce qui fait plaisir à votre famille et un coût en étoiles adapté.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="d-grid gap-3">
                    <Field label="Nom" error={form.errors.title}>
                        <Input
                            value={form.data.title}
                            onChange={(event) => form.setData('title', event.target.value)}
                            maxLength={120}
                            required
                            autoFocus
                        />
                    </Field>
                    <div className="d-grid mn-columns-80px-minmax-0-1fr gap-3">
                        <Field label="Icône" error={form.errors.icon}>
                            <Input value={form.data.icon} onChange={(event) => form.setData('icon', event.target.value)} maxLength={16} required />
                        </Field>
                        <Field label="Catégorie" error={form.errors.category}>
                            <NativeSelect value={form.data.category} onChange={(event) => form.setData('category', event.target.value)}>
                                {categories.map((category) => (
                                    <option key={category.key} value={category.key}>
                                        {category.icon} {category.name}
                                    </option>
                                ))}
                            </NativeSelect>
                        </Field>
                    </div>
                    <Field label="Description" error={form.errors.description}>
                        <textarea
                            value={form.data.description}
                            onChange={(event) => form.setData('description', event.target.value)}
                            maxLength={1000}
                            rows={3}
                            className="form-control border bg-body w-100 rounded-2 px-3 py-2 small"
                        />
                    </Field>
                    <div className="d-grid mn-columns-2 gap-3">
                        <Field label="Coût en étoiles" error={form.errors.star_cost}>
                            <Input
                                type="number"
                                min={1}
                                max={100}
                                required
                                value={form.data.star_cost}
                                onChange={(event) => form.setData('star_cost', Number(event.target.value))}
                            />
                        </Field>
                        <Field label="Pour qui ?" error={form.errors.audience}>
                            <NativeSelect
                                value={form.data.audience}
                                onChange={(event) => form.setData('audience', event.target.value as Reward['audience'])}
                            >
                                <option value="individual">Une personne</option>
                                <option value="family">Toute la famille</option>
                            </NativeSelect>
                        </Field>
                    </div>
                    <label className="d-flex align-items-center gap-2 rounded-3 border p-3 small">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            checked={form.data.is_active}
                            onChange={(event) => form.setData('is_active', event.target.checked)}
                        />
                        Visible dans les récompenses de la famille
                    </label>
                    {form.errors.is_active && (
                        <p role="alert" className="text-danger small">
                            {form.errors.is_active}
                        </p>
                    )}
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Enregistrement…' : 'Enregistrer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function Rewards({ canManage, rewards, templates, categories, accounts }: Props) {
    const { flash } = usePage<SharedData>().props;
    const active = rewards.filter((reward) => reward.is_active);
    const [mode, setMode] = useState<'active' | 'catalogue'>(canManage && !active.length ? 'catalogue' : 'active');
    const [category, setCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [audience, setAudience] = useState('all');
    const [editing, setEditing] = useState<Reward | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [accessError, setAccessError] = useState('');
    const catalogue: Reward[] = [
        ...templates.map(({ reward, ...template }) => reward ?? { ...template, is_active: false }),
        ...rewards.filter((reward) => !reward.template_key),
    ];
    const source = canManage && mode === 'catalogue' ? catalogue : active;
    const visible = source
        .filter(
            (reward) =>
                (category === 'all' || category === reward.category) &&
                (audience === 'all' || audience === reward.audience) &&
                normalize(reward.title + ' ' + (reward.description ?? '')).includes(normalize(search)),
        )
        .sort((a, b) => a.star_cost - b.star_cost || a.title.localeCompare(b.title, 'fr'));
    const parents = accounts.filter((account) => account.is_parent).length;
    const toggle = (reward: Reward) => {
        const key = String(reward.id ?? reward.template_key);
        setBusy(key);
        const options = { preserveScroll: true, onFinish: () => setBusy(null) };
        if (reward.id) router.patch(route('rewards.update', reward.id), { is_active: !reward.is_active }, options);
        else router.post(route('rewards.store'), { template_key: reward.template_key, is_active: true }, options);
    };
    const changeParent = (account: Account) => {
        setBusy('account-' + account.id);
        setAccessError('');
        router.patch(
            route('rewards.parents.update', account.id),
            { is_parent: !account.is_parent },
            {
                preserveScroll: true,
                onFinish: () => setBusy(null),
                onError: (errors) => setAccessError(errors.parent_access ?? 'Impossible de modifier cet accès.'),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Récompenses" />
            <div className="mx-auto d-grid w-100 mn-min-w-0 mn-content-6xl gap-4 p-3 pb-5">
                <header className="position-relative overflow-hidden rounded-4 border border-warning-subtle brand-hero p-4 p-sm-4">
                    <p className="d-flex align-items-center gap-2 small fw-semibold text-uppercase eyebrow-spacing text-warning-emphasis">
                        <Sparkles className="mn-icon-4" aria-hidden /> Des envies à partager
                    </p>
                    <h1 className="mt-2 fs-3 fw-semibold mn-sm-heading-3xl">Les petits efforts font de beaux moments.</h1>
                    <p className="text-body-secondary mt-3 mn-content-2xl small lh-lg">
                        {canManage
                            ? 'Des idées pour motiver petits et grands. Active les récompenses qui vous ressemblent, ajuste les étoiles et invente vos propres moments en famille.'
                            : 'Découvre les récompenses choisies par tes parents : des jeux, des sorties et des moments à partager en famille.'}
                    </p>
                    <div className="mt-3 d-flex flex-wrap align-items-center gap-2">
                        <Badge variant="outline" className="border-warning-subtle bg-body bg-opacity-75">
                            <Gift className="me-1 mn-icon-3" />
                            {active.length} récompense(s) active(s)
                        </Badge>
                        {canManage && (
                            <Badge variant="outline" className="border-warning-subtle bg-body bg-opacity-75">
                                <ShieldCheck className="me-1 mn-icon-3" />
                                Espace parent
                            </Badge>
                        )}
                    </div>
                </header>

                <Link href={route('goals.index')} className="small text-decoration-underline">
                    Voir mes objectifs, mes ?toiles et demander une r?compense ?
                </Link>
                {flash?.success && (
                    <p
                        role="status"
                        className="d-flex align-items-center gap-2 rounded-3 border border-success-subtle bg-success-subtle p-3 small text-success-emphasis"
                    >
                        <Check className="mn-icon-4 flex-shrink-0" aria-hidden />
                        {flash.success}
                    </p>
                )}

                {canManage && (
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <div className="bg-body-tertiary d-flex flex-wrap gap-1 rounded-3 p-1" aria-label="Vue des récompenses">
                            <Button
                                variant={mode === 'active' ? 'outline' : 'ghost'}
                                type="button"
                                onClick={() => setMode('active')}
                                aria-pressed={mode === 'active'}
                            >
                                Pour la famille ({active.length})
                            </Button>
                            <Button
                                variant={mode === 'catalogue' ? 'outline' : 'ghost'}
                                type="button"
                                onClick={() => setMode('catalogue')}
                                aria-pressed={mode === 'catalogue'}
                            >
                                <ShieldCheck />
                                Catalogue des parents
                            </Button>
                        </div>
                        <Button
                            onClick={() =>
                                setEditing({
                                    template_key: null,
                                    title: '',
                                    description: '',
                                    icon: '🎁',
                                    category: categories[0].key,
                                    star_cost: 1,
                                    audience: 'individual',
                                    is_active: true,
                                })
                            }
                        >
                            <Plus />
                            Créer une récompense
                        </Button>
                    </div>
                )}

                <section aria-label="Filtres des récompenses" className="d-grid mn-min-w-0 mn-columns-1 gap-3 mn-md-columns-minmax-0-1fr-200px">
                    <div className="position-relative">
                        <Search className="text-body-secondary pe-none position-absolute mn-top-3 mn-left-3 mn-icon-4" aria-hidden />
                        <Input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            aria-label="Rechercher une récompense"
                            placeholder="Une sortie, un jeu, un moment ensemble…"
                            className="ps-5"
                        />
                    </div>
                    <NativeSelect aria-label="Pour qui ?" value={audience} onChange={(event) => setAudience(event.target.value)}>
                        <option value="all">Pour tout le monde</option>
                        <option value="individual">Individuelles</option>
                        <option value="family">Collectives</option>
                    </NativeSelect>
                    <div className="d-flex mn-min-w-0 flex-wrap gap-2 mn-md-span-2">
                        {[{ key: 'all', name: 'Toutes les envies', icon: '🎁' }, ...categories].map((item) => (
                            <button
                                type="button"
                                key={item.key}
                                aria-pressed={category === item.key}
                                onClick={() => setCategory(item.key)}
                                className={cn(
                                    'rounded-pill border px-3 py-2 small fw-medium',
                                    category === item.key ? 'border-warning bg-warning-subtle text-warning-emphasis' : 'text-body-secondary',
                                )}
                            >
                                {item.icon} {item.name}
                            </button>
                        ))}
                    </div>
                </section>

                {canManage && mode === 'catalogue' && (
                    <p className="text-body-secondary d-flex align-items-start gap-2 small">
                        <ShieldCheck className="mt-1 mn-icon-4 flex-shrink-0" aria-hidden />
                        Les modèles sont désactivés au départ. Seules les récompenses activées sont visibles par les autres comptes de la famille.
                    </p>
                )}

                <section aria-label="Récompenses disponibles" className="d-grid mn-min-w-0 mn-columns-1 gap-3 mn-sm-columns-2 mn-lg-columns-3">
                    {visible.map((reward) => (
                        <article
                            key={reward.id ? 'reward-' + reward.id : reward.template_key}
                            className="bg-body d-flex mn-min-w-0 flex-column rounded-4 border p-4"
                        >
                            <div className="d-flex align-items-start justify-content-between gap-3">
                                <span
                                    className="bg-body-tertiary d-flex mn-icon-14 align-items-center justify-content-center rounded-4 fs-2"
                                    aria-hidden
                                >
                                    {reward.icon}
                                </span>
                                <span className="d-inline-flex align-items-center gap-1 rounded-pill bg-warning-subtle px-3 py-2 small fw-semibold text-warning-emphasis">
                                    <Star className="mn-icon-4 fill-current" aria-hidden />
                                    {reward.star_cost} {reward.star_cost === 1 ? 'étoile' : 'étoiles'}
                                </span>
                            </div>
                            <h2 className="mt-3 fw-semibold text-break">{reward.title}</h2>
                            <p className="text-body-secondary mt-2 flex-fill small lh-lg text-break">{reward.description}</p>
                            <div className="mt-3 d-flex flex-wrap gap-2">
                                <Badge variant="secondary">
                                    {reward.audience === 'family' ? (
                                        <>
                                            <Users className="me-1 mn-icon-3" />
                                            Toute la famille
                                        </>
                                    ) : (
                                        'Pour une personne'
                                    )}
                                </Badge>
                                {canManage && mode === 'catalogue' && (
                                    <Badge variant="outline" className={reward.is_active ? 'text-success-emphasis' : 'text-body-secondary'}>
                                        {reward.is_active ? 'Activée' : 'À activer'}
                                    </Badge>
                                )}
                                {!reward.template_key && <Badge variant="outline">Notre idée</Badge>}
                            </div>
                            {canManage && (
                                <div className="mt-3 d-flex flex-wrap gap-2 border-top pt-3">
                                    <Button
                                        variant={reward.is_active ? 'outline' : 'default'}
                                        size="sm"
                                        disabled={busy !== null}
                                        onClick={() => toggle(reward)}
                                    >
                                        {busy === String(reward.id ?? reward.template_key)
                                            ? 'En cours…'
                                            : reward.is_active
                                              ? 'Désactiver'
                                              : 'Activer'}
                                    </Button>
                                    <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => setEditing(reward)}>
                                        <Pencil />
                                        Personnaliser
                                    </Button>
                                </div>
                            )}
                        </article>
                    ))}
                </section>

                {!visible.length && (
                    <div className="rounded-4 border border-dashed p-5 text-center">
                        <Gift className="text-body-secondary mx-auto mb-3 mn-icon-8" aria-hidden />
                        <p className="fw-medium">
                            {!active.length && mode === 'active' ? 'Les belles envies se préparent…' : 'Aucune récompense ne correspond.'}
                        </p>
                        <p className="text-body-secondary mt-2 small">
                            {canManage && mode === 'active' && !active.length
                                ? 'Ouvre le catalogue des parents pour activer vos premières récompenses.'
                                : !canManage && !active.length
                                  ? 'Tes parents choisiront ici les récompenses proposées à la famille.'
                                  : 'Essaie une autre catégorie ou un autre mot.'}
                        </p>
                        {canManage && mode === 'active' && !active.length && (
                            <Button className="mt-3" onClick={() => setMode('catalogue')}>
                                Explorer les idées
                            </Button>
                        )}
                    </div>
                )}

                {canManage && (
                    <details className="bg-body rounded-3 border p-3">
                        <summary className="cursor-pointer small fw-semibold">🛡️ Qui peut gérer les récompenses ?</summary>
                        <p className="text-body-secondary mt-3 small">
                            Choisis les comptes autorisés à activer et modifier les récompenses. Les autres comptes voient uniquement la sélection de
                            la famille.
                        </p>
                        <div className="mt-3 d-grid gap-3">
                            {accounts.map((account) => (
                                <div
                                    key={account.id}
                                    className="d-flex flex-wrap align-items-center justify-content-between gap-3 rounded-3 border p-3"
                                >
                                    <div className="mn-min-w-0">
                                        <p className="small fw-medium text-break">
                                            {account.name}
                                            {account.is_parent && <span className="ms-2 small text-success-emphasis">Parent</span>}
                                        </p>
                                        <p className="text-body-secondary small text-break">{account.email}</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={busy !== null || (account.is_parent && parents <= 1)}
                                        onClick={() => changeParent(account)}
                                    >
                                        {account.is_parent ? 'Retirer l’accès parent' : 'Donner l’accès parent'}
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <p className="text-body-secondary mt-3 small">Le foyer conserve toujours au moins un compte parent.</p>
                        {accessError && (
                            <p role="alert" className="text-danger mt-3 small">
                                {accessError}
                            </p>
                        )}
                    </details>
                )}
            </div>
            {editing && <RewardDialog reward={editing} categories={categories} onClose={() => setEditing(null)} />}
        </AppLayout>
    );
}
