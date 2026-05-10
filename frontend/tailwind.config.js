/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        templo: {
          // Official temple palette
          gold: "#fbdb94",        // Amarillo del footer
          cream: "#fffdf6",       // Amarillo del fondo
          brown: "#403923",       // Marrón
          // Derived shades
          goldLight: "#fde9bd",
          goldDeep: "#e6bf6a",
          brownLight: "#5e533a",
          brownLighter: "#8d8062",
          parchment: "#fbf6e6",
          ink: "#0f1117",
          inkLight: "#1a1d27",
          deepgold: "#fbdb94",
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
