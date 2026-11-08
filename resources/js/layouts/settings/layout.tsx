import { Button } from '@/components/bootstrap/button';
import { Separator } from '@/components/bootstrap/separator';
import Heading from '@/components/heading';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profil',
        url: '/settings/profile',
        icon: null,
    },
    {
        title: 'Mot de passe',
        url: '/settings/password',
        icon: null,
    },
    {
        title: 'Apparence',
        url: '/settings/appearance',
        icon: null,
    },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const currentPath = window.location.pathname;

    return (
        <div className="px-3 py-4">
            <Heading title="Réglages" description="Ton profil, ton mot de passe et ton affichage." />

            <div className="d-flex flex-column mn-stack-8 flex-lg-row mn-lg-stack-0 mn-lg-inline-space-12">
                <aside className="w-100 mn-content-xl mn-lg-w-48">
                    <nav className="d-flex flex-column mn-stack-1 mn-inline-space-0">
                        {sidebarNavItems.map((item) => (
                            <Button
                                key={item.url}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-100 justify-content-start', {
                                    'bg-body-tertiary': currentPath === item.url,
                                })}
                            >
                                <Link href={item.url} prefetch>
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-4 d-md-none" />

                <div className="flex-fill mn-md-content-2xl">
                    <section className="mn-content-xl mn-stack-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
