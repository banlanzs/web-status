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
          {/* GitHub 按钮 */}
          <a
            href={process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/banlanzs/web-status"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex rounded-full bg-white/20 p-1.5 sm:p-2 text-white transition hover:bg-white/30"
            aria-label="GitHub"
          >
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                clipRule="evenodd"
              />
            </svg>
          </a>
          {/* Auth Button */}
          {isProtectionEnabled ? (
            <button
              onClick={() => {
                if (isLoggedIn) {
                  logout();
                } else {
                  onRequestLogin?.();
                }
              }}
              className={`flex rounded-full p-1.5 sm:p-2 transition ${
                isLoggedIn 
                  ? "bg-red-500/80 text-white hover:bg-red-600/80" 
                  : "bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
              }`}
              aria-label={isLoggedIn ? t("auth.logout") : t("auth.loginTitle")}
              title={isLoggedIn ? t("auth.logout") : t("auth.loginTitle")}
            >
              {isLoggedIn ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
