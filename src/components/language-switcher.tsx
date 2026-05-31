"use client";

import { useLanguage } from "@/components/providers/language-provider";

export function LanguageSwitcher() {
  const { language, setLanguage, availableLanguages } = useLanguage();

  const currentLang = availableLanguages.find((lang) => lang.code === language);
  const nextLang = availableLanguages.find((lang) => lang.code !== language);

  const handleToggle = () => {
    if (nextLang) {
      setLanguage(nextLang.code);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="btn btn-small"
      title={`Switch to ${nextLang?.label}`}
    >
      {currentLang?.label}
    </button>
  );
}
