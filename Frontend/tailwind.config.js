/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/popup/**/*.{ts,tsx,html}',
    './src/content-scripts/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        vigil: {
          safe: '#10b981',    // Emerald 500
          caution: '#f59e0b', // Amber 500
          danger: '#f43f5e',  // Rose 500
          primary: '#4f46e5', // Indigo 600
          accent: '#0ea5e9',  // Sky 500
          dark: '#0f172a',    // Slate 900
          surface: '#f8fafc', // Slate 50
        },
      },
      boxShadow: {
        'premium': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'glass': '0 4px 30px rgba(0, 0, 0, 0.05)',
      },
      width: {
        popup: '380px',
      },
      maxHeight: {
        popup: '560px',
      },
    },
  },
  plugins: [],
};
