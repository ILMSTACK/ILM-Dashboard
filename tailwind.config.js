/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: '',
  important: true, 
  mode: 'jit',
  content: [
  './src/**/*.{html,ts,scss,css}',
],
  theme: {
    extend: {
      fontFamily: {
        nunito: ['"Nunito"', 'sans-serif'],
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  }
}