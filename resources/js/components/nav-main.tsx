import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

const iconColors = [
    'bg-emerald-100 text-emerald-800',
    'bg-sky-100 text-sky-800',
    'bg-orange-100 text-orange-800',
    'bg-rose-100 text-rose-800',
    'bg-violet-100 text-violet-800',
    'bg-teal-100 text-teal-800',
    'bg-amber-100 text-amber-800',
    'bg-indigo-100 text-indigo-800',
];

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="mb-2 text-xs font-bold tracking-wider">Notre petit chez-nous</SidebarGroupLabel>
            <SidebarMenu className="gap-1.5">
                {items.map((item, index) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            tooltip={item.title}
                            className="h-12 rounded-2xl px-2 font-semibold group-data-[collapsible=icon]:p-0! data-[active=true]:shadow-[inset_0_0_0_1px_var(--sidebar-border)]"
                            isActive={page.url === item.url || page.url.startsWith(`${item.url}/`) || page.url.startsWith(`${item.url}?`)}
                        >
                            <Link href={item.url} prefetch>
                                {item.icon && (
                                    <span
                                        className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${iconColors[index % iconColors.length]}`}
                                    >
                                        <item.icon className="size-[18px]" strokeWidth={2} />
                                    </span>
                                )}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
