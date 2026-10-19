import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    auth: Auth;
    rooms: Room[];
    members: Member[];
    flash?: { success: string | null };
    [key: string]: unknown;
}

export type Recurrence = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type TaskStatus = 'overdue' | 'today' | 'upcoming' | 'done';
export type EffortSize = 'XS' | 'S' | 'M' | 'L' | 'XL';

export interface Room {
    id: number;
    name: string;
    icon: string;
    tasks_count?: number;
    overdue_count?: number;
    today_count?: number;
}

export interface Member {
    id: number;
    name: string;
    color: string;
    tasks_count?: number;
    open_count?: number;
    done_this_week?: number;
}

export interface Task {
    id: number;
    room_id: number;
    member_id: number | null;
    title: string;
    notes: string | null;
    effort_size: EffortSize | null;
    effort_points: number | null;
    recurrence: Recurrence;
    interval: number;
    next_due_date: string | null;
    last_completed_at: string | null;
    status: TaskStatus;
    dirt_level: number | null;
    room?: Room;
    members: Member[];
    projected?: boolean;
}

export interface Completion {
    id: number;
    completed_on: string;
    effort_points: number | null;
    task: Task;
    member: Member | null;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
