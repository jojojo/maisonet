import { Badge } from '@/components/bootstrap/badge';
import { Button } from '@/components/bootstrap/button';
import { Input } from '@/components/bootstrap/input';
import { Field, MemberDot, NativeSelect } from '@/components/form-fields';
import AppLayout from '@/layouts/app-layout';
import { recurrenceLabel, recurrenceOptions, todayISO } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type EffortSize, type Recurrence, type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { BookOpen, Check, CheckCheck, ListFilter, Plus, Search, Sparkles, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface Category {
    key: string;
    name: string;
    icon: string;
}
interface Template {
    key: string;
    category: string;
    title: string;
    notes: string | null;
    recurrence: Recurrence;
    interval: number;
    effort_size: EffortSize;
    effort_points: number;
    essential: boolean;
    existing_room_ids: number[];
}
interface Selection {
    key: string;
    recurrence: Recurrence;
    interval: number;
    effort_size: EffortSize;
}
interface Props {
    templates: Template[];
    categories: Category[];
    suggestions: Record<number, string>;
    defaultRoomId: number | null;
}
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Catalogue', href: '/task-templates' }];
const effortPoints: Record<EffortSize, number> = { XS: 1, S: 2, M: 3, L: 5, XL: 8 };
const normalize = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

export default function TaskTemplates({ templates, categories, suggestions, defaultRoomId }: Props) {
    const { rooms, members, flash } = usePage<SharedData>().props;
    const initialRoom = defaultRoomId ?? rooms[0]?.id;
    const [category, setCategory] = useState(initialRoom ? (suggestions[initialRoom] ?? 'common') : 'all');
    const [search, setSearch] = useState('');
    const [smallOnly, setSmallOnly] = useState(false);
    const [selectedOnly, setSelectedOnly] = useState(false);
    const form = useForm({
        room_id: initialRoom ? String(initialRoom) : '',
        member_ids: [] as number[],
        start_date: todayISO(),
        schedule: 'spread',
        items: [] as Selection[],
    });
    const room = rooms.find((item) => item.id === Number(form.data.room_id));
    const chosen = new Map(form.data.items.map((item) => [item.key, item]));
    const exists = (template: Template) => template.existing_room_ids.includes(Number(form.data.room_id));
    const visible = templates.filter((template) => {
        const selection = chosen.get(template.key);
        return (
            (selectedOnly
                ? !!selection
                : category === 'all' || template.category === category || (category !== 'common' && template.category === 'common')) &&
            (!smallOnly || effortPoints[selection?.effort_size ?? template.effort_size] <= 2) &&
            normalize(template.title + ' ' + (template.notes ?? '')).includes(normalize(search))
        );
    });
    const available = visible.filter((template) => !exists(template));
    const points = form.data.items.reduce((sum, item) => sum + effortPoints[item.effort_size], 0);
    const defaults = (template: Template): Selection => ({
        key: template.key,
        recurrence: template.recurrence,
        interval: template.interval,
        effort_size: template.effort_size,
    });

    const toggle = (template: Template) => {
        form.clearErrors();
        form.setData(
            'items',
            chosen.has(template.key) ? form.data.items.filter((item) => item.key !== template.key) : [...form.data.items, defaults(template)],
        );
    };
    const selectMany = (items: Template[]) => {
        const next = new Map(chosen);
        items
            .filter((item) => !exists(item))
            .forEach((item) => {
                if (!next.has(item.key)) next.set(item.key, defaults(item));
            });
        form.clearErrors();
        form.setData('items', [...next.values()]);
    };
    const update = (key: string, values: Partial<Selection>) =>
        form.setData(
            'items',
            form.data.items.map((item) => (item.key === key ? { ...item, ...values } : item)),
        );
    const changeRoom = (value: string) => {
        form.setData({ ...form.data, room_id: value, items: [] });
        form.clearErrors();
        setCategory(suggestions[Number(value)] ?? 'common');
        setSelectedOnly(false);
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('task-templates.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('items');
                setSelectedOnly(false);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Catalogue de tâches" />
            <form onSubmit={submit} className="mx-auto d-flex w-100 mn-min-w-0 mn-content-6xl flex-column gap-4 p-3 pb-5">
                <header className="rounded-4 border border-success-subtle brand-hero p-4 p-sm-4">
                    <p className="mb-2 d-flex align-items-center gap-2 small fw-semibold text-uppercase eyebrow-spacing text-success-emphasis">
                        <BookOpen className="mn-icon-4" aria-hidden /> {templates.length} modèles pour ta maison
                    </p>
                    <h1 className="fs-3 fw-semibold">Les bonnes missions, sans tout saisir.</h1>
                    <p className="text-body-secondary mt-2 mn-content-2xl small lh-lg">
                        Choisis une pièce, coche les tâches utiles et ajoute-les en un seul geste. Les fréquences et les points d’effort sont des
                        suggestions : ajuste-les à votre rythme.
                    </p>
                </header>

                {rooms.length === 0 ? (
                    <div className="rounded-3 border border-dashed p-5 text-center">
                        <p className="text-body-secondary mb-3 small">Crée d’abord une pièce pour pouvoir y ajouter des modèles.</p>
                        <Button asChild>
                            <Link href={route('rooms.index')}>Créer une pièce</Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        {flash?.success && (
                            <p
                                role="status"
                                className="d-flex align-items-center gap-2 rounded-3 border border-success-subtle bg-success-subtle p-3 small text-success-emphasis"
                            >
                                <Check className="mn-icon-4 flex-shrink-0" aria-hidden />
                                {flash.success}
                            </p>
                        )}

                        <section
                            aria-label="Destination et planification"
                            className="bg-body d-grid mn-min-w-0 mn-columns-1 gap-3 rounded-3 border p-3 mn-sm-columns-2 mn-lg-columns-3"
                        >
                            <Field label="1. Ajouter dans cette pièce" error={form.errors.room_id}>
                                <NativeSelect
                                    value={form.data.room_id}
                                    onChange={(event) => changeRoom(event.target.value)}
                                    disabled={form.processing}
                                >
                                    {rooms.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.icon} {item.name}
                                        </option>
                                    ))}
                                </NativeSelect>
                                {form.data.items.length > 0 && (
                                    <span className="text-body-secondary small fw-normal">Changer de pièce vide la sélection.</span>
                                )}
                            </Field>
                            <Field label="Date de départ" error={form.errors.start_date}>
                                <Input
                                    type="date"
                                    value={form.data.start_date}
                                    onChange={(event) => form.setData('start_date', event.target.value)}
                                    required
                                    disabled={form.processing}
                                />
                            </Field>
                            <Field label="Premières échéances" error={form.errors.schedule}>
                                <NativeSelect
                                    value={form.data.schedule}
                                    onChange={(event) => form.setData('schedule', event.target.value)}
                                    disabled={form.processing}
                                >
                                    <option value="spread">Après un premier intervalle</option>
                                    <option value="same_date">Toutes à la date de départ</option>
                                </NativeSelect>
                            </Field>
                            <div className="mn-sm-span-2 mn-lg-span-3">
                                <fieldset className="mn-min-w-0">
                                    <legend className="mb-2 small fw-medium">
                                        Attribuer toute la sélection à <span className="text-body-secondary fw-normal">(facultatif)</span>
                                    </legend>
                                    <div className="d-flex flex-wrap gap-2">
                                        {members.map((member) => (
                                            <label
                                                key={member.id}
                                                className={cn(
                                                    'd-flex cursor-pointer align-items-center gap-2 rounded-3 border px-3 py-2 small',
                                                    form.data.member_ids.includes(member.id) && 'border-success bg-success-subtle',
                                                )}
                                            >
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={form.data.member_ids.includes(member.id)}
                                                    disabled={form.processing}
                                                    onChange={(event) =>
                                                        form.setData(
                                                            'member_ids',
                                                            event.target.checked
                                                                ? [...form.data.member_ids, member.id]
                                                                : form.data.member_ids.filter((id) => id !== member.id),
                                                        )
                                                    }
                                                />
                                                <MemberDot color={member.color} />
                                                {member.name}
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                                <p className="text-body-secondary mt-3 small lh-lg">
                                    {form.data.schedule === 'spread'
                                        ? 'Les échéances suivent chaque fréquence : une tâche hebdomadaire est à faire 7 jours après la date de départ. Une tâche ponctuelle garde la date choisie.'
                                        : 'Toutes les tâches seront à faire à la date choisie, puis suivront leur propre récurrence.'}{' '}
                                    Sans personne cochée, les tâches restent non attribuées.
                                </p>
                            </div>
                        </section>

                        <div className="d-grid mn-min-w-0 mn-columns-1 align-items-start gap-4 mn-lg-columns-220px-minmax-0-1fr">
                            <aside className="mn-min-w-0 position-lg-sticky mn-lg-top-4">
                                <h2 className="mb-3 small fw-semibold">2. Explorer les modèles</h2>
                                <div aria-label="Types de pièces" className="d-flex gap-2 overflow-x-auto pb-2 flex-lg-column overflow-visible">
                                    {[{ key: 'all', name: 'Tous les modèles', icon: '🏠' }, ...categories].map((item) => (
                                        <button
                                            type="button"
                                            key={item.key}
                                            onClick={() => {
                                                setCategory(item.key);
                                                setSelectedOnly(false);
                                            }}
                                            aria-pressed={!selectedOnly && category === item.key}
                                            className={cn(
                                                'd-flex flex-shrink-0 align-items-center gap-2 rounded-3 px-3 py-2 text-start small',
                                                !selectedOnly && category === item.key
                                                    ? 'bg-success-subtle fw-medium text-success-emphasis'
                                                    : 'text-body-secondary',
                                            )}
                                        >
                                            <span aria-hidden>{item.icon}</span>
                                            {item.name}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-body-secondary mt-3 d-none small lh-lg d-lg-block">
                                    Les tâches communes sont aussi proposées dans chaque type de pièce. Les tâches déjà présentes sont repérées
                                    automatiquement.
                                </p>
                            </aside>

                            <section className="mn-min-w-0" aria-label="Modèles de tâches">
                                <div className="bg-body mb-3 d-grid gap-3 rounded-3 border p-3">
                                    <div className="position-relative">
                                        <Search
                                            className="text-body-secondary pe-none position-absolute mn-top-2-5 mn-left-3 mn-icon-4"
                                            aria-hidden
                                        />
                                        <Input
                                            type="search"
                                            aria-label="Rechercher un modèle"
                                            placeholder="Rechercher une tâche…"
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            className="ps-5"
                                        />
                                    </div>
                                    <div className="d-flex flex-wrap align-items-center gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={smallOnly ? 'secondary' : 'outline'}
                                            aria-pressed={smallOnly}
                                            onClick={() => setSmallOnly(!smallOnly)}
                                        >
                                            <Sparkles /> Petits efforts (XS / S)
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={selectedOnly ? 'secondary' : 'outline'}
                                            aria-pressed={selectedOnly}
                                            onClick={() => setSelectedOnly(!selectedOnly)}
                                        >
                                            <ListFilter /> Ma sélection ({form.data.items.length})
                                        </Button>
                                    </div>
                                    <div className="d-flex flex-wrap align-items-center gap-2 border-top pt-3">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            disabled={form.processing || !available.some((item) => item.essential && !chosen.has(item.key))}
                                            onClick={() => selectMany(available.filter((item) => item.essential))}
                                        >
                                            <Sparkles /> Cocher les essentiels
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            disabled={form.processing || !available.some((item) => !chosen.has(item.key))}
                                            onClick={() => selectMany(available)}
                                        >
                                            <CheckCheck /> Tout cocher ici
                                        </Button>
                                        <span className="text-body-secondary small">{visible.length} modèle(s) affiché(s)</span>
                                    </div>
                                </div>

                                <div className="d-grid gap-3">
                                    {visible.map((template) => {
                                        const selection = chosen.get(template.key);
                                        const already = exists(template);
                                        const type = categories.find((item) => item.key === template.category);
                                        return (
                                            <article
                                                key={template.key}
                                                className={cn(
                                                    'bg-body rounded-3 border p-3',
                                                    selection && 'border-success bg-success-subtle',
                                                    already && 'bg-body-tertiary',
                                                )}
                                            >
                                                <label
                                                    className={cn('d-flex align-items-start gap-3', already ? 'cursor-default' : 'cursor-pointer')}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input mt-1 mn-icon-4 flex-shrink-0"
                                                        checked={already || !!selection}
                                                        disabled={already || form.processing}
                                                        onChange={() => toggle(template)}
                                                    />
                                                    <span className="mn-min-w-0 flex-fill">
                                                        <span className="d-block fw-medium text-break">{template.title}</span>
                                                        <span className="text-body-secondary mt-1 d-block small">
                                                            {type?.icon} {type?.name} ·{' '}
                                                            {recurrenceLabel(
                                                                selection?.recurrence ?? template.recurrence,
                                                                selection?.interval ?? template.interval,
                                                            )}{' '}
                                                            · {selection?.effort_size ?? template.effort_size} ·{' '}
                                                            {effortPoints[selection?.effort_size ?? template.effort_size]} pts
                                                        </span>
                                                        {template.notes && (
                                                            <span className="text-body-secondary mt-2 d-block small lh-lg">{template.notes}</span>
                                                        )}
                                                    </span>
                                                </label>
                                                <div className="mt-2 d-flex flex-wrap gap-2 ps-4">
                                                    {already ? (
                                                        <Badge variant="secondary">
                                                            <Check className="me-1 mn-icon-3" />
                                                            Déjà dans cette pièce
                                                        </Badge>
                                                    ) : (
                                                        template.essential && (
                                                            <Badge variant="outline" className="text-success-emphasis">
                                                                Essentiel
                                                            </Badge>
                                                        )
                                                    )}
                                                </div>
                                                {selection && !already && (
                                                    <div className="mt-3 d-grid gap-3 border-top pt-3 mn-sm-columns-3">
                                                        <Field label="Récurrence">
                                                            <NativeSelect
                                                                value={selection.recurrence}
                                                                onChange={(event) =>
                                                                    update(template.key, { recurrence: event.target.value as Recurrence })
                                                                }
                                                                disabled={form.processing}
                                                            >
                                                                {recurrenceOptions.map((option) => (
                                                                    <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </option>
                                                                ))}
                                                            </NativeSelect>
                                                        </Field>
                                                        {selection.recurrence !== 'once' ? (
                                                            <Field
                                                                label={`Intervalle (${recurrenceOptions.find((option) => option.value === selection.recurrence)?.unit})`}
                                                            >
                                                                <Input
                                                                    type="number"
                                                                    min={1}
                                                                    max={365}
                                                                    required
                                                                    value={selection.interval}
                                                                    onChange={(event) =>
                                                                        update(template.key, { interval: Number(event.target.value) })
                                                                    }
                                                                    disabled={form.processing}
                                                                />
                                                            </Field>
                                                        ) : (
                                                            <p className="text-body-secondary align-self-center small">
                                                                Une seule fois à la date de départ.
                                                            </p>
                                                        )}
                                                        <Field label="Effort">
                                                            <NativeSelect
                                                                value={selection.effort_size}
                                                                onChange={(event) =>
                                                                    update(template.key, { effort_size: event.target.value as EffortSize })
                                                                }
                                                                disabled={form.processing}
                                                            >
                                                                {Object.entries(effortPoints).map(([size, value]) => (
                                                                    <option key={size} value={size}>
                                                                        {size} · {value} {value === 1 ? 'point' : 'points'}
                                                                    </option>
                                                                ))}
                                                            </NativeSelect>
                                                        </Field>
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })}
                                    {!visible.length && (
                                        <p className="text-body-secondary rounded-3 border border-dashed p-5 text-center small">
                                            {selectedOnly && !form.data.items.length
                                                ? 'Aucune tâche sélectionnée. Explore les modèles pour commencer.'
                                                : 'Aucun modèle ne correspond aux filtres.'}
                                        </p>
                                    )}
                                </div>
                            </section>
                        </div>

                        <div
                            className={cn(
                                'bg-body bg-opacity-75 z-1 d-flex flex-wrap align-items-center justify-content-between gap-2 rounded-3 border p-3 shadow gap-sm-3 p-sm-3',
                                form.data.items.length ? 'position-sticky mn-bottom-3' : 'position-relative',
                            )}
                        >
                            <div className="mn-min-w-0">
                                <p className="small fw-semibold" aria-live="polite">
                                    <span className="d-sm-none">
                                        {form.data.items.length} tâche(s) · {points} pts
                                    </span>
                                    <span className="d-none d-sm-inline">
                                        {form.data.items.length} tâche(s) sélectionnée(s) · {points} points d’effort
                                    </span>
                                </p>
                                <p className="text-body-secondary mt-1 d-none small d-sm-block">
                                    Destination : {room?.icon} {room?.name}. Changer de pièce remet la sélection à zéro.
                                </p>
                            </div>
                            <div className="d-flex flex-wrap align-items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Vider la sélection"
                                    disabled={!form.data.items.length || form.processing}
                                    onClick={() => form.setData('items', [])}
                                >
                                    <X />
                                    <span className="d-none d-sm-inline">Vider</span>
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!form.data.items.length || !room || form.processing}
                                    className="bg-success text-white"
                                >
                                    <Plus />
                                    {form.processing ? 'Ajout…' : `Ajouter (${form.data.items.length})`}
                                </Button>
                            </div>
                            {Object.entries(form.errors).length > 0 && (
                                <div role="alert" className="text-danger w-100 small">
                                    {[...new Set(Object.values(form.errors))].map((error) => (
                                        <p key={error}>{error}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </form>
        </AppLayout>
    );
}
