import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'on-primary-fixed-variant': '#2b4963',
        'surface-tint': '#abcae8',
        'on-primary-fixed': '#001d31',
        'on-secondary': '#2f3133',
        'on-surface-variant': '#c3c7cd',
        'tertiary': '#eabf8a',
        'primary-fixed': '#cce5ff',
        'error': '#F87171',
        'secondary-container': '#454749',
        'on-secondary-container': '#b4b5b7',
        'inverse-primary': '#43617c',
        'on-tertiary': '#452b03',
        'secondary': '#c6c6c9',
        'surface-container-lowest': '#0d0e10',
        'on-secondary-fixed': '#1a1c1e',
        'surface': '#16181A',
        'on-surface': '#e3e2e4',
        'tertiary-container': '#735328',
        'background': '#0D0E10',
        'inverse-on-surface': '#2f3032',
        'on-background': '#e3e2e4',
        'on-tertiary-fixed': '#2a1800',
        'on-primary-container': '#b5d4f2',
        'surface-bright': '#232629',
        'primary-fixed-dim': '#abcae8',
        'error-container': '#93000a',
        'outline-variant': '#42474d',
        'border-subtle': '#2D3135',
        'surface-container': '#1e2022',
        'surface-variant': '#343537',
        'surface-container-high': '#292a2c',
        'on-primary': '#12334b',
        'inverse-surface': '#e3e2e4',
        'on-error': '#690005',
        'primary-container': '#3e5c76',
        'on-error-container': '#ffdad6',
        'on-secondary-fixed-variant': '#454749',
        'primary': '#abcae8',
        'surface-container-low': '#1a1c1d',
        'secondary-fixed': '#e2e2e5',
        'warning': '#FACC15',
        'on-tertiary-fixed-variant': '#5e4118',
        'on-tertiary-container': '#f5c993',
        'success': '#4ADE80',
        'secondary-fixed-dim': '#c6c6c9',
        'outline': '#8d9197',
        'surface-dim': '#121315',
        'surface-container-highest': '#343537',
        'tertiary-fixed-dim': '#eabf8a',
        'info': '#818CF8',
        'tertiary-fixed': '#ffddb6'
      },
      borderRadius: {
        'DEFAULT': '0.125rem',
        'lg': '0.25rem',
        'xl': '0.5rem',
        'full': '0.75rem'
      },
      spacing: {
        'gutter': '1.5rem',
        'margin-page': '2rem',
        'container-max': '1440px',
        'stack-lg': '2rem',
        'stack-md': '1rem',
        'stack-sm': '0.5rem'
      },
      fontFamily: {
        'headline-md': ['"Hanken Grotesk"', 'sans-serif'],
        'title-sm': ['"Hanken Grotesk"', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        'display-lg': ['"Hanken Grotesk"', 'sans-serif'],
        'data-mono': ['"JetBrains Mono"', 'monospace'],
        'label-caps': ['"JetBrains Mono"', 'monospace']
      },
      fontSize: {
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'title-sm': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'display-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'data-mono': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'label-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '500' }]
      }
    }
  },
  plugins: [
    forms
  ],
};
