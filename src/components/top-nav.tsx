"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { useAuth } from "@/components/providers/auth-provider";

interface TopNavProps {
  onRequestLogin?: () => void;
  overallStatus?: "up" | "degraded" | "down" | "paused";
}

export function TopNav({ onRequestLogin, overallStatus = "up" }: TopNavProps) {
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { isLoggedIn, isProtectionEnabled, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentLang = availableLanguages.find((lang) => lang.code === language);
  const nextLang = availableLanguages.find((lang) => lang.code !== language);

  const handleLangToggle = () => {
    if (nextLang) {
      setLanguage(nextLang.code);
    }
  };

  const brandDotClass = overallStatus === "degraded" ? "brand__dot--degraded" :
                         overallStatus === "down" ? "brand__dot--down" :
                         overallStatus === "paused" ? "brand__dot--paused" : "";

  return (
    <>
      <header className="topbar" role="banner">
        <div className="container topbar__inner">
          <Link className="brand" href="/" aria-label="Web STATUS home">
            <span className="brand__mark" aria-hidden="true">
              <span className={`brand__dot ${brandDotClass}`} />
            </span>
            <span>{t("app.name")}</span>
          </Link>

          <nav className="nav" aria-label="Primary">
            <Link className="nav__link" href="/" aria-current="page">
              {language === "zh" ? "概览" : "Overview"}
            </Link>
            <a
              className="nav__link"
              href={process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/banlanzs/web-status"}
              target="_blank"
              rel="noopener"
            >
              GitHub
            </a>
          </nav>

          <div className="topbar__actions">
            <span className="lang-switch" role="group" aria-label="Language">
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  data-lang-switch={lang.code}
                  aria-pressed={language === lang.code}
                  onClick={() => setLanguage(lang.code)}
                >
                  {lang.label}
                </button>
              ))}
            </span>

            <button
              type="button"
              className="topbar__btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === "light" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              )}
            </button>

            {isProtectionEnabled ? (
              <button
                type="button"
                className="login-btn"
                onClick={() => {
                  if (isLoggedIn) {
                    logout();
                  } else {
                    onRequestLogin?.();
                  }
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {isLoggedIn ? (
                    <>
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </>
                  ) : (
                    <>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </>
                  )}
                </svg>
                <span>{isLoggedIn ? t("auth.logout") : (language === "zh" ? "登录" : "Sign in")}</span>
              </button>
            ) : null}

            <button
              type="button"
              className="topbar__btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <nav className="mobile-menu" data-open={mobileMenuOpen ? "true" : "false"} aria-label="Mobile">
        <Link href="/" onClick={() => setMobileMenuOpen(false)}>
          {language === "zh" ? "概览" : "Overview"}
        </Link>
        {isProtectionEnabled ? (
          <a href="#" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); onRequestLogin?.(); }}>
            {isLoggedIn ? t("auth.logout") : (language === "zh" ? "登录" : "Sign in")}
          </a>
        ) : null}
        <a
          href={process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/banlanzs/web-status"}
          target="_blank"
          rel="noopener"
          onClick={() => setMobileMenuOpen(false)}
        >
          GitHub
        </a>
      </nav>
    </>
  );
}
