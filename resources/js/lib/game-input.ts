export interface GamePointer {
    clientX: number;
    clientY: number;
    pointerId: number;
    buttons: number;
    target: EventTarget | null;
    preventDefault: () => void;
}

/** One set of controls, backed by pointer events or iOS 12 touch/mouse events. */
export function bindGamePointer(
    element: HTMLElement,
    handlers: { down: (event: GamePointer) => void; move?: (event: GamePointer) => void; up?: (event: GamePointer) => void },
) {
    const cleanup: (() => void)[] = [];
    const listen = (target: EventTarget, type: string, handler: EventListener, options?: AddEventListenerOptions) => {
        target.addEventListener(type, handler, options);
        cleanup.push(() => target.removeEventListener(type, handler, options));
    };
    if (window.PointerEvent) {
        const down = (event: PointerEvent) => {
            if (!(event.target as HTMLElement)?.closest('button')) element.setPointerCapture?.(event.pointerId);
            handlers.down(event);
        };
        listen(element, 'pointerdown', down as EventListener);
        if (handlers.move) listen(element, 'pointermove', (event: Event) => handlers.move?.(event as PointerEvent));
        if (handlers.up) {
            listen(element, 'pointerup', (event: Event) => handlers.up?.(event as PointerEvent));
            listen(element, 'pointercancel', (event: Event) => handlers.up?.(event as PointerEvent));
        }
    } else {
        let active: number | null = null;
        let lastTouch = 0;
        const touch = (phase: 'down' | 'move' | 'up') => (event: TouchEvent) => {
            if ((event.target as HTMLElement)?.closest('button')) return;
            if (phase === 'down' && active !== null) return;
            const point = Array.from(event.changedTouches).find((item) => active === null || item.identifier === active);
            if (!point) return;
            lastTouch = Date.now();
            if (event.cancelable) event.preventDefault();
            if (phase === 'down') active = point.identifier;
            handlers[phase]?.({
                clientX: point.clientX,
                clientY: point.clientY,
                pointerId: point.identifier,
                buttons: phase === 'up' ? 0 : 1,
                target: event.target,
                preventDefault: () => event.preventDefault(),
            });
            if (phase === 'up') active = null;
        };
        listen(element, 'touchstart', touch('down') as EventListener, { passive: false });
        listen(element, 'touchmove', touch('move') as EventListener, { passive: false });
        listen(element, 'touchend', touch('up') as EventListener, { passive: false });
        listen(element, 'touchcancel', touch('up') as EventListener, { passive: false });
        let mouseDown = false;
        listen(element, 'mousedown', ((event: MouseEvent) => {
            if (Date.now() - lastTouch < 800) return;
            mouseDown = true;
            handlers.down({
                clientX: event.clientX,
                clientY: event.clientY,
                pointerId: 1,
                buttons: 1,
                target: event.target,
                preventDefault: () => event.preventDefault(),
            });
        }) as EventListener);
        listen(window, 'mousemove', ((event: MouseEvent) => {
            if (mouseDown)
                handlers.move?.({
                    clientX: event.clientX,
                    clientY: event.clientY,
                    pointerId: 1,
                    buttons: event.buttons,
                    target: event.target,
                    preventDefault: () => event.preventDefault(),
                });
        }) as EventListener);
        listen(window, 'mouseup', ((event: MouseEvent) => {
            if (mouseDown)
                handlers.up?.({
                    clientX: event.clientX,
                    clientY: event.clientY,
                    pointerId: 1,
                    buttons: 0,
                    target: event.target,
                    preventDefault: () => event.preventDefault(),
                });
            mouseDown = false;
        }) as EventListener);
    }
    return () => cleanup.forEach((remove) => remove());
}
