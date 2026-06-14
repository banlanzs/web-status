"use client";

import { useLanguage } from "@/components/providers/language-provider";

export function Footer() {
  const { language } = useLanguage();
  const currentYear = new Date().getFullYear();
  const startYear = 2025;
  const yearRange = currentYear > startYear ? `${startYear}-${currentYear}` : `${startYear}`;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="pagefoot">
      <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: "var(--space-4)" }}>
        <span>
          Web STATUS · © {yearRange}{" "}
          <a
            href="https://github.com/banlanzs"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            banlan
          </a>
        </span>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <a
            className="btn btn-small"
            href={process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/banlanzs/web-status"}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <button
            className="btn btn-small"
            type="button"
            onClick={scrollToTop}
          >
            {language === "zh" ? "回到顶部" : "Back to top"}
          </button>
        </div>
      </div>
    </footer>
  );
}
