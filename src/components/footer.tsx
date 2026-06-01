"use client";

import { useLanguage } from "@/components/providers/language-provider";

export function Footer() {
  const { language } = useLanguage();
  const currentYear = new Date().getFullYear();
  const startYear = 2025;
  const yearRange = currentYear > startYear ? `${startYear}-${currentYear}` : `${startYear}`;

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div>
          © {yearRange} Web STATUS ·{" "}
          <a
            href="https://github.com/banlanzs"
            target="_blank"
            rel="noopener noreferrer"
          >
            banlan
          </a>
        </div>
        <div className="footer__links">
          <a href="#">{language === "zh" ? "关于" : "About"}</a>
          <a href="#">{language === "zh" ? "更新日志" : "Changelog"}</a>
          <a href="#">{language === "zh" ? "隐私" : "Privacy"}</a>
          <a href="#">{language === "zh" ? "条款" : "Terms"}</a>
          <a
            href={process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/banlanzs/web-status"}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
