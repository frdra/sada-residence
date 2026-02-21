import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#faf8f5",
          100: "#f3efe8",
          200: "#e5dccf",
          300: "#d4c5ae",
          400: "#c9a96e",
          500: "#b8943d",
          600: "#a07d2e",
          700: "#7d6224",
          800: "#5c491b",
          900: "#3d3013",
        },
        navy: {
          50: "#f0f2f7",
          100: "#d9dde9",
          200: "#b3bbd3",
          300: "#8d99bd",
          400: "#6777a7",
          500: "#415591",
          600: "#344474",
          700: "#273357",
          800: "#1a223a",
          900: "#1a1a2e",
          950: "#0f0f1a",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
