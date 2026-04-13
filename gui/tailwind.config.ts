import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0040e0',
        'primary-container': '#2e5bff',
        'primary-fixed': '#d5e3fc',
        secondary: '#57657a',
        'secondary-container': '#d5e3fc',
        tertiary: '#993100',
        'tertiary-container': '#ffd8c4',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        surface: '#faf8ff',
        'surface-container': '#eaedff',
        'surface-container-low': '#f2f3ff',
        'surface-container-high': '#dae2fd',
        'surface-container-highest': '#dae2fd',
        'surface-container-lowest': '#ffffff',
        'surface-bright': '#faf8ff',
        'on-surface': '#131b2e',
        'on-surface-variant': '#434656',
        'on-primary-fixed-variant': '#2e5bff',
        'on-secondary-container': '#57657a',
        outline: '#74777f',
        'outline-variant': '#c4c5d9',
      },
      fontFamily: {
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        headline: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
