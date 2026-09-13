import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { LANG_ENUM } from "@/consts/common";
import { KEY_LANG } from "@/i18n/config";

const LANGUAGES: { label: string; value: string }[] = [
  { label: "VI", value: LANG_ENUM.vi },
  { label: "EN", value: LANG_ENUM.en },
];

const LanguageToggle = () => {
  const { i18n } = useTranslation("shared");
  const [currentLang, setCurrentLang] = useState(i18n.language);

  const handleChange = (lang: string) => {
    if (lang === currentLang) return;

    i18n.changeLanguage(lang);
    localStorage.setItem(KEY_LANG, lang);
    setCurrentLang(lang);
  };

  return (
    <div className="flex items-center gap-1 rounded-md border p-0.5 text-xs font-medium">
      {LANGUAGES.map((lang) => {
        return (
          <button
            key={lang.value}
            type="button"
            onClick={() => handleChange(lang.value)}
            aria-pressed={currentLang === lang.value}
            className={cn(
              "rounded px-2 py-1 transition-colors",
              currentLang === lang.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageToggle;
