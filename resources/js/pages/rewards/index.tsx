import { Field, NativeSelect } from '@/components/form-fields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Check, Gift, Pencil, Plus, Search, ShieldCheck, Sparkles, Star, Users } from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface Category { key: string; name: string; icon: string }
interface Reward {
    id?: number; template_key: string | null; title: string; description: string | null;
    icon: string; category: string; star_cost: number; audience: 'individual' | 'family'; is_active: boolean;
}
interface Template extends Omit<Reward, 'id' | 'is_active'> { reward: Reward | null }
interface Account { id: number; name: string; email: string; is_parent: boolean }
interface Props { canManage: boolean; rewards: Reward[]; templates: Template[]; categories: Category[]; accounts: Account[] }
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Récompenses', href: '/rewards' }];
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function RewardDialog({ reward, categories, onClose }: { reward: Reward; categories: Category[]; onClose: () => void }) {
    const form = useForm({
        template_key: reward.template_key, title: reward.title, description: reward.description ?? '',
        icon: reward.icon, category: reward.category, star_cost: reward.star_cost,
        audience: reward.audience, is_active: reward.is_active,
    });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };
        if (reward.id) form.patch(route('rewards.update', reward.id), options);
        else form.post(route('rewards.store'), options);
    };

    return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-h-[90svh] overflow-y-auto">
            <DialogHeader><DialogTitle>{reward.id || reward.template_key ? 'Personnaliser la récompense' : 'Une récompense bien à vous'}</DialogTitle><DialogDescription>Choisis ce qui fait plaisir à votre famille et un coût en étoiles adapté.</DialogDescription></DialogHeader>
            <form onSubmit={submit} className="grid gap-4">
                <Field label="Nom" error={form.errors.title}><Input value={form.data.title} onChange={(event) => form.setData('title', event.target.value)} maxLength={120} required autoFocus /></Field>
                <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3">
                    <Field label="Icône" error={form.errors.icon}><Input value={form.data.icon} onChange={(event) => form.setData('icon', event.target.value)} maxLength={16} required /></Field>
                    <Field label="Catégorie" error={form.errors.category}><NativeSelect value={form.data.category} onChange={(event) => form.setData('category', event.target.value)}>{categories.map((category) => <option key={category.key} value={category.key}>{category.icon} {category.name}</option>)}</NativeSelect></Field>
                </div>
                <Field label="Description" error={form.errors.description}><textarea value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} maxLength={1000} rows={3} className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" /></Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Coût en étoiles" error={form.errors.star_cost}><Input type="number" min={1} max={100} required value={form.data.star_cost} onChange={(event) => form.setData('star_cost', Number(event.target.value))} /></Field>
                    <Field label="Pour qui ?" error={form.errors.audience}><NativeSelect value={form.data.audience} onChange={(event) => form.setData('audience', event.target.value as Reward['audience'])}><option value="individual">Une personne</option><option value="family">Toute la famille</option></NativeSelect></Field>
                </div>
                <label className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={form.data.is_active} onChange={(event) => form.setData('is_active', event.target.checked)} />Visible dans les récompenses de la famille</label>
                {form.errors.is_active && <p role="alert" className="text-destructive text-sm">{form.errors.is_active}</p>}
                <DialogFooter><Button type="submit" disabled={form.processing}>{form.processing ? 'Enregistrement…' : 'Enregistrer'}</Button></DialogFooter>
            </form>
        </DialogContent>
    </Dialog>;
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
    const visible = source.filter((reward) => (category === 'all' || category === reward.category)
        && (audience === 'all' || audience === reward.audience)
        && normalize(reward.title + ' ' + (reward.description ?? '')).includes(normalize(search)))
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
        router.patch(route('rewards.parents.update', account.id), { is_parent: !account.is_parent }, {
            preserveScroll: true, onFinish: () => setBusy(null), onError: (errors) => setAccessError(errors.parent_access ?? 'Impossible de modifier cet accès.'),
        });
    };

    return <AppLayout breadcrumbs={breadcrumbs}>
        <Head title="Récompenses" />
        <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-6 p-4 pb-8">
            <header className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-5 dark:border-amber-900 dark:from-amber-950 dark:via-orange-950 dark:to-rose-950 sm:p-7">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-200"><Sparkles className="size-4" aria-hidden /> Des envies à partager</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Les petits efforts font de beaux moments.</h1>
                <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">{canManage ? 'Des idées pour motiver petits et grands. Active les récompenses qui vous ressemblent, ajuste les étoiles et invente vos propres moments en famille.' : 'Découvre les récompenses choisies par tes parents : des jeux, des sorties et des moments à partager en famille.'}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-amber-300 bg-white/60 dark:bg-white/5"><Gift className="mr-1 size-3" />{active.length} récompense(s) active(s)</Badge>{canManage && <Badge variant="outline" className="border-amber-300 bg-white/60 dark:bg-white/5"><ShieldCheck className="mr-1 size-3" />Espace parent</Badge>}</div>
            </header>

            {flash?.success && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"><Check className="size-4 shrink-0" aria-hidden />{flash.success}</p>}

            {canManage && <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="bg-muted flex flex-wrap gap-1 rounded-xl p-1" aria-label="Vue des récompenses">
                    <Button variant={mode === 'active' ? 'outline' : 'ghost'} type="button" onClick={() => setMode('active')} aria-pressed={mode === 'active'}>Pour la famille ({active.length})</Button>
                    <Button variant={mode === 'catalogue' ? 'outline' : 'ghost'} type="button" onClick={() => setMode('catalogue')} aria-pressed={mode === 'catalogue'}><ShieldCheck />Catalogue des parents</Button>
                </div>
                <Button onClick={() => setEditing({ template_key: null, title: '', description: '', icon: '🎁', category: categories[0].key, star_cost: 1, audience: 'individual', is_active: true })}><Plus />Créer une récompense</Button>
            </div>}

            <section aria-label="Filtres des récompenses" className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
                <div className="relative"><Search className="text-muted-foreground pointer-events-none absolute top-3 left-3 size-4" aria-hidden /><Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Rechercher une récompense" placeholder="Une sortie, un jeu, un moment ensemble…" className="pl-9" /></div>
                <NativeSelect aria-label="Pour qui ?" value={audience} onChange={(event) => setAudience(event.target.value)}><option value="all">Pour tout le monde</option><option value="individual">Individuelles</option><option value="family">Collectives</option></NativeSelect>
                <div className="flex min-w-0 flex-wrap gap-2 md:col-span-2">
                    {[{ key: 'all', name: 'Toutes les envies', icon: '🎁' }, ...categories].map((item) => <button type="button" key={item.key} aria-pressed={category === item.key} onClick={() => setCategory(item.key)} className={cn('rounded-full border px-3 py-2 text-xs font-medium transition-colors', category === item.key ? 'border-amber-400 bg-amber-100 text-amber-950 dark:bg-amber-900 dark:text-amber-100' : 'text-muted-foreground hover:bg-muted')}>{item.icon} {item.name}</button>)}
                </div>
            </section>

            {canManage && mode === 'catalogue' && <p className="text-muted-foreground flex items-start gap-2 text-sm"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />Les modèles sont désactivés au départ. Seules les récompenses activées sont visibles par les autres comptes de la famille.</p>}

            <section aria-label="Récompenses disponibles" className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((reward) => <article key={reward.id ? 'reward-' + reward.id : reward.template_key} className="bg-card flex min-w-0 flex-col rounded-2xl border p-5">
                    <div className="flex items-start justify-between gap-3"><span className="bg-muted flex size-14 items-center justify-center rounded-2xl text-3xl" aria-hidden>{reward.icon}</span><span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-900 dark:bg-amber-900 dark:text-amber-100"><Star className="size-4 fill-current" aria-hidden />{reward.star_cost} {reward.star_cost === 1 ? 'étoile' : 'étoiles'}</span></div>
                    <h2 className="mt-4 font-semibold break-words">{reward.title}</h2>
                    <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed break-words">{reward.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2"><Badge variant="secondary">{reward.audience === 'family' ? <><Users className="mr-1 size-3" />Toute la famille</> : 'Pour une personne'}</Badge>{canManage && mode === 'catalogue' && <Badge variant="outline" className={reward.is_active ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}>{reward.is_active ? 'Activée' : 'À activer'}</Badge>}{!reward.template_key && <Badge variant="outline">Notre idée</Badge>}</div>
                    {canManage && <div className="mt-4 flex flex-wrap gap-2 border-t pt-4"><Button variant={reward.is_active ? 'outline' : 'default'} size="sm" disabled={busy !== null} onClick={() => toggle(reward)}>{busy === String(reward.id ?? reward.template_key) ? 'En cours…' : reward.is_active ? 'Désactiver' : 'Activer'}</Button><Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => setEditing(reward)}><Pencil />Personnaliser</Button></div>}
                </article>)}
            </section>

            {!visible.length && <div className="rounded-2xl border border-dashed p-8 text-center"><Gift className="text-muted-foreground mx-auto mb-3 size-8" aria-hidden /><p className="font-medium">{!active.length && mode === 'active' ? 'Les belles envies se préparent…' : 'Aucune récompense ne correspond.'}</p><p className="text-muted-foreground mt-2 text-sm">{canManage && mode === 'active' && !active.length ? 'Ouvre le catalogue des parents pour activer vos premières récompenses.' : !canManage && !active.length ? 'Tes parents choisiront ici les récompenses proposées à la famille.' : 'Essaie une autre catégorie ou un autre mot.'}</p>{canManage && mode === 'active' && !active.length && <Button className="mt-4" onClick={() => setMode('catalogue')}>Explorer les idées</Button>}</div>}

            {canManage && <details className="bg-card rounded-xl border p-4">
                <summary className="cursor-pointer text-sm font-semibold">🛡️ Qui peut gérer les récompenses ?</summary>
                <p className="text-muted-foreground mt-3 text-sm">Choisis les comptes autorisés à activer et modifier les récompenses. Les autres comptes voient uniquement la sélection de la famille.</p>
                <div className="mt-4 grid gap-3">{accounts.map((account) => <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="text-sm font-medium break-words">{account.name}{account.is_parent && <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-300">Parent</span>}</p><p className="text-muted-foreground text-xs break-all">{account.email}</p></div><Button variant="outline" size="sm" disabled={busy !== null || (account.is_parent && parents <= 1)} onClick={() => changeParent(account)}>{account.is_parent ? 'Retirer l’accès parent' : 'Donner l’accès parent'}</Button></div>)}</div>
                <p className="text-muted-foreground mt-3 text-xs">Le foyer conserve toujours au moins un compte parent.</p>
                {accessError && <p role="alert" className="text-destructive mt-3 text-sm">{accessError}</p>}
            </details>}
        </div>
        {editing && <RewardDialog reward={editing} categories={categories} onClose={() => setEditing(null)} />}
    </AppLayout>;
}
