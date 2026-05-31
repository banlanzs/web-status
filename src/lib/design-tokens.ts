/**
 * Design tokens for Web Status UI
 * Inspired by Anthropic/Claude design system
 */

export const designTokens = {
  colors: {
    light: {
      bg: "#f5f4ed",
      surface: "#faf9f5",
      surfaceWarm: "#e8e6dc",
      fg: "#141413",
      fg2: "#3d3d3a",
      muted: "#5e5d59",
      meta: "#87867f",
      border: "#f0eee6",
      borderSoft: "#e8e6dc",
      accent: "#c96442",
      accentOn: "#faf9f5",
      success: "#17a34a",
      warn: "#eab308",
      danger: "#b53333",
    },
    dark: {
      bg: "#141413",
      surface: "#2a2a28",
      surfaceWarm: "#333330",
      fg: "#faf9f5",
      fg2: "#e5e5e0",
      muted: "rgba(250, 249, 245, 0.68)",
      meta: "rgba(250, 249, 245, 0.52)",
      border: "rgba(250, 249, 245, 0.12)",
      borderSoft: "rgba(250, 249, 245, 0.18)",
      accent: "#c96442",
      accentOn: "#faf9f5",
      success: "#17a34a",
      warn: "#eab308",
      danger: "#b53333",
    },
  },
  fonts: {
    display: '"Georgia", "Times New Roman", serif',
    body: '"Arial", system-ui, -apple-system, sans-serif',
    mono: '"ui-monospace", "JetBrains Mono", "Menlo", monospace',
  },
  textScale: {
    xs: "10px",
    sm: "14px",
    base: "16px",
    lg: "20px",
    xl: "25px",
    "2xl": "32px",
    "3xl": "52px",
    "4xl": "64px",
  },
  spacing: {
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    12: "48px",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    pill: "9999px",
  },
  shadows: {
    flat: "none",
    ring: "0 0 0 1px var(--border)",
    raised: "rgba(0, 0, 0, 0.05) 0px 4px 24px",
    focusRing: "0 0 0 3px rgba(56, 152, 236, 0.3)",
  },
  motion: {
    fast: "150ms",
    base: "200ms",
    ease: "cubic-bezier(0.2, 0, 0, 1)",
  },
  container: {
    maxWidth: "1200px",
    gutterDesktop: "24px",
    gutterTablet: "16px",
    gutterPhone: "12px",
  },
} as const;

export type Theme = "light" | "dark";
