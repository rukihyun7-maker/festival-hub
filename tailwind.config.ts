import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Background
        page: '#FBF9F4',
        surface: '#FFFFFF',
        'surface-sunken': '#FDFBF6',
        muted: '#F0ECE1',
        'muted-2': '#F3EFE5',
        // Ink · Text
        ink: {
          DEFAULT: '#14120E',
          soft: '#3C3626',
        },
        text: {
          secondary: '#6F675A',
          tertiary: '#8C8474',
          disabled: '#B5AC98',
        },
        // Lines
        line: {
          DEFAULT: '#E7E2D6',
          strong: '#E0DACB',
          faint: '#F3EFE5',
        },
        // Accent (Yellow · Brand)
        accent: {
          DEFAULT: '#FFC800',
          hover: '#FFD433',
          shadow: '#C99F00',
          warm: '#B78A00',
          deep: '#7A5B00',
        },
        // Semantic
        success: {
          DEFAULT: '#1D6B2A',
          bg: '#E2F3E4',
          'bg-soft': '#F1F9F2',
        },
        warning: {
          DEFAULT: '#7A5B00',
          bg: '#FFF3C4',
        },
        danger: {
          DEFAULT: '#9B2C22',
          strong: '#A33A24',
          soft: '#C7503E',
          bg: '#FBE3E1',
          'bg-soft': '#FFE9E4',
        },
        info: {
          DEFAULT: '#2B4B9B',
          bar: '#8FA6DE',
          bg: '#E9EEFB',
          'bg-soft': '#F4F7FE',
        },
      },
      borderRadius: {
        input: '10px',
        card: '14px',
        modal: '20px',
        pill: '99px',
      },
      boxShadow: {
        cta: '0 2px 0 #C99F00',
        dropdown: '0 16px 40px rgba(20,18,14,0.16)',
      },
      fontFamily: {
        sans: ['Wanted Sans Variable', 'Pretendard', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        container: '1180px',
      },
      animation: {
        'fh-up': 'fhUp 0.35s ease-out',
        'fh-toast': 'fhToast 0.25s ease-out',
      },
      keyframes: {
        fhUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fhToast: {
          from: { opacity: '0', transform: 'translate(-50%, 12px)' },
          to: { opacity: '1', transform: 'translate(-50%, 0)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
