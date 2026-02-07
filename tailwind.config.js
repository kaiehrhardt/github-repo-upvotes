/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        github: {
          canvas: {
            default: '#ffffff',
            subtle: '#f6f8fa',
            dark: '#0d1117',
            darkSubtle: '#161b22',
          },
          border: {
            default: '#d0d7de',
            dark: '#30363d',
          },
          fg: {
            default: '#24292f',
            muted: '#57606a',
            dark: '#c9d1d9',
            darkMuted: '#8b949e',
          },
          accent: {
            emphasis: '#EBCB8B', // Soft yellow accent color
            dark: '#EBCB8B',
          },
          success: {
            emphasis: '#1a7f37',
            dark: '#3fb950',
          },
          danger: {
            emphasis: '#b91c1c',
            dark: '#dc2626',
          },
          attention: {
            emphasis: '#9a6700',
            dark: '#d29922',
          },
          done: {
            emphasis: '#8250df',
            dark: '#a371f7',
          }
        }
      }
    },
  },
  plugins: [],
}
