export type DisplayLocale = "en" | "vi" | "ja";
type NormalizedLanguageCode = "vn" | "en" | "jp";

const languageNames: Record<NormalizedLanguageCode, Record<DisplayLocale, string>> = {
  vn: {vi: "Tiếng Việt", en: "Vietnamese", ja: "ベトナム語"},
  en: {vi: "Tiếng Anh", en: "English", ja: "英語"},
  jp: {vi: "Tiếng Nhật", en: "Japanese", ja: "日本語"},
};

const languageFlags: Record<NormalizedLanguageCode, string> = {
  vn: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1fb-1f1f3.svg",
  en: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1ec-1f1e7.svg",
  jp: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1ef-1f1f5.svg",
};

export function normalizeLanguageCode(language: string): NormalizedLanguageCode | null {
  const normalized = language.trim().toLowerCase();

  if (normalized === "vi" || normalized === "vn") return "vn";
  if (normalized === "ja" || normalized === "jp") return "jp";
  if (normalized === "en") return "en";

  return null;
}

export function getLanguageName(language: string, locale: DisplayLocale) {
  const normalized = normalizeLanguageCode(language);

  return normalized ? languageNames[normalized][locale] : language.toUpperCase();
}

export function getLanguageFlag(language: string) {
  const normalized = normalizeLanguageCode(language);

  return normalized ? languageFlags[normalized] : null;
}

export function LanguageDisplay({
  className = "",
  flagClassName = "h-3.5 w-5",
  language,
  locale,
  nameClassName = "",
}: {
  className?: string;
  flagClassName?: string;
  language: string;
  locale: DisplayLocale;
  nameClassName?: string;
}) {
  const flag = getLanguageFlag(language);

  return (
    <span className={"inline-flex min-w-0 items-center gap-2 " + className}>
      {flag ? (
        <img
          alt=""
          aria-hidden="true"
          className={"shrink-0 rounded-[1px] border-[0.5px] border-black/80 object-cover " + flagClassName}
          src={flag}
        />
      ) : null}
      <span className={"truncate " + nameClassName}>{getLanguageName(language, locale)}</span>
    </span>
  );
}
