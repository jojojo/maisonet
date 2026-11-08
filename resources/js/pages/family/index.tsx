import { Button } from '@/components/bootstrap/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/bootstrap/dialog';
import { Input } from '@/components/bootstrap/input';
import { NativeSelect } from '@/components/form-fields';
import { HouseBuddy } from '@/components/house-buddy';
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
            className="bg-body d-grid gap-3 rounded-4 border-2 p-3"
            onSubmit={(event) => {
                event.preventDefault();
                form.transform((data) => ({ member_id: data.member_id ? Number(data.member_id) : null }));
                form.patch(route('goals.link-account', account.id), { preserveScroll: true });
            }}
        >
            <div>
                <p className="d-flex flex-wrap align-items-center gap-2 fw-bold">
                    {account.name}
                    {account.is_parent && <span className="bg-warning-subtle rounded-pill px-2 py-1 small">Parent</span>}
                    {!account.member_id && <span className="small text-warning-emphasis">À relier à un prénom</span>}
                </p>
                <p className="text-body-secondary mt-1 small text-break">{account.email}</p>
            </div>
            <div className="d-flex flex-wrap gap-2">
                <NativeSelect
                    className="mn-min-w-0 flex-fill"
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
                <p role="alert" className="text-danger small">
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
            <div className="mx-auto d-grid w-100 mn-content-5xl gap-4 p-3 pb-5 p-sm-4">
                <header className="family-card bg-primary d-flex flex-wrap align-items-center justify-content-between gap-3 rounded-5 border-2 border-info p-4">
                    <div>
                        <p className="text-dark small fw-bold">Notre petit chez-nous</p>
                        <h1 className="mt-2 fs-2 fw-bold">{family.name}</h1>
                        <p className="text-body-secondary mt-2 small">Vos missions, vos étoiles et vos envies, dans votre espace familial.</p>
                    </div>
                    <HouseBuddy className="mn-w-28" />
                </header>
                {flash?.success && (
                    <p role="status" className="rounded-4 bg-success-subtle p-3 small text-success-emphasis">
                        {flash.success}
                    </p>
                )}
                {!canManage && !own && (
                    <section className="bg-warning-subtle rounded-4 border-2 border-warning-subtle p-4">
                        <h2 className="fw-bold">Bienvenue dans la famille !</h2>
                        <p className="mt-2 small">
                            Un parent doit maintenant relier ton compte à ton prénom pour retrouver tes points et tes récompenses.
                        </p>
                    </section>
                )}
                <section className="d-grid gap-3">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <h2 className="d-flex align-items-center gap-2 fs-4 fw-bold">
                            <Users />
                            Les membres de la tribu
                        </h2>
                        {canManage && (
                            <Button asChild variant="outline">
                                <Link href={route('members.index')}>Gérer les profils</Link>
                            </Button>
                        )}
                    </div>
                    <div className="d-flex flex-wrap gap-3">
                        {members.map((member) => (
                            <span key={member.id} className="bg-body d-flex align-items-center gap-3 rounded-4 border-2 p-3 pe-4">
                                <span
                                    className="d-flex mn-icon-10 align-items-center justify-content-center rounded-pill fw-bold text-white"
                                    style={{ backgroundColor: member.color }}
                                >
                                    {member.name.charAt(0)}
                                </span>
                                <span className="fw-semibold">{member.name}</span>
                            </span>
                        ))}
                    </div>
                    {own && <p className="text-body-secondary small">Ton compte est relié au profil de {own.name}.</p>}
                </section>
                {canManage && (
                    <>
                        <section className="family-card bg-warning-subtle d-grid gap-3 rounded-5 border-2 border-warning p-4 p-sm-4">
                            <h2 className="d-flex align-items-center gap-2 fs-4 fw-bold">
                                <KeyRound />
                                Inviter dans la famille
                            </h2>
                            <p className="small">
                                Partage ce code avec un proche. Sur la page d’inscription, il choisit « Rejoindre » et crée son propre compte.
                            </p>
                            <label className="d-grid gap-2 small fw-bold" htmlFor="family-invitation-code">
                                Votre code famille
                                <Input
                                    id="family-invitation-code"
                                    readOnly
                                    value={invitationCode ?? ''}
                                    className="bg-body mn-h-14 text-center font-monospace fs-6 eyebrow-spacing mn-sm-heading-xl mn-md-heading-2xl"
                                    onFocus={(e) => e.target.select()}
                                />
                            </label>
                            <div className="d-flex flex-wrap gap-3">
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
                                <p role="status" className="small">
                                    {copyError}
                                </p>
                            )}
                            <p className="text-body-secondary small">
                                Une invitation ne donne pas le rôle parent. Tu relies ensuite le compte au bon profil ci-dessous et peux gérer les
                                accès parents dans Récompenses.
                            </p>
                        </section>
                        <section className="d-grid gap-3">
                            <h2 className="d-flex align-items-center gap-2 fs-4 fw-bold">
                                <ShieldCheck />
                                Les comptes de la famille
                            </h2>
                            <div className="d-grid gap-3 mn-md-columns-2">
                                {accounts.map((account) => (
                                    <LinkAccount key={`${account.id}-${account.member_id}`} account={account} members={members} />
                                ))}
                            </div>
                            <Button variant="outline" className="justify-self-start" asChild>
                                <Link href={route('rewards.index')}>Gérer les accès parents</Link>
                            </Button>
                        </section>
                        <details className="bg-body rounded-4 border-2 p-4">
                            <summary className="cursor-pointer fw-bold">Modifier le nom de notre famille</summary>
                            <form
                                className="mt-3 d-grid gap-3"
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
                                    <p role="alert" className="text-danger small">
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
                    <div className="d-flex flex-wrap justify-content-end gap-3">
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
