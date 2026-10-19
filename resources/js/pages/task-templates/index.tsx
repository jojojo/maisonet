import { Field, MemberDot, NativeSelect } from '@/components/form-fields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { recurrenceLabel, recurrenceOptions, todayISO } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type EffortSize, type Recurrence, type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { BookOpen, Check, CheckCheck, ListFilter, Plus, Search, Sparkles, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface Category { key: string; name: string; icon: string }
interface Template {
    key: string; category: string; title: string; notes: string | null;
    recurrence: Recurrence; interval: number; effort_size: EffortSize; effort_points: number;
    essential: boolean; existing_room_ids: number[];
}
interface Selection { key: string; recurrence: Recurrence; interval: number; effort_size: EffortSize }
interface Props { templates: Template[]; categories: Category[]; suggestions: Record<number, string>; defaultRoomId: number | null }
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Catalogue', href: '/task-templates' }];
const effortPoints: Record<EffortSize, number> = { XS: 1, S: 2, M: 3, L: 5, XL: 8 };
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function TaskTemplates({ templates, categories, suggestions, defaultRoomId }: Props) {
    const { rooms, members, flash } = usePage<SharedData>().props;
    const initialRoom = defaultRoomId ?? rooms[0]?.id;
    const [category, setCategory] = useState(initialRoom ? suggestions[initialRoom] ?? 'common' : 'all');
    const [search, setSearch] = useState('');
    const [smallOnly, setSmallOnly] = useState(false);
    const [selectedOnly, setSelectedOnly] = useState(false);
    const form = useForm({
        room_id: initialRoom ? String(initialRoom) : '', member_ids: [] as number[],
        start_date: todayISO(), schedule: 'spread', items: [] as Selection[],
    });
    const room = rooms.find((item) => item.id === Number(form.data.room_id));
    const chosen = new Map(form.data.items.map((item) => [item.key, item]));
    const exists = (template: Template) => template.existing_room_ids.includes(Number(form.data.room_id));
    const visible = templates.filter((template) => {
        const selection = chosen.get(template.key);
        return (selectedOnly ? !!selection : category === 'all' || template.category === category || (category !== 'common' && template.category === 'common'))
            && (!smallOnly || effortPoints[selection?.effort_size ?? template.effort_size] <= 2)
            && normalize(template.title + ' ' + (template.notes ?? '')).includes(normalize(search));
    });
    const available = visible.filter((template) => !exists(template));
    const points = form.data.items.reduce((sum, item) => sum + effortPoints[item.effort_size], 0);
    const defaults = (template: Template): Selection => ({ key: template.key, recurrence: template.recurrence, interval: template.interval, effort_size: template.effort_size });

    const toggle = (template: Template) => {
        form.clearErrors();
        form.setData('items', chosen.has(template.key) ? form.data.items.filter((item) => item.key !== template.key) : [...form.data.items, defaults(template)]);
    };
    const selectMany = (items: Template[]) => {
        const next = new Map(chosen);
        items.filter((item) => !exists(item)).forEach((item) => { if (!next.has(item.key)) next.set(item.key, defaults(item)); });
        form.clearErrors();
        form.setData('items', [...next.values()]);
    };
    const update = (key: string, values: Partial<Selection>) => form.setData('items', form.data.items.map((item) => item.key === key ? { ...item, ...values } : item));
    const changeRoom = (value: string) => {
        form.setData({ ...form.data, room_id: value, items: [] });
        form.clearErrors();
        setCategory(suggestions[Number(value)] ?? 'common');
        setSelectedOnly(false);
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('task-templates.store'), { preserveScroll: true, onSuccess: () => { form.reset('items'); setSelectedOnly(false); } });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Catalogue de tâches" />
            <form onSubmit={submit} className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6 p-4 pb-8">
                <header className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 dark:border-emerald-900 dark:from-emerald-950 dark:to-teal-950 sm:p-6">
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-300"><BookOpen className="size-4" aria-hidden /> {templates.length} modèles pour ta maison</p>
                    <h1 className="text-2xl font-semibold tracking-tight">Les bonnes missions, sans tout saisir.</h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">Choisis une pièce, coche les tâches utiles et ajoute-les en un seul geste. Les fréquences et les points d’effort sont des suggestions : ajuste-les à votre rythme.</p>
                </header>

                {rooms.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-8 text-center">
                        <p className="text-muted-foreground mb-4 text-sm">Crée d’abord une pièce pour pouvoir y ajouter des modèles.</p>
                        <Button asChild><Link href={route('rooms.index')}>Créer une pièce</Link></Button>
                    </div>
                ) : <>
                    {flash?.success && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><Check className="size-4 shrink-0" aria-hidden />{flash.success}</p>}

                    <section aria-label="Destination et planification" className="bg-card grid min-w-0 grid-cols-1 gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Field label="1. Ajouter dans cette pièce" error={form.errors.room_id}>
                            <NativeSelect value={form.data.room_id} onChange={(event) => changeRoom(event.target.value)} disabled={form.processing}>
                                {rooms.map((item) => <option key={item.id} value={item.id}>{item.icon} {item.name}</option>)}
                            </NativeSelect>
                            {form.data.items.length > 0 && <span className="text-muted-foreground text-xs font-normal">Changer de pièce vide la sélection.</span>}
                        </Field>
                        <Field label="Date de départ" error={form.errors.start_date}>
                            <Input type="date" value={form.data.start_date} onChange={(event) => form.setData('start_date', event.target.value)} required disabled={form.processing} />
                        </Field>
                        <Field label="Premières échéances" error={form.errors.schedule}>
                            <NativeSelect value={form.data.schedule} onChange={(event) => form.setData('schedule', event.target.value)} disabled={form.processing}>
                                <option value="spread">Après un premier intervalle</option>
                                <option value="same_date">Toutes à la date de départ</option>
                            </NativeSelect>
                        </Field>
                        <div className="sm:col-span-2 lg:col-span-3">
                            <fieldset className="min-w-0">
                                <legend className="mb-2 text-sm font-medium">Attribuer toute la sélection à <span className="text-muted-foreground font-normal">(facultatif)</span></legend>
                                <div className="flex flex-wrap gap-2">
                                    {members.map((member) => <label key={member.id} className={cn('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm', form.data.member_ids.includes(member.id) && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950')}>
                                        <input type="checkbox" checked={form.data.member_ids.includes(member.id)} disabled={form.processing} onChange={(event) => form.setData('member_ids', event.target.checked ? [...form.data.member_ids, member.id] : form.data.member_ids.filter((id) => id !== member.id))} />
                                        <MemberDot color={member.color} />{member.name}
                                    </label>)}
                                </div>
                            </fieldset>
                            <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{form.data.schedule === 'spread' ? 'Les échéances suivent chaque fréquence : une tâche hebdomadaire est à faire 7 jours après la date de départ. Une tâche ponctuelle garde la date choisie.' : 'Toutes les tâches seront à faire à la date choisie, puis suivront leur propre récurrence.'} Sans personne cochée, les tâches restent non attribuées.</p>
                        </div>
                    </section>

                    <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <aside className="min-w-0 lg:sticky lg:top-4">
                            <h2 className="mb-3 text-sm font-semibold">2. Explorer les modèles</h2>
                            <div aria-label="Types de pièces" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
                                {[{ key: 'all', name: 'Tous les modèles', icon: '🏠' }, ...categories].map((item) => <button type="button" key={item.key} onClick={() => { setCategory(item.key); setSelectedOnly(false); }} aria-pressed={!selectedOnly && category === item.key} className={cn('flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors', !selectedOnly && category === item.key ? 'bg-emerald-100 font-medium text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100' : 'hover:bg-muted text-muted-foreground')}>
                                    <span aria-hidden>{item.icon}</span>{item.name}
                                </button>)}
                            </div>
                            <p className="text-muted-foreground mt-3 hidden text-xs leading-relaxed lg:block">Les tâches communes sont aussi proposées dans chaque type de pièce. Les tâches déjà présentes sont repérées automatiquement.</p>
                        </aside>

                        <section className="min-w-0" aria-label="Modèles de tâches">
                            <div className="bg-card mb-4 grid gap-3 rounded-xl border p-3">
                                <div className="relative">
                                    <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-4" aria-hidden />
                                    <Input type="search" aria-label="Rechercher un modèle" placeholder="Rechercher une tâche…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button type="button" size="sm" variant={smallOnly ? 'secondary' : 'outline'} aria-pressed={smallOnly} onClick={() => setSmallOnly(!smallOnly)}><Sparkles /> Petits efforts (XS / S)</Button>
                                    <Button type="button" size="sm" variant={selectedOnly ? 'secondary' : 'outline'} aria-pressed={selectedOnly} onClick={() => setSelectedOnly(!selectedOnly)}><ListFilter /> Ma sélection ({form.data.items.length})</Button>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                                    <Button type="button" size="sm" variant="ghost" disabled={form.processing || !available.some((item) => item.essential && !chosen.has(item.key))} onClick={() => selectMany(available.filter((item) => item.essential))}><Sparkles /> Cocher les essentiels</Button>
                                    <Button type="button" size="sm" variant="ghost" disabled={form.processing || !available.some((item) => !chosen.has(item.key))} onClick={() => selectMany(available)}><CheckCheck /> Tout cocher ici</Button>
                                    <span className="text-muted-foreground text-xs">{visible.length} modèle(s) affiché(s)</span>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                {visible.map((template) => {
                                    const selection = chosen.get(template.key);
                                    const already = exists(template);
                                    const type = categories.find((item) => item.key === template.category);
                                    return <article key={template.key} className={cn('bg-card rounded-xl border p-4 transition-colors', selection && 'border-emerald-400 bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-950/20', already && 'bg-muted/40')}>
                                        <label className={cn('flex items-start gap-3', already ? 'cursor-default' : 'cursor-pointer')}>
                                            <input type="checkbox" className="mt-1 size-4 shrink-0 accent-emerald-600" checked={already || !!selection} disabled={already || form.processing} onChange={() => toggle(template)} />
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-medium break-words">{template.title}</span>
                                                <span className="text-muted-foreground mt-1 block text-xs">{type?.icon} {type?.name} · {recurrenceLabel(selection?.recurrence ?? template.recurrence, selection?.interval ?? template.interval)} · {selection?.effort_size ?? template.effort_size} · {effortPoints[selection?.effort_size ?? template.effort_size]} pts</span>
                                                {template.notes && <span className="text-muted-foreground mt-2 block text-xs leading-relaxed">{template.notes}</span>}
                                            </span>
                                        </label>
                                        <div className="mt-2 flex flex-wrap gap-2 pl-7">
                                            {already ? <Badge variant="secondary"><Check className="mr-1 size-3" />Déjà dans cette pièce</Badge> : template.essential && <Badge variant="outline" className="text-emerald-700 dark:text-emerald-300">Essentiel</Badge>}
                                        </div>
                                        {selection && !already && <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-3">
                                            <Field label="Récurrence"><NativeSelect value={selection.recurrence} onChange={(event) => update(template.key, { recurrence: event.target.value as Recurrence })} disabled={form.processing}>{recurrenceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect></Field>
                                            {selection.recurrence !== 'once' ? <Field label={`Intervalle (${recurrenceOptions.find((option) => option.value === selection.recurrence)?.unit})`}><Input type="number" min={1} max={365} required value={selection.interval} onChange={(event) => update(template.key, { interval: Number(event.target.value) })} disabled={form.processing} /></Field> : <p className="text-muted-foreground self-center text-xs">Une seule fois à la date de départ.</p>}
                                            <Field label="Effort"><NativeSelect value={selection.effort_size} onChange={(event) => update(template.key, { effort_size: event.target.value as EffortSize })} disabled={form.processing}>{Object.entries(effortPoints).map(([size, value]) => <option key={size} value={size}>{size} · {value} {value === 1 ? 'point' : 'points'}</option>)}</NativeSelect></Field>
                                        </div>}
                                    </article>;
                                })}
                                {!visible.length && <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">{selectedOnly && !form.data.items.length ? 'Aucune tâche sélectionnée. Explore les modèles pour commencer.' : 'Aucun modèle ne correspond aux filtres.'}</p>}
                            </div>
                        </section>
                    </div>

                    <div className={cn('bg-background/95 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 shadow-lg backdrop-blur sm:gap-3 sm:p-4', form.data.items.length ? 'sticky bottom-3' : 'relative')}>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold sm:text-sm" aria-live="polite"><span className="sm:hidden">{form.data.items.length} tâche(s) · {points} pts</span><span className="hidden sm:inline">{form.data.items.length} tâche(s) sélectionnée(s) · {points} points d’effort</span></p>
                            <p className="text-muted-foreground mt-1 hidden text-xs sm:block">Destination : {room?.icon} {room?.name}. Changer de pièce remet la sélection à zéro.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" variant="ghost" size="sm" aria-label="Vider la sélection" disabled={!form.data.items.length || form.processing} onClick={() => form.setData('items', [])}><X /><span className="hidden sm:inline">Vider</span></Button>
                            <Button type="submit" disabled={!form.data.items.length || !room || form.processing} className="bg-emerald-700 text-white hover:bg-emerald-800"><Plus />{form.processing ? 'Ajout…' : `Ajouter (${form.data.items.length})`}</Button>
                        </div>
                        {Object.entries(form.errors).length > 0 && <div role="alert" className="text-destructive w-full text-sm">{[...new Set(Object.values(form.errors))].map((error) => <p key={error}>{error}</p>)}</div>}
                    </div>
                </>}
            </form>
        </AppLayout>
    );
}
