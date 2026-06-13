import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
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
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-lexend)", "sans-serif"],
      },
      boxShadow: {
        "neo-sm": "2px 2px 0px 0px #000000",
        "neo-md": "4px 4px 0px 0px #000000",
        "neo-lg": "8px 8px 0px 0px #000000",
        "neo-xl": "12px 12px 0px 0px #000000",
        "neo-yellow-md": "4px 4px 0px 0px #fde047",
        "neo-green-md": "4px 4px 0px 0px #00e676",
        "neo-pink-md": "4px 4px 0px 0px #ff2a85",
      },
      borderWidth: {
        "3": "3px",
        "6": "6px",
      },
    },
  },
  plugins: [],
};

export default config;
