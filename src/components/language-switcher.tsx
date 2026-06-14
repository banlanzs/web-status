"use client";

import { useLanguage } from "@/components/providers/language-provider";

export function LanguageSwitcher() {
  const { language, setLanguage, availableLanguages } = useLanguage();

  // 获取当前语言和下一个语言
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
      className="flex items-center gap-1 sm:gap-2 rounded-full bg-white/20 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white shadow-soft backdrop-blur transition hover:bg-white/30"
      title={`Switch to ${nextLang?.label}`}
    >
      <svg
        className="h-3 w-3 sm:h-4 sm:w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
      <span className="whitespace-nowrap">{currentLang?.label}</span>
    </button>
  );
}

