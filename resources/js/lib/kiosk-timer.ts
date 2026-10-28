export interface KioskTimer {
    taskId: number;
    memberId: number | null;
    completionId: number | null;
    startedAt: number | null;
    elapsedMs: number;
}

export function elapsedAt(timer: KioskTimer, now: number): number {
    return timer.elapsedMs + (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt));
}

export function pauseTimer(timer: KioskTimer, now: number): KioskTimer {
    return { ...timer, elapsedMs: elapsedAt(timer, now), startedAt: null };
}

export function resumeTimer(timer: KioskTimer, now: number): KioskTimer {
    return timer.startedAt === null ? { ...timer, startedAt: now } : timer;
}

export function parseTimer(raw: string | null): KioskTimer | null {
    try {
        const value = JSON.parse(raw ?? 'null');
        if (
            !value ||
            !Number.isInteger(value.taskId) ||
            value.taskId <= 0 ||
            !(value.memberId === null || (Number.isInteger(value.memberId) && value.memberId > 0)) ||
            !(value.completionId === null || (Number.isInteger(value.completionId) && value.completionId > 0)) ||
            !(value.startedAt === null || (Number.isFinite(value.startedAt) && value.startedAt >= 0)) ||
            !Number.isFinite(value.elapsedMs) ||
            value.elapsedMs < 0
        )
            return null;
        return {
            taskId: value.taskId,
            memberId: value.memberId,
            completionId: value.completionId,
            startedAt: value.startedAt,
            elapsedMs: value.elapsedMs,
        };
    } catch {
        return null;
    }
}

export function parseTimers(raw: string | null): KioskTimer[] {
    try {
        const stored: unknown = JSON.parse(raw ?? 'null');
        // Accept the previous single-timer format so an ongoing mission survives the upgrade.
        const values = Array.isArray(stored) ? stored : [stored];
        const timers: KioskTimer[] = [];
        for (const value of values) {
            const timer = parseTimer(JSON.stringify(value));
            if (timer && !timers.some((existing) => existing.taskId === timer.taskId)) timers.push(timer);
        }
        return timers;
    } catch {
        return [];
    }
}

export function startTaskTimer(timers: KioskTimer[], timer: KioskTimer): KioskTimer[] {
    return timers.some((existing) => existing.taskId === timer.taskId) ? timers : [...timers, timer];
}

export function pauseTaskTimer(timers: KioskTimer[], taskId: number, now: number): KioskTimer[] {
    return timers.map((timer) => (timer.taskId === taskId ? pauseTimer(timer, now) : timer));
}

export function resumeTaskTimer(timers: KioskTimer[], taskId: number, now: number): KioskTimer[] {
    return timers.map((timer) => (timer.taskId === taskId ? resumeTimer(timer, now) : timer));
}

export function removeTaskTimer(timers: KioskTimer[], taskId: number): KioskTimer[] {
    return timers.filter((timer) => timer.taskId !== taskId);
}

export function formatElapsed(milliseconds: number): string {
    const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
    const parts = [Math.floor(seconds / 60) % 60, seconds % 60];
    if (seconds >= 3600) parts.unshift(Math.floor(seconds / 3600));
    return parts.map((value) => String(value).padStart(2, '0')).join(':');
}
