// Components
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import { Button } from '@/components/bootstrap/button';
import { Input } from '@/components/bootstrap/input';
import { Label } from '@/components/bootstrap/label';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import AuthLayout from '@/layouts/auth-layout';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <AuthLayout title="Forgot password" description="Enter your email to receive a password reset link">
            <Head title="Forgot password" />

            {status && <div className="mb-3 text-center small fw-medium text-success">{status}</div>}

            <div className="mn-stack-6">
                <form onSubmit={submit}>
                    <div className="d-grid gap-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            autoComplete="off"
                            value={data.email}
                            autoFocus
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="email@example.com"
                        />

                        <InputError message={errors.email} />
                    </div>

                    <div className="my-4 d-flex align-items-center justify-content-start">
                        <Button className="w-100" disabled={processing}>
                            {processing && <LoaderCircle className="mn-h-4 mn-w-4 spin" />}
                            Email password reset link
                        </Button>
                    </div>
                </form>

                <div className="text-body-secondary mn-inline-space-1 text-center small">
                    <span>Or, return to</span>
                    <TextLink href={route('login')}>log in</TextLink>
                </div>
            </div>
        </AuthLayout>
    );
}
