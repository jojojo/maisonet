import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
export default function AuthLayout({ children, title, description }: { children: ReactNode; title: string; description: string }) {
    return (
        <main className="container py-5">
            <section className="card auth-card mx-auto shadow-sm">
                <div className="card-body p-4 p-sm-5">
                    <Link href={route('home')}>
                        <img src="/logo.png" className="d-block w-75 mx-auto mb-4" alt="Maiso’net" />
                    </Link>
                    <h1 className="h4 text-center">{title}</h1>
                    <p className="text-body-secondary text-center mb-4">{description}</p>
                    {children}
                </div>
            </section>
        </main>
    );
}
