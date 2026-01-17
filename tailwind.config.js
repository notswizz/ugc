/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'rgb(229 231 235)',
        input: 'rgb(229 231 235)',
        ring: 'rgb(59 130 246)',
        background: 'rgb(255 255 255)',
        foreground: 'rgb(17 24 39)',
        primary: {
          DEFAULT: 'rgb(17 24 39)',
          foreground: 'rgb(255 255 255)',
        },
        secondary: {
          DEFAULT: 'rgb(243 244 246)',
          foreground: 'rgb(17 24 39)',
        },
        destructive: {
          DEFAULT: 'rgb(239 68 68)',
          foreground: 'rgb(255 255 255)',
        },
        muted: {
          DEFAULT: 'rgb(243 244 246)',
          foreground: 'rgb(107 114 128)',
        },
        accent: {
          DEFAULT: 'rgb(243 244 246)',
          foreground: 'rgb(17 24 39)',
        },
        card: {
          DEFAULT: 'rgb(255 255 255)',
          foreground: 'rgb(17 24 39)',
        },
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
    },
  },
  plugins: [],
}