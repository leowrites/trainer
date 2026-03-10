/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Foreground / primary text ─────────────────────────────────────────
        // Maps to CSS --text (#e8e8e8) — the main off-white text colour
        foreground: {
          DEFAULT: '#e8e8e8',
        },

        // ── Primary (green) ────────────────────────────────────────────────────
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },

        // ── Accent (lime) ─────────────────────────────────────────────────────
        // Maps to CSS --accent (#c8f542)
        accent: {
          DEFAULT: '#c8f542',
          subtle: 'rgba(200,245,66,0.1)',
          border: 'rgba(200,245,66,0.25)',
        },

        // ── Secondary / Accent2 (orange-amber) ────────────────────────────────
        // Maps to CSS --accent2 (#f5a742)
        secondary: {
          DEFAULT: '#f5a742',
          subtle: 'rgba(245,167,66,0.1)',
          border: 'rgba(245,167,66,0.25)',
        },

        // ── Error / Red ───────────────────────────────────────────────────────
        // Maps to CSS --red (#f05a4f)
        error: {
          DEFAULT: '#f05a4f',
          subtle: 'rgba(240,90,79,0.1)',
          border: 'rgba(240,90,79,0.25)',
        },

        // ── Surface ───────────────────────────────────────────────────────────
        // Maps to CSS --bg / --surface / --surface2 / --border
        surface: {
          DEFAULT: '#0e0e0e',
          card: '#161616',
          elevated: '#1e1e1e',
          border: '#2a2a2a',
        },

        // ── Muted ─────────────────────────────────────────────────────────────
        // Maps to CSS --muted (#666)
        muted: {
          DEFAULT: '#666666',
          foreground: '#999999',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
