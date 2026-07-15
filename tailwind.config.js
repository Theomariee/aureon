/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Aureon dark-premium palette
        ink: {
          950: '#070a12',
          900: '#0b0f1a',
          850: '#0f1420',
          800: '#141a28',
          700: '#1c2333',
          600: '#26304480'
        },
        line: '#232c40',
        gold: {
          400: '#f5d78a',
          500: '#e8c169',
          600: '#d4a83f'
        },
        mint: {
          400: '#4ade9a',
          500: '#22c37e'
        },
        coral: {
          400: '#ff7a85',
          500: '#f4515f'
        },
        sky: {
          400: '#6db3f2',
          500: '#3d8ee0'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 30px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(232,193,105,0.25), 0 10px 40px -12px rgba(232,193,105,0.25)'
      },
      backgroundImage: {
        'gold-grad': 'linear-gradient(135deg, #f5d78a 0%, #d4a83f 100%)',
        'card-grad': 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease both'
      }
    }
  },
  plugins: []
}
