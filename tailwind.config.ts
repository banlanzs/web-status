import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.tsx",
    "./src/**/*.ts",
    "./src/**/*.jsx",
    "./src/**/*.js",
    "./src/**/*.mdx",
  ],
  theme: {
    extend: {
      colors: {
        success: {
          DEFAULT: "#34d399",
          foreground: "#064e3b",
        },
        warning: {
          DEFAULT: "#f97316",
          foreground: "#7c2d12",
        },
        danger: {
          DEFAULT: "#f87171",
          foreground: "#7f1d1d",
        },
        slate: {
          850: "#1f2937",
        },
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, rgba(16,185,129,0.95), rgba(20,184,166,0.95))",
        "hero-gradient-warning":
          "linear-gradient(135deg, rgba(251,191,36,0.95), rgba(245,158,11,0.95))",
      },
      boxShadow: {
        soft: "0 20px 45px -20px rgba(15, 118, 110, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;

