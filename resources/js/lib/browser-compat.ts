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
            const elements = [node, ...Array.from(node.querySelectorAll<HTMLElement>('[class*="aspect-"]'))];
            elements.forEach((element) => {
                if (remove) {
                    observer.unobserve(element);
                    ratios.delete(element);
                    return;
                }
                const match = element.className.match(/(?:^|\s)aspect-\[(\d+)\/(\d+)\](?:\s|$)/);
                const square = element.classList.contains('aspect-square');
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
