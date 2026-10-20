import { NativeSelect } from '@/components/form-fields';
import { HouseBuddy } from '@/components/house-buddy';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type Member, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Check, Copy, KeyRound, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';

interface Account {
    id: number;
    name: string;
    email: string;
    member_id: number | null;
    is_parent: boolean;
}
interface Props {
    family: { id: number; name: string };
    canManage: boolean;
    invitationCode: string | null;
    accounts: Account[];
}

function LinkAccount({ account, members }: { account: Account; members: Member[] }) {
    const form = useForm({ member_id: account.member_id ? String(account.member_id) : '' });
    return (
        <form
            className="bg-card grid gap-3 rounded-2xl border-2 p-4"
            onSubmit={(event) => {
                event.preventDefault();
                form.transform((data) => ({ member_id: data.member_id ? Number(data.member_id) : null }));
                form.patch(route('goals.link-account', account.id), { preserveScroll: true });
            }}
        >
            <div>
                <p className="flex flex-wrap items-center gap-2 font-bold">
                    {account.name}
                    {account.is_parent && <span className="bg-secondary rounded-full px-2 py-1 text-xs">Parent</span>}
                    {!account.member_id && <span className="text-xs text-amber-700 dark:text-amber-300">À relier à un prénom</span>}
                </p>
                <p className="text-muted-foreground mt-1 text-xs break-all">{account.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <NativeSelect
                    className="min-w-0 flex-1"
                    aria-label={`Prénom pour ${account.name}`}
                    value={form.data.member_id}
                    onChange={(e) => form.setData('member_id', e.target.value)}
                >
                    <option value="">Aucun profil relié</option>
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

export default function Family({ family, canManage, invitationCode, accounts }: Props) {
    const { auth, members, flash } = usePage<SharedData>().props;
    const form = useForm({ name: family.name });
    const [copied, setCopied] = useState(false);
    const [copyError, setCopyError] = useState('');
    const [renewing, setRenewing] = useState(false);
    const [busy, setBusy] = useState(false);
    const own = members.find((member) => member.id === auth.user.member_id);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(invitationCode ?? '');
            setCopied(true);
            setCopyError('');
        } catch {
            setCopyError('Sélectionne le code ci-dessous pour le copier.');
        }
    };
    return (
        <AppLayout breadcrumbs={[{ title: 'Famille', href: '/family' }]}>
            <Head title="Notre famille" />
            <div className="mx-auto grid w-full max-w-5xl gap-6 p-4 pb-8 sm:p-6">
                <header className="family-card bg-primary/15 flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-cyan-500 p-6">
                    <div>
                        <p className="text-primary-foreground dark:text-foreground text-sm font-bold">Notre petit chez-nous</p>
                        <h1 className="mt-2 text-3xl font-extrabold">{family.name}</h1>
                        <p className="text-muted-foreground mt-2 text-sm">Vos missions, vos étoiles et vos envies, dans votre espace familial.</p>
                    </div>
                    <HouseBuddy className="w-28" />
                </header>
                {flash?.success && (
                    <p role="status" className="rounded-2xl bg-emerald-100 p-4 text-sm text-emerald-900">
                        {flash.success}
                    </p>
                )}
                {!canManage && !own && (
                    <section className="bg-secondary/40 rounded-2xl border-2 border-amber-300 p-5">
                        <h2 className="font-bold">Bienvenue dans la famille !</h2>
                        <p className="mt-2 text-sm">
                            Un parent doit maintenant relier ton compte à ton prénom pour retrouver tes points et tes récompenses.
                        </p>
                    </section>
                )}
                <section className="grid gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="flex items-center gap-2 text-xl font-extrabold">
                            <Users />
                            Les membres de la tribu
                        </h2>
                        {canManage && (
                            <Button asChild variant="outline">
                                <Link href={route('members.index')}>Gérer les profils</Link>
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {members.map((member) => (
                            <span key={member.id} className="bg-card flex items-center gap-3 rounded-2xl border-2 p-3 pr-5">
                                <span
                                    className="flex size-10 items-center justify-center rounded-full font-bold text-white"
                                    style={{ backgroundColor: member.color }}
                                >
                                    {member.name.charAt(0)}
                                </span>
                                <span className="font-semibold">{member.name}</span>
                            </span>
                        ))}
                    </div>
                    {own && <p className="text-muted-foreground text-sm">Ton compte est relié au profil de {own.name}.</p>}
                </section>
                {canManage && (
                    <>
                        <section className="family-card bg-secondary/35 grid gap-4 rounded-3xl border-2 border-amber-400 p-5 sm:p-6">
                            <h2 className="flex items-center gap-2 text-xl font-extrabold">
                                <KeyRound />
                                Inviter dans la famille
                            </h2>
                            <p className="text-sm">
                                Partage ce code avec un proche. Sur la page d’inscription, il choisit « Rejoindre » et crée son propre compte.
                            </p>
                            <label className="grid gap-2 text-sm font-bold" htmlFor="family-invitation-code">
                                Votre code famille
                                <Input
                                    id="family-invitation-code"
                                    readOnly
                                    value={invitationCode ?? ''}
                                    className="bg-card h-14 text-center font-mono text-base tracking-wider sm:text-xl md:text-2xl"
                                    onFocus={(e) => e.target.select()}
                                />
                            </label>
                            <div className="flex flex-wrap gap-3">
                                <Button onClick={() => void copy()}>
                                    {copied ? <Check /> : <Copy />}
                                    {copied ? 'Code copié' : 'Copier le code'}
                                </Button>
                                <Button variant="outline" onClick={() => setRenewing(true)}>
                                    <RefreshCw />
                                    Renouveler
                                </Button>
                            </div>
                            {copyError && (
                                <p role="status" className="text-sm">
                                    {copyError}
                                </p>
                            )}
                            <p className="text-muted-foreground text-xs">
                                Une invitation ne donne pas le rôle parent. Tu relies ensuite le compte au bon profil ci-dessous et peux gérer les
                                accès parents dans Récompenses.
                            </p>
                        </section>
                        <section className="grid gap-4">
                            <h2 className="flex items-center gap-2 text-xl font-extrabold">
                                <ShieldCheck />
                                Les comptes de la famille
                            </h2>
                            <div className="grid gap-3 md:grid-cols-2">
                                {accounts.map((account) => (
                                    <LinkAccount key={`${account.id}-${account.member_id}`} account={account} members={members} />
                                ))}
                            </div>
                            <Button variant="outline" className="justify-self-start" asChild>
                                <Link href={route('rewards.index')}>Gérer les accès parents</Link>
                            </Button>
                        </section>
                        <details className="bg-card rounded-2xl border-2 p-5">
                            <summary className="cursor-pointer font-bold">Modifier le nom de notre famille</summary>
                            <form
                                className="mt-4 grid gap-3"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    form.patch(route('family.update'), { preserveScroll: true });
                                }}
                            >
                                <Input
                                    aria-label="Nom de la famille"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    required
                                    maxLength={120}
                                />
                                {form.errors.name && (
                                    <p role="alert" className="text-destructive text-sm">
                                        {form.errors.name}
                                    </p>
                                )}
                                <Button className="justify-self-start" disabled={form.processing}>
                                    Enregistrer
                                </Button>
                            </form>
                        </details>
                    </>
                )}
            </div>
            <Dialog open={renewing} onOpenChange={setRenewing}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Créer un nouveau code famille ?</DialogTitle>
                        <DialogDescription>
                            L’ancien code cessera de fonctionner. Les comptes qui ont déjà rejoint votre famille conserveront leur accès.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-wrap justify-end gap-3">
                        <Button variant="outline" onClick={() => setRenewing(false)}>
                            Annuler
                        </Button>
                        <Button
                            disabled={busy}
                            onClick={() => {
                                setBusy(true);
                                router.post(
                                    route('family.renew-code'),
                                    {},
                                    {
                                        preserveScroll: true,
                                        onSuccess: () => {
                                            setRenewing(false);
                                            setCopied(false);
                                        },
                                        onFinish: () => setBusy(false),
                                    },
                                );
                            }}
                        >
                            Créer le nouveau code
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
