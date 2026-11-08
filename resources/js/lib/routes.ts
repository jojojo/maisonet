import { route as routeFn } from 'ziggy-js';

export type BrowserRouteConfig = NonNullable<Parameters<typeof routeFn>[3]>;

/** Pass the server route table explicitly: Safari 12 can lose Ziggy's global const across modules. */
export function makeBrowserRoute(config: BrowserRouteConfig): typeof routeFn {
    const configured = (
        name?: Parameters<typeof routeFn>[0],
        params?: Parameters<typeof routeFn>[1],
        absolute?: boolean,
        override?: BrowserRouteConfig,
    ) => routeFn(name, params, absolute, override ?? config);

    return configured as typeof routeFn;
}
