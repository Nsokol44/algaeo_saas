/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"DM Mono"', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        bg: '#0a0c0a',
        surface: '#111411',
        surface2: '#171a17',
        border: '#1e231e',
        border2: '#252b25',
        green: {
          DEFAULT: '#4ade80',
          dim: '#22c55e',
          muted: '#166534',
          glow: 'rgba(74,222,128,0.12)',
        },
        text: {
          DEFAULT: '#e8f5e9',
          muted: '#6b7c6b',
          dim: '#9aab9a',
        },
      },
    },
  },
  plugins: [],
};
