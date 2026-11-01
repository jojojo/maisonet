import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';
import animate from 'tailwindcss-animate';

const color = (name) => `rgba(var(--${name}-rgb), <alpha-value>)`;
const pairs = (name) => ({ DEFAULT: color(name), foreground: color(`${name}-foreground`) });

export default {
    content: ['./resources/**/*.{js,ts,jsx,tsx}', './resources/**/*.blade.php', './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php'],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: { sans: ['Nunito', ...defaultTheme.fontFamily.sans] },
            colors: {
                background: color('background'), foreground: color('foreground'),
                card: pairs('card'), popover: pairs('popover'), primary: pairs('primary'), secondary: pairs('secondary'),
                muted: pairs('muted'), accent: pairs('accent'), destructive: pairs('destructive'),
                border: color('border'), input: color('input'), ring: color('ring'),
                sidebar: { DEFAULT: color('sidebar-background'), foreground: color('sidebar-foreground'), primary: color('sidebar-primary'), 'primary-foreground': color('sidebar-primary-foreground'), accent: color('sidebar-accent'), 'accent-foreground': color('sidebar-accent-foreground'), border: color('sidebar-border'), ring: color('sidebar-ring') },
            },
            borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)', xs: '2px' },
            boxShadow: { xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)', '2xs': '0 1px rgb(0 0 0 / 0.05)' },
            ringWidth: { 3: '3px' },
        },
    },
    plugins: [animate, plugin(({ addUtilities }) => {
        addUtilities({ '.outline-hidden': { outline: '2px solid transparent', outlineOffset: '2px' } });
    })],
};
