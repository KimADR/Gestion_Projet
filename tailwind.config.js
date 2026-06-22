/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#f5f7fb',
        foreground: '#0f172a',
        border: '#e5e7eb',

        primary: '#0B1F33',
        'primary-dark': '#081728',
        'primary-light': '#183253',
        'primary-subtle': '#eef5ff',

        secondary: '#64748b',
        'secondary-light': '#94a3b8',
        'secondary-subtle': '#f8fafc',

        accent: '#0ea5a6',
        'accent-dark': '#0b7d7d',
        'accent-light': '#99f6e4',
        'accent-subtle': '#f0fdfa',

        success: '#16a34a',
        'success-light': '#ecfdf3',
        warning: '#d97706',
        'warning-light': '#fffbeb',
        error: '#dc2626',
        'error-light': '#fef2f2',

        surface: '#ffffff',
        'surface-alt': '#f8fafc',
        'surface-subtle': '#f8fafc',
      },
      fontFamily: {
        serif: ['Georgia', 'Garamond', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-sora)', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      borderRadius: {
        xs: '0.375rem',
        sm: '0.5rem',
        md: '0.625rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      spacing: {
        xs: '6px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '40px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        sm: '0 1px 3px 0 rgba(15, 23, 42, 0.06)',
        md: '0 6px 16px -10px rgba(15, 23, 42, 0.18)',
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px', letterSpacing: '0.3px' }],
        sm: ['14px', { lineHeight: '20px', letterSpacing: '0.2px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.5px' }],
        '4xl': ['36px', { lineHeight: '40px', letterSpacing: '-1px' }],
      },
      backgroundImage: {},
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        float: 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
