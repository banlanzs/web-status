"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { language, setLanguage, availableLanguages } = useLanguage();

  return (
    <div className="flex items-center gap-2 rounded-full bg-white/20 px-2 py-1 text-sm text-white shadow-soft backdrop-blur">
      {availableLanguages.map((item) => (
        <button
          key={item.code}
          type="button"
          onClick={() => setLanguage(item.code)}
          className={cn(
            "rounded-full px-3 py-1 transition",
            item.code === language
              ? "bg-white text-emerald-600 shadow"
              : "text-white/80 hover:bg-white/20",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

