/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        neo: {
          bg: "#fcf6e6",
          yellow: "#fde047",
          green: "#00e676",
          pink: "#ff2a85",
          cyan: "#00f0ff",
          purple: "#9d4edd",
          orange: "#ff6d00",
          dark: "#000000",
          light: "#ffffff",
          gray: "#e5e7eb",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Lexend", "sans-serif"],
      },
      boxShadow: {
        "neo-sm": "2px 2px 0px 0px #000000",
        "neo-md": "4px 4px 0px 0px #000000",
        "neo-lg": "8px 8px 0px 0px #000000",
        "neo-xl": "12px 12px 0px 0px #000000",
      },
      borderWidth: {
        "3": "3px",
      },
    },
  },
  plugins: [],
}
