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
          "linear-gradient(135deg, rgba(74,222,128,0.95), rgba(45,212,191,0.9))",
      },
      boxShadow: {
        soft: "0 20px 45px -20px rgba(15, 118, 110, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;

