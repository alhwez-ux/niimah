/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3B986C',
          dark: '#2C7553',
          deep: '#1F5C40',
          mist: '#E7F5EE',
          soft: '#F4FAF7',
        },
        ink: '#143026',
      },
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'Segoe UI', 'Tahoma', 'sans-serif'],
        tajawal: ['Tajawal', 'Cairo', 'Segoe UI', 'Tahoma', 'sans-serif'],
      },
    },
  },
  plugins: [
    function safeArea({ addUtilities }) {
      addUtilities({
        '.pt-safe': { paddingTop: 'env(safe-area-inset-top)' },
        '.pb-safe': { paddingBottom: 'env(safe-area-inset-bottom)' },
        '.pl-safe': { paddingLeft: 'env(safe-area-inset-left)' },
        '.pr-safe': { paddingRight: 'env(safe-area-inset-right)' },
      });
    },
  ],
};
