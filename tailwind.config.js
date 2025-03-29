/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'emoji-float': 'emojiFloat ease-out forwards',
        'fail-fall': 'failFall linear forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        emojiFloat: {
          '0%': { transform: 'translateY(0)', opacity: 1 },
          '100%': { transform: 'translateY(-120vh)', opacity: 0 },
        },
        failFall: {
          '0%': { transform: 'translateY(-10vh)', opacity: 1 },
          '100%': { transform: 'translateY(110vh)', opacity: 0 },
        },
      },
      scale: {
        200: "2",
      },
      rotate: {
        'y-180': '180deg',
      },
      transform: ['hover', 'focus'],
    },
  },
  plugins: [],
};
