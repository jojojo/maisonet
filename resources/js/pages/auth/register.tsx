import { Button } from '@/components/bootstrap/button';
import { Input } from '@/components/bootstrap/input';
import { Label } from '@/components/bootstrap/label';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import AuthLayout from '@/layouts/auth-layout';
import { Head, useForm } from '@inertiajs/react';
import { Home, LoaderCircle, Users } from 'lucide-react';
import { type FormEventHandler } from 'react';

export default function Register() {
    const form = useForm({
        family_action: 'create' as 'create' | 'join',
        family_name: '',
        family_code: '',
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });
    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        form.post(route('register'), { onFinish: () => form.reset('password', 'password_confirmation') });
    };
    return (
        <AuthLayout title="Une maison, une équipe" description="Crée ton espace familial ou rejoins ta tribu avec son code.">
            <Head title="Inscription" />
            <form onSubmit={submit} className="d-grid gap-4">
                <div className="d-grid mn-columns-2 gap-3" aria-label="Créer ou rejoindre une famille">
                    <Button
                        type="button"
                        className="h-auto mn-min-h-14 text-wrap"
                        variant={form.data.family_action === 'create' ? 'default' : 'outline'}
                        aria-pressed={form.data.family_action === 'create'}
                        onClick={() => form.setData('family_action', 'create')}
                    >
                        <Home />
                        Créer ma famille
                    </Button>
                    <Button
                        type="button"
                        className="h-auto mn-min-h-14 text-wrap"
                        variant={form.data.family_action === 'join' ? 'default' : 'outline'}
                        aria-pressed={form.data.family_action === 'join'}
                        onClick={() => form.setData('family_action', 'join')}
                    >
                        <Users />
                        Rejoindre
                    </Button>
                </div>
                {form.data.family_action === 'create' ? (
                    <div className="d-grid gap-2">
                        <Label htmlFor="family_name">Nom de votre famille</Label>
                        <Input
                            id="family_name"
                            value={form.data.family_name}
                            onChange={(e) => form.setData('family_name', e.target.value)}
                            required
                            maxLength={120}
                            placeholder="La tribu Martin"
                        />
                        <InputError message={form.errors.family_name} />
                        <p className="text-body-secondary small">
                            Tu seras le premier parent de cet espace privé. Tu pourras inviter les autres ensuite.
                        </p>
                    </div>
                ) : (
                    <div className="d-grid gap-2">
                        <Label htmlFor="family_code">Code famille</Label>
                        <Input
                            id="family_code"
                            value={form.data.family_code}
                            onChange={(e) => form.setData('family_code', e.target.value.toUpperCase())}
                            required
                            maxLength={100}
                            autoCapitalize="characters"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder="XXXX-XXXX-XXXX-XXXX"
                            className="font-monospace eyebrow-spacing"
                        />
                        <InputError message={form.errors.family_code} />
                        <p className="text-body-secondary small">Demande ce code à un parent. Il te reliera ensuite à ton prénom dans la famille.</p>
                    </div>
                )}
                <div className="d-grid gap-2">
                    <Label htmlFor="name">Ton prénom</Label>
                    <Input
                        id="name"
                        name="name"
                        autoComplete="name"
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        required
                        maxLength={255}
                    />
                    <InputError message={form.errors.name} />
                </div>
                <div className="d-grid gap-2">
                    <Label htmlFor="email">Adresse e-mail</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={form.data.email}
                        onChange={(e) => form.setData('email', e.target.value)}
                        required
                    />
                    <InputError message={form.errors.email} />
                </div>
                <div className="d-grid gap-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        value={form.data.password}
                        onChange={(e) => form.setData('password', e.target.value)}
                        required
                    />
                    <InputError message={form.errors.password} />
                </div>
                <div className="d-grid gap-2">
                    <Label htmlFor="password_confirmation">Confirmer le mot de passe</Label>
                    <Input
                        id="password_confirmation"
                        type="password"
                        autoComplete="new-password"
                        value={form.data.password_confirmation}
                        onChange={(e) => form.setData('password_confirmation', e.target.value)}
                        required
                    />
                    <InputError message={form.errors.password_confirmation} />
                </div>
                <InputError message={form.errors.family_action} />
                <Button disabled={form.processing} className="mn-h-12">
                    {form.processing && <LoaderCircle className="spin" />}
                    {form.data.family_action === 'create' ? 'Créer notre espace' : 'Rejoindre ma famille'}
                </Button>
                <p className="text-body-secondary text-center small">
                    Déjà un compte ? <TextLink href={route('login')}>Se connecter</TextLink>
                </p>
            </form>
        </AuthLayout>
    );
}
