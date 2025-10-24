import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#FCF6F5', // cream
          text: '#141212', // near-black
          accent: '#FA4616', // orange-red
        },
      },
    },
  },
  plugins: [],
}

export default config

