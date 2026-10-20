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

export function formatElapsed(milliseconds: number): string {
    const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
    const parts = [Math.floor(seconds / 60) % 60, seconds % 60];
    if (seconds >= 3600) parts.unshift(Math.floor(seconds / 3600));
    return parts.map((value) => String(value).padStart(2, '0')).join(':');
}
