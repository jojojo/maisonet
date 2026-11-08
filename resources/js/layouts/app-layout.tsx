import { type BreadcrumbItem, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { BookOpen, CalendarDays, Gamepad2, Gift, Home, LayoutGrid, ListChecks, Menu, Settings, Tablet, Target, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import Offcanvas from 'react-bootstrap/Offcanvas';
const navigation = [
    { title: 'Tableau de bord', url: '/dashboard', icon: LayoutGrid },
    { title: 'Planning', url: '/planning', icon: CalendarDays },
    { title: 'Pièces', url: '/rooms', icon: Home },
    { title: 'Tâches', url: '/tasks', icon: ListChecks },
    { title: 'Catalogue', url: '/task-templates', icon: BookOpen },
    { title: 'Famille', url: '/family', icon: Users },
    { title: 'Récompenses', url: '/rewards', icon: Gift },
    { title: 'Objectifs', url: '/goals', icon: Target },
];
export default function AppLayout({ children, breadcrumbs = [] }: { children: ReactNode; breadcrumbs?: BreadcrumbItem[] }) {
    const { auth, flash } = usePage<SharedData>().props;
    const { url } = usePage();
    const [open, setOpen] = useState(false);
    const items = auth.user.is_parent
        ? [...navigation, { title: 'Espace parents', url: '/parents/games', icon: Gamepad2 }, { title: 'Mode kiosque', url: '/kiosk', icon: Tablet }]
        : navigation;
    const links = (
        <nav className="nav nav-pills flex-column" aria-label="Navigation principale">
            {items.map(({ title, url: href, icon: Icon }) => (
                <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`nav-link d-flex align-items-center gap-2 mb-1 ${url.split('?')[0] === href || (href !== '/dashboard' && url.startsWith(href + '/')) ? 'active' : ''}`}
                    aria-current={url.split('?')[0] === href ? 'page' : undefined}
                >
                    <Icon size={20} />
                    {title}
                </Link>
            ))}
            <a className="nav-link" href="/mobile">
                Interface mobile
            </a>
        </nav>
    );
    return (
        <div className="app-shell">
            <aside className="app-sidebar d-none d-lg-flex flex-column p-3">
                <Link href="/dashboard" className="mb-4">
                    <img src="/logo.png" alt="Maiso’net" className="img-fluid" />
                </Link>
                {links}
            </aside>
            <div className="app-main">
                <header className="app-toolbar d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
                    <button
                        type="button"
                        className="btn btn-outline-primary d-lg-none"
                        onClick={() => setOpen(true)}
                        aria-label="Ouvrir la navigation"
                    >
                        <Menu />
                    </button>
                    <nav aria-label="Fil d’Ariane">
                        <ol className="breadcrumb mb-0">
                            {breadcrumbs.map((item, index) => (
                                <li className="breadcrumb-item" key={item.href}>
                                    {index === breadcrumbs.length - 1 ? (
                                        <span aria-current="page">{item.title}</span>
                                    ) : (
                                        <Link href={item.href}>{item.title}</Link>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </nav>
                    <Dropdown align="end">
                        <Dropdown.Toggle variant="outline-primary">{auth.user.name}</Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item as={Link} href="/settings/profile">
                                <Settings size={16} /> Mon compte
                            </Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item as="button" onClick={() => router.post(route('logout'))}>
                                Se déconnecter
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </header>
                {flash?.success && (
                    <div role="status" className="alert alert-success m-3">
                        {flash.success}
                    </div>
                )}
                {children}
            </div>
            <Offcanvas show={open} onHide={() => setOpen(false)}>
                <Offcanvas.Header closeButton closeLabel="Fermer">
                    <Offcanvas.Title>Maiso’net</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>{links}</Offcanvas.Body>
            </Offcanvas>
        </div>
    );
}
