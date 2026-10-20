import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BookOpen, CalendarDays, Gift, Home, LayoutGrid, ListChecks, Tablet, Target, Users } from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    { title: 'Tableau de bord', url: '/dashboard', icon: LayoutGrid },
    { title: 'Planning', url: '/planning', icon: CalendarDays },
    { title: 'Pièces', url: '/rooms', icon: Home },
    { title: 'Tâches', url: '/tasks', icon: ListChecks },
    { title: 'Catalogue', url: '/task-templates', icon: BookOpen },
    { title: 'Famille', url: '/members', icon: Users },
    { title: 'Récompenses', url: '/rewards', icon: Gift },
    { title: 'Objectifs', url: '/goals', icon: Target },
];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={auth.user.is_parent ? [...mainNavItems, { title: 'Mode kiosque', url: '/kiosk', icon: Tablet }] : mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
