import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, CalendarDays, Check, Heart, Home, LoaderCircle, Sparkles, Users } from 'lucide-react';
import { type FormEventHandler } from 'react';

import { Button } from '@/components/bootstrap/button';
import { Checkbox } from '@/components/bootstrap/checkbox';
import { Input } from '@/components/bootstrap/input';
import { Label } from '@/components/bootstrap/label';
import InputError from '@/components/input-error';

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
        <div aria-label="Exemple de tableau de bord" className="mt-5 rounded-4 border border-white bg-body bg-opacity-75 p-3 shadow-sm p-sm-4">
            <div className="mb-3 d-flex align-items-center justify-content-between gap-3">
                <p className="d-flex align-items-center gap-2 small fw-semibold text-secondary-emphasis">
                    <Sparkles className="mn-icon-4 text-success" aria-hidden /> Les petites missions font les grandes équipes
                </p>
                <span className="flex-shrink-0 rounded-pill bg-secondary-subtle px-2 py-1 mn-type-10px fw-medium text-secondary">APERÇU</span>
            </div>
            <div className="d-grid gap-3 mn-sm-columns-2">
                <div className="rounded-3 border border-warning-subtle bg-warning-subtle p-3">
                    <div className="d-flex align-items-center justify-content-between gap-2">
                        <span className="small text-secondary">🛋️ Salon</span>
                        <span className="rounded-2 bg-white px-2 py-1 small fw-semibold text-primary-emphasis">M · 3 pts</span>
                    </div>
                    <p className="mt-2 small fw-semibold">Passer l’aspirateur</p>
                    <div className="mt-3 d-flex justify-content-between small text-warning-emphasis">
                        <span>Un coup de main ?</span>
                        <span>80 %</span>
                    </div>
                    <div className="mt-2 mn-h-2 overflow-hidden rounded-pill bg-warning-subtle">
                        <div className="h-100 mn-w-4-5 rounded-pill bg-warning" />
                    </div>
                </div>
                <div className="rounded-3 border border-success-subtle bg-success-subtle p-3">
                    <div className="d-flex align-items-center justify-content-between gap-2">
                        <span className="small text-secondary">🍳 Cuisine</span>
                        <span className="d-flex align-items-center gap-1 rounded-2 bg-white px-2 py-1 small fw-semibold text-success-emphasis">
                            <Check className="mn-icon-3" aria-hidden /> Bien joué !
                        </span>
                    </div>
                    <p className="mt-2 small fw-semibold">Nettoyer la table</p>
                    <div className="mt-3 d-flex justify-content-between small text-success-emphasis">
                        <span>Tout propre ✨</span>
                        <span>0 %</span>
                    </div>
                    <div className="mt-2 mn-h-2 rounded-pill bg-success-subtle" />
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
        <div className="position-relative min-vh-100 overflow-hidden bg-info-subtle text-secondary-emphasis">
            <Head title="Connexion">
                <meta
                    name="description"
                    content="Avec Maiso’net, organisez le ménage en famille : tâches par pièce, planning partagé, jauges de saleté et points d’effort. Chacun trouve sa mission !"
                />
            </Head>
            <div
                aria-hidden
                className="pe-none position-absolute mn-top-40 mn-left-48 z-n1 mn-icon-650px rounded-pill bg-success-subtle ambient-glow"
            />
            <div
                aria-hidden
                className="pe-none position-absolute mn-top-48 mn-right-48 z-n1 mn-icon-600px rounded-pill bg-warning-subtle ambient-glow"
            />

            <header className="mx-auto d-flex mn-content-7xl align-items-center justify-content-between gap-3 px-4 py-4 px-sm-5 px-lg-5">
                <Link href={route('home')} aria-label="Maiso’net, accueil" className="flex-shrink-0 rounded-3">
                    <img src="/logo.png" alt="Maiso’net" width={2172} height={724} className="h-auto mn-w-32 mn-sm-w-52" />
                </Link>
                <nav aria-label="Navigation principale" className="d-flex align-items-center gap-4 small fw-medium">
                    <a href="#fonctionnement" className="d-none text-secondary d-sm-inline">
                        Comment ça marche
                    </a>
                    <a
                        href="#connexion"
                        className="rounded-pill border border-success bg-body bg-opacity-75 px-3 py-2 small text-success-emphasis px-sm-3"
                    >
                        Se connecter
                    </a>
                </nav>
            </header>

            <main className="mx-auto mn-content-7xl px-4 pb-5 px-sm-5 px-lg-5">
                <div className="d-grid align-items-center gap-5 pt-4 pb-5 pt-sm-5 mn-lg-columns-minmax-0-1-25fr-minmax-340px-0-85fr gap-lg-5 pt-lg-5 pb-lg-5">
                    <section aria-labelledby="landing-title">
                        <span className="d-inline-flex align-items-center gap-2 rounded-pill border border-success-subtle bg-success-subtle px-3 py-2 small fw-semibold text-success-emphasis">
                            <span className="mn-icon-2 rounded-pill bg-success" aria-hidden /> Le ménage passe en mode équipe
                        </span>
                        <h1 id="landing-title" className="mt-4 fs-1 leading-[1.12] fw-semibold mn-sm-heading-5xl mn-lg-type-3-35rem">
                            Une maison au propre.
                            <br />
                            <span className="text-success-emphasis">Une famille qui fait équipe.</span>
                        </h1>
                        <p className="mt-4 mn-content-lg fs-6 lh-lg text-secondary mn-sm-heading-lg">
                            Qui fait quoi, où et quand ? Maiso’net rassemble les tâches de la maison dans un tableau de bord simple et ludique. Chacun
                            trouve sa mission, et toute la famille avance ensemble.
                        </p>
                        <div className="mt-4 d-flex flex-wrap column-gap-4 row-gap-2 small fw-medium text-secondary">
                            <span className="d-flex align-items-center gap-2">
                                <Check className="mn-icon-4 text-success" aria-hidden /> Des jauges du rouge au vert
                            </span>
                            <span className="d-flex align-items-center gap-2">
                                <Check className="mn-icon-4 text-success" aria-hidden /> Des efforts valorisés
                            </span>
                        </div>
                        <MissionPreview />
                    </section>

                    <section
                        id="connexion"
                        aria-labelledby="login-title"
                        className="rounded-5 border border-white bg-white p-4 shadow-sm p-sm-5 p-lg-5"
                    >
                        <span className="mb-4 d-flex mn-icon-12 align-items-center justify-content-center rounded-4 bg-success-subtle text-success-emphasis">
                            <Home className="mn-icon-6" aria-hidden />
                        </span>
                        <h2 id="login-title" className="fs-3 fw-semibold">
                            Bienvenue à la maison
                        </h2>
                        <p className="mt-2 small lh-lg text-secondary">Connecte-toi pour retrouver les missions de ta famille.</p>
                        {status && (
                            <p role="status" className="mt-4 rounded-3 bg-success-subtle p-3 small text-success-emphasis">
                                {status}
                            </p>
                        )}

                        <form className="mt-4 d-grid gap-4" onSubmit={submit} aria-busy={processing}>
                            <div className="d-grid gap-2">
                                <Label htmlFor="email">Adresse e-mail</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    inputMode="email"
                                    value={data.email}
                                    onChange={(event) => setData('email', event.target.value)}
                                    placeholder="toi@exemple.fr"
                                    disabled={processing}
                                    aria-invalid={!!errors.email}
                                    aria-describedby={errors.email ? 'email-error' : undefined}
                                    className="mn-h-12 rounded-3 border-secondary-subtle bg-white text-secondary-emphasis"
                                />
                                <InputError id="email-error" message={errors.email} />
                            </div>
                            <div className="d-grid gap-2">
                                <Label htmlFor="password">Mot de passe</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    value={data.password}
                                    onChange={(event) => setData('password', event.target.value)}
                                    placeholder="Ton mot de passe"
                                    disabled={processing}
                                    aria-invalid={!!errors.password}
                                    aria-describedby={errors.password ? 'password-error' : undefined}
                                    className="mn-h-12 rounded-3 border-secondary-subtle bg-white text-secondary-emphasis"
                                />
                                <InputError id="password-error" message={errors.password} />
                            </div>
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 small">
                                <div className="d-flex align-items-center gap-2">
                                    <Checkbox
                                        id="remember"
                                        name="remember"
                                        checked={data.remember}
                                        onCheckedChange={(checked) => setData('remember', checked === true)}
                                        disabled={processing}
                                        className="border-secondary-subtle"
                                    />
                                    <Label htmlFor="remember" className="small fw-normal text-secondary">
                                        Rester connecté
                                    </Label>
                                </div>
                                {canResetPassword && (
                                    <Link href={route('password.request')} className="fw-medium text-success-emphasis link-underline">
                                        Mot de passe oublié ?
                                    </Link>
                                )}
                            </div>
                            <Button type="submit" disabled={processing} className="mt-1 mn-h-12 w-100 rounded-3 bg-success fs-6 text-white">
                                {processing ? (
                                    <LoaderCircle className="mn-icon-4 spin" aria-hidden />
                                ) : (
                                    <ArrowRight className="mn-icon-4" aria-hidden />
                                )}
                                {processing ? 'Connexion en cours…' : 'Retrouver mes missions'}
                            </Button>
                        </form>
                        <div className="mt-4 border-top border-secondary-subtle pt-4 text-center small">
                            <p className="text-secondary">
                                Première visite ?{' '}
                                <Link href={route('register')} className="fw-semibold text-success-emphasis link-underline">
                                    Créer mon compte
                                </Link>
                            </p>
                            <p className="mt-2 small lh-lg text-secondary">Crée ton espace ou rejoins ta famille avec son code.</p>
                        </div>
                    </section>
                </div>

                <section id="fonctionnement" aria-labelledby="features-title" className="border-top border-success pt-5">
                    <h2 id="features-title" className="mb-4 text-center small fw-semibold eyebrow-spacing text-secondary">
                        Un peu d’organisation, beaucoup d’esprit d’équipe.
                    </h2>
                    <div className="d-grid gap-4 mn-md-columns-3 gap-md-5">
                        {features.map(({ icon: Icon, title, text }) => (
                            <div key={title} className="d-flex align-items-start gap-3">
                                <span className="d-flex mn-icon-10 flex-shrink-0 align-items-center justify-content-center rounded-3 bg-white text-success-emphasis">
                                    <Icon className="mn-icon-5" aria-hidden />
                                </span>
                                <div>
                                    <h3 className="small fw-semibold">{title}</h3>
                                    <p className="mt-1 small lh-lg text-secondary">{text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            <footer className="mx-auto d-flex mn-content-7xl flex-wrap align-items-center justify-content-between gap-3 px-4 pt-2 pb-4 small text-secondary px-sm-5 px-lg-5">
                <p>Maiso’net · À chaque petite mission, une maison plus agréable.</p>
                <p className="d-flex align-items-center gap-2">
                    Pensé pour toute la famille <Heart className="mn-icon-3 text-success" aria-hidden />
                </p>
            </footer>
        </div>
    );
}
