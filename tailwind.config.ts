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
        // Brand Identity — Primary Colors
        terracotta: {
          50: "#faf5f3",
          100: "#f5ebe7",
          200: "#ebd5cd",
          300: "#dbb8ab",
          400: "#c4907f",
          500: "#A0695A",  // Main terracotta
          600: "#8b5a4c",
          700: "#7A4E42",  // Terracotta dark
          800: "#5e3c33",
          900: "#4d322b",
        },
        charcoal: {
          50: "#f6f6f6",
          100: "#e7e7e7",
          200: "#d1d1d1",
          300: "#b0b0b0",
          400: "#888888",
          500: "#6d6d6d",
          600: "#4A4A4A",  // Charcoal soft
          700: "#3d3d3d",
          800: "#2C2C2C",  // Main charcoal
          900: "#1a1a1a",
        },
        concrete: {
          50: "#fafaf9",
          100: "#F5F2ED",  // Cream
          200: "#E8E4DE",  // Concrete light / Warm cream
          300: "#dbd6ce",
          400: "#C8C3BB",  // Main concrete
          500: "#b0aaa0",
          600: "#9E9A93",  // Concrete dark
          700: "#827e78",
          800: "#6b6862",
          900: "#585551",
        },
        sage: {
          50: "#f4f6f3",
          100: "#e6eae3",
          200: "#cdd6c8",
          300: "#A3B296",  // Sage light
          400: "#8fa282",
          500: "#7A8B6F",  // Main sage
          600: "#627158",
          700: "#4e5a47",
          800: "#40493b",
          900: "#363e33",
        },
        gold: {
          50: "#faf7f2",
          100: "#f3ece0",
          200: "#e5d5bc",
          300: "#d4bb95",
          400: "#B8976A",  // Main gold accent
          500: "#a5834e",
          600: "#8a6c3f",
          700: "#705535",
          800: "#5c4630",
          900: "#4d3a2a",
        },
        // Semantic aliases for easy use
        brand: {
          50: "#faf5f3",
          100: "#f5ebe7",
          200: "#ebd5cd",
          300: "#dbb8ab",
          400: "#c4907f",
          500: "#A0695A",
          600: "#8b5a4c",
          700: "#7A4E42",
          800: "#5e3c33",
          900: "#4d322b",
        },
        // Keep navy as alias for charcoal (backward compat)
        navy: {
          50: "#f6f6f6",
          100: "#e7e7e7",
          200: "#d1d1d1",
          300: "#b0b0b0",
          400: "#888888",
          500: "#6d6d6d",
          600: "#4A4A4A",
          700: "#3d3d3d",
          800: "#2C2C2C",
          900: "#1a1a1a",
          950: "#0f0f0f",
        },
      },
      fontFamily: {
        display: ["var(--font-jost)", "sans-serif"],
        body: ["var(--font-jakarta)", "sans-serif"],
        mono: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        "xl": "12px",
        "2xl": "16px",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #A0695A 0%, #B8976A 100%)",
        "gradient-charcoal": "linear-gradient(180deg, #2C2C2C 0%, #3a3530 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
