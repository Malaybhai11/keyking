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
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        }
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'slide-out-right': 'slide-out-right 0.3s ease-in forwards',
      }
    },
  },
  plugins: [],
}
