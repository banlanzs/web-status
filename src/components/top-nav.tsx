"use client";

import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { useAuth } from "@/components/providers/auth-provider";

interface TopNavProps {
  onRequestLogin?: () => void;
}

export function TopNav({ onRequestLogin }: TopNavProps) {
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { isLoggedIn, isProtectionEnabled, logout } = useAuth();

  const currentLang = availableLanguages.find((lang) => lang.code === language);
  const nextLang = availableLanguages.find((lang) => lang.code !== language);

  const handleLangToggle = () => {
    if (nextLang) {
      setLanguage(nextLang.code);
    }
  };

  return (
    <header className="topnav">
      <div className="container nav-inner">
        <Link className="logo" href="/">
          {t("app.name")}
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <Link href="/" className="hover:text-fg hover:bg-surface rounded-sm px-2 py-2 text-sm text-muted transition-colors">
            {language === "zh" ? "概览" : "Overview"}
          </Link>
          <a
            href={process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/banlanzs/web-status"}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fg hover:bg-surface rounded-sm px-2 py-2 text-sm text-muted transition-colors"
          >
            GitHub
          </a>
        </nav>
        <div className="nav-actions">
          <button
            className="btn btn-small"
            type="button"
            onClick={handleLangToggle}
            title={`Switch to ${nextLang?.label}`}
          >
            {currentLang?.label}
          </button>
          <button
            className="btn btn-small"
            type="button"
            onClick={toggleTheme}
          >
            {theme === "light"
              ? language === "zh" ? "深色" : "Dark"
              : language === "zh" ? "浅色" : "Light"
            }
          </button>
          {isProtectionEnabled ? (
            <button
              className="btn btn-small"
              type="button"
              onClick={() => {
                if (isLoggedIn) {
                  logout();
                } else {
                  onRequestLogin?.();
                }
              }}
            >
              {isLoggedIn
                ? language === "zh" ? "退出登录" : "Log out"
                : language === "zh" ? "登录" : "Log in"
              }
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
