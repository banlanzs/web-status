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
      <div className="container">
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
      </div>
    </footer>
  );
}
