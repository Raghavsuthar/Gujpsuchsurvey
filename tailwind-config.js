/**
 * GujPsychSurvey Tailwind Configuration
 * Clinical Calm Design System (Fully Light Theme)
 * Loaded BEFORE the Tailwind CDN script on every page
 */
window.tailwind = window.tailwind || {};
window.tailwind.config = {
  darkMode: ['selector', '.never-dark'],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#F8FAFC'
        },
        card: {
          DEFAULT: '#FFFFFF'
        },
        subsurface: {
          DEFAULT: '#F1F5F9'
        },
        border: {
          DEFAULT: '#E2E8F0',
          strong: '#CBD5E1'
        },
        primary: {
          DEFAULT: '#1E3A8A',
          hover: '#1E293B',
          container: '#1E3A8A',
          material: '#00236F'
        },
        secondary: {
          DEFAULT: '#0D9488',
          text: '#0F766E',
          soft: '#CCFBF1',
          mint: '#F0FDFA',
          material: '#006A61'
        },
        crisis: {
          DEFAULT: '#E11D48',
          tint: '#FFF1F2',
          darkTint: '#3B1219'
        },
        pending: {
          bg: '#FEF3C7',
          text: '#B45309',
          border: '#FDE68A'
        },
        surface: '#F9F9FF',
        error: '#BA1A1A'
      },
      fontFamily: {
        sans: ['Noto Sans', 'Inter', 'Noto Sans Gujarati', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
        display: ['Inter', 'Noto Sans', 'sans-serif']
      },
      maxWidth: {
        container: '1280px'
      },
      boxShadow: {
        elevation1: '0 1px 3px rgba(15, 23, 42, 0.04)',
        elevation2: '0 10px 15px -3px rgba(15, 23, 42, 0.06)'
      },
      borderRadius: {
        component: '8px',
        card: '16px',
        module: '24px'
      }
    }
  }
};
