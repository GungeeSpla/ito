import plugin from 'tailwindcss/plugin';
import animate from 'tailwindcss-animate';

// text-shadow-* のクラス。値は theme.textShadow から作る (以前は tailwindcss-textshadow を使っていた)
const textshadow = plugin(
  ({ matchUtilities, theme }) => {
    matchUtilities({ 'text-shadow': (value) => ({ textShadow: value }) }, { values: theme('textShadow') });
  },
  { theme: { textShadow: { DEFAULT: '0px 0px 1px rgb(0 0 0 / 20%), 0px 0px 1px rgb(1 0 5 / 10%)' } } },
);

/** @type {import('tailwindcss').Config} */

export default {
  darkMode: ["class"],
  content: [
    "./src/client/index.html",
    "./src/client/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'text-shadow',
  ],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'emoji-float': 'emojiFloat ease-out forwards',
        'fail-fall': 'failFall linear forwards',
        'fade-in-down': 'fade-in-down 0.3s ease-out'
      },
      keyframes: {
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': {
            opacity: 0,
            transform: 'scale(0.95)'
          },
          '100%': {
            opacity: 1,
            transform: 'scale(1)'
          }
        },
        emojiFloat: {
          '0%': {
            transform: 'translateY(0)',
            opacity: 1
          },
          '100%': {
            transform: 'translateY(-120vh)',
            opacity: 0
          }
        },
        failFall: {
          '0%': {
            transform: 'translateY(-10vh)',
            opacity: 1
          },
          '100%': {
            transform: 'translateY(110vh)',
            opacity: 0
          }
        }
      },
      textShadow: {
        sm: '0.2em 0.2em 0.4em rgba(0, 0, 0, 0.8)',
        md: '0.2em 0.2em 0.4em rgba(0, 0, 0, 0.8)',
        lg: '0.4em 0.4em 0.8em rgba(0, 0, 0, 0.8)'
      },
      scale: {
        '200': '2'
      },
      rotate: {
        'y-180': '180deg'
      },
      transform: [
        'hover',
        'focus'
      ],
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        }
      }
    }
  },
  plugins: [textshadow, animate],
};
