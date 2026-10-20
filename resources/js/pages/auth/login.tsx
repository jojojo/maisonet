import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, CalendarDays, Check, Heart, Home, LoaderCircle, Sparkles, Users } from 'lucide-react';
import { type FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginForm {
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

const features = [
    { icon: Home, title: 'Chaque pièce a ses missions', text: 'Cuisine, chambres, salon… Tout est organisé, rien ne se perd.' },
    { icon: Users, title: 'Tout le monde fait sa part', text: 'Des tâches partagées et des tailles d’effort pour trouver sa mission.' },
    { icon: CalendarDays, title: 'Le bon geste, au bon moment', text: 'Les récurrences et le planning font le suivi pour vous.' },
];

function MissionPreview() {
    return (
        <div aria-label="Exemple de tableau de bord" className="mt-8 rounded-2xl border border-white bg-white/85 p-4 shadow-[0_12px_50px_-24px_rgba(6,78,59,0.25)] sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Sparkles className="size-4 text-emerald-600" aria-hidden /> Les petites missions font les grandes équipes</p>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">APERÇU</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-orange-100 bg-orange-50/70 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500">🛋️ Salon</span>
                        <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-violet-700">M · 3 pts</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold">Passer l’aspirateur</p>
                    <div className="mt-3 flex justify-between text-xs text-orange-800"><span>Un coup de main ?</span><span>80 %</span></div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-orange-100"><div className="h-full w-4/5 rounded-full bg-orange-400" /></div>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500">🍳 Cuisine</span>
                        <span className="flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-emerald-700"><Check className="size-3" aria-hidden /> Bien joué !</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold">Nettoyer la table</p>
                    <div className="mt-3 flex justify-between text-xs text-emerald-800"><span>Tout propre ✨</span><span>0 %</span></div>
                    <div className="mt-1.5 h-2 rounded-full bg-emerald-100" />
                </div>
            </div>
        </div>
    );
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({ email: '', password: '', remember: false });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <div className="relative isolate min-h-svh overflow-hidden bg-[#f6f8f3] text-slate-900 selection:bg-emerald-200">
            <Head title="Connexion">
                <meta name="description" content="Avec Maiso’net, organisez le ménage en famille : tâches par pièce, planning partagé, jauges de saleté et points d’effort. Chacun trouve sa mission !" />
            </Head>
            <div aria-hidden className="pointer-events-none absolute -top-40 -left-48 -z-10 size-[650px] rounded-full bg-emerald-100/65 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute top-48 -right-48 -z-10 size-[600px] rounded-full bg-yellow-100/45 blur-3xl" />

            <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
                <Link href={route('home')} aria-label="Maiso’net, accueil" className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600">
                    <img src="/logo.png" alt="Maiso’net" width={2172} height={724} className="h-auto w-32 sm:w-52" />
                </Link>
                <nav aria-label="Navigation principale" className="flex items-center gap-6 text-sm font-medium">
                    <a href="#fonctionnement" className="hidden text-slate-600 hover:text-emerald-800 sm:inline">Comment ça marche</a>
                    <a href="#connexion" className="rounded-full border border-emerald-800/15 bg-white/70 px-3 py-2 text-xs text-emerald-800 transition-colors hover:bg-white sm:px-4 sm:text-sm">Se connecter</a>
                </nav>
            </header>

            <main className="mx-auto max-w-7xl px-5 pb-12 sm:px-8 lg:px-12">
                <div className="grid items-center gap-10 pt-7 pb-12 sm:pt-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.85fr)] lg:gap-16 lg:pt-14 lg:pb-16">
                    <section aria-labelledby="landing-title">
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"><span className="size-2 rounded-full bg-emerald-500" aria-hidden /> Le ménage passe en mode équipe</span>
                        <h1 id="landing-title" className="mt-5 text-4xl leading-[1.12] font-semibold tracking-tight sm:text-5xl lg:text-[3.35rem]">Une maison au propre.<br /><span className="text-emerald-700">Une famille qui fait équipe.</span></h1>
                        <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">Qui fait quoi, où et quand ? Maiso’net rassemble les tâches de la maison dans un tableau de bord simple et ludique. Chacun trouve sa mission, et toute la famille avance ensemble.</p>
                        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-600">
                            <span className="flex items-center gap-1.5"><Check className="size-4 text-emerald-600" aria-hidden /> Des jauges du rouge au vert</span>
                            <span className="flex items-center gap-1.5"><Check className="size-4 text-emerald-600" aria-hidden /> Des efforts valorisés</span>
                        </div>
                        <MissionPreview />
                    </section>

                    <section id="connexion" aria-labelledby="login-title" className="scroll-mt-6 rounded-3xl border border-white bg-white p-6 shadow-[0_20px_80px_-30px_rgba(15,60,45,0.2)] sm:p-8 lg:p-9">
                        <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Home className="size-6" aria-hidden /></span>
                        <h2 id="login-title" className="text-2xl font-semibold tracking-tight">Bienvenue à la maison</h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">Connecte-toi pour retrouver les missions de ta famille.</p>
                        {status && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{status}</p>}

                        <form className="mt-7 grid gap-5" onSubmit={submit} aria-busy={processing}>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Adresse e-mail</Label>
                                <Input id="email" name="email" type="email" required autoComplete="email" inputMode="email" value={data.email} onChange={(event) => setData('email', event.target.value)} placeholder="toi@exemple.fr" disabled={processing} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} className="h-12 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400" />
                                <InputError id="email-error" message={errors.email} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">Mot de passe</Label>
                                <Input id="password" name="password" type="password" required autoComplete="current-password" value={data.password} onChange={(event) => setData('password', event.target.value)} placeholder="Ton mot de passe" disabled={processing} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} className="h-12 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400" />
                                <InputError id="password-error" message={errors.password} />
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                                <div className="flex items-center gap-2">
                                    <Checkbox id="remember" name="remember" checked={data.remember} onCheckedChange={(checked) => setData('remember', checked === true)} disabled={processing} className="border-slate-300 data-[state=checked]:border-emerald-700 data-[state=checked]:bg-emerald-700 data-[state=checked]:text-white" />
                                    <Label htmlFor="remember" className="text-xs font-normal text-slate-600 sm:text-sm">Rester connecté</Label>
                                </div>
                                {canResetPassword && <Link href={route('password.request')} className="font-medium text-emerald-700 underline-offset-4 hover:underline">Mot de passe oublié ?</Link>}
                            </div>
                            <Button type="submit" disabled={processing} className="mt-1 h-12 w-full rounded-xl bg-emerald-700 text-base text-white hover:bg-emerald-800">
                                {processing ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}
                                {processing ? 'Connexion en cours…' : 'Retrouver mes missions'}
                            </Button>
                        </form>
                        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm">
                            <p className="text-slate-500">Première visite ? <Link href={route('register')} className="font-semibold text-emerald-700 underline-offset-4 hover:underline">Créer mon compte</Link></p>
                            <p className="mt-2 text-xs leading-relaxed text-slate-400">Crée ton espace ou rejoins ta famille avec son code.</p>
                        </div>
                    </section>
                </div>

                <section id="fonctionnement" aria-labelledby="features-title" className="scroll-mt-8 border-t border-emerald-900/10 pt-9">
                    <h2 id="features-title" className="mb-7 text-center text-sm font-semibold tracking-wide text-slate-500">Un peu d’organisation, beaucoup d’esprit d’équipe.</h2>
                    <div className="grid gap-7 md:grid-cols-3 md:gap-8">
                        {features.map(({ icon: Icon, title, text }) => (
                            <div key={title} className="flex items-start gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700"><Icon className="size-5" aria-hidden /></span>
                                <div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-500">{text}</p></div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 pt-2 pb-7 text-xs text-slate-400 sm:px-8 lg:px-12">
                <p>Maiso’net · À chaque petite mission, une maison plus agréable.</p>
                <p className="flex items-center gap-1.5">Pensé pour toute la famille <Heart className="size-3 text-emerald-600" aria-hidden /></p>
            </footer>
        </div>
    );
}
