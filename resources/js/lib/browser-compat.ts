// Loaded before React and Inertia: the same application runs on old and new browsers.
import 'core-js/stable';
import 'intersection-observer';
import ResizeObserverPolyfill from 'resize-observer-polyfill';

if (typeof window !== 'undefined') {
    if (!window.ResizeObserver) window.ResizeObserver = ResizeObserverPolyfill;

    const prototype = Object.getPrototypeOf(window.matchMedia('(min-width: 0px)'));
    if (!prototype.addEventListener) {
        prototype.addEventListener = function (type: string, listener: (event: MediaQueryListEvent) => void) {
            if (type === 'change') this.addListener(listener);
        };
        prototype.removeEventListener = function (type: string, listener: (event: MediaQueryListEvent) => void) {
            if (type === 'change') this.removeListener(listener);
        };
    }

    const measureGap = () => {
        const test = document.createElement('div');
        test.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';
        test.append(document.createElement('div'), document.createElement('div'));
        document.body.appendChild(test);
        document.documentElement.classList.toggle('no-flex-gap', test.scrollHeight !== 1);
        test.remove();
        if (document.documentElement.classList.contains('no-flex-gap')) {
            let queued = false;
            const update = () => {
                queued = false;
                document.querySelectorAll<HTMLElement>('[class*="gap-"], [data-flex-gap]').forEach((element) => {
                    const style = getComputedStyle(element);
                    if (!style.display.includes('flex')) {
                        element.removeAttribute('data-flex-gap');
                        return;
                    }
                    const column = style.flexDirection.startsWith('column');
                    element.setAttribute('data-flex-gap', '');
                    element.style.setProperty('--compat-column-gap', column ? '0px' : style.columnGap === 'normal' ? '0px' : style.columnGap);
                    element.style.setProperty(
                        '--compat-row-gap',
                        !column && style.flexWrap === 'nowrap' ? '0px' : style.rowGap === 'normal' ? '0px' : style.rowGap,
                    );
                });
            };
            const schedule = () => {
                if (!queued) {
                    queued = true;
                    requestAnimationFrame(update);
                }
            };
            new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
            window.addEventListener('resize', schedule);
            update();
        }
    };
    if (document.body) measureGap();
    else document.addEventListener('DOMContentLoaded', measureGap, { once: true });

    // The same responsive boards keep their dimensions when aspect-ratio is unavailable.
    if (!window.CSS?.supports?.('aspect-ratio', '1 / 1')) {
        const ratios = new WeakMap<Element, number>();
        const size = (element: HTMLElement) => {
            const ratio = ratios.get(element);
            if (!ratio) return;
            const height = `${Math.round(element.getBoundingClientRect().width / ratio)}px`;
            if (element.style.height !== height) element.style.height = height;
        };
        const observer = new ResizeObserverPolyfill((entries) => entries.forEach(({ target }) => size(target as HTMLElement)));
        const visit = (node: Node, remove = false) => {
            if (!(node instanceof HTMLElement)) return;
            const elements = [node, ...Array.from(node.querySelectorAll<HTMLElement>('[class*="mn-aspect-"]'))];
            elements.forEach((element) => {
                if (remove) {
                    observer.unobserve(element);
                    ratios.delete(element);
                    return;
                }
                const match = element.className.match(/(?:^|\s)mn-aspect-(\d+)-(\d+)(?:\s|$)/);
                const square = element.classList.contains('mn-aspect-1-1');
                if ((!match && !square) || ratios.has(element)) return;
                ratios.set(element, square ? 1 : Number(match![1]) / Number(match![2]));
                size(element);
                observer.observe(element);
            });
        };
        const start = () => {
            visit(document.body);
            new MutationObserver((records) =>
                records.forEach((record) => {
                    record.removedNodes.forEach((node) => visit(node, true));
                    record.addedNodes.forEach((node) => visit(node));
                }),
            ).observe(document.body, { childList: true, subtree: true });
        };
        if (document.body) start();
        else document.addEventListener('DOMContentLoaded', start, { once: true });
    }
}
