import tailwindcss from 'tailwindcss';
import presetEnv from 'postcss-preset-env';
import postcss from 'postcss';
import isPseudoClass from '@csstools/postcss-is-pseudo-class';

export default {
    plugins: [
        tailwindcss(),
        {
            postcssPlugin: 'maisonet-viewport-fallbacks',
            async OnceExit(root) {
                root.walkDecls((decl) => {
                    if (decl.prop === 'gap') decl.cloneAfter({ prop: '--compat-gap' });
                    if (decl.prop === 'font-size' && /cq[wi]/.test(decl.value)) decl.cloneBefore({ value: '1.5rem' });
                    if (/\d(?:svh|dvh|lvh)/.test(decl.value)) decl.cloneBefore({ value: decl.value.replace(/(\d)(?:svh|dvh|lvh)/g, '$1vh') });
                });
                root.walkRules((rule) => { rule.selector = rule.selector.replace(/:where\(/g, ':is('); });
                await postcss([isPseudoClass({ preserve: false })]).process(root, { from: undefined });
            },
        },
        presetEnv({ browsers: ['iOS >= 12', 'Safari >= 12'], stage: 2, features: { 'custom-properties': false } }),
    ],
};
