/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./taskpane.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'tp': '350px',  // task-pane breakpoint for Office add-in
      },
    },
  },
  plugins: [],
}
