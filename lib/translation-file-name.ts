const targetLanguagePrefixes = {
  en: "EN",
  ja: "JP",
  jp: "JP",
  vi: "VN",
  vn: "VN",
} as const;

export function getTranslatedFileName(sourceFileName: string, targetLanguage: string) {
  const normalizedLanguage = targetLanguage.trim().toLowerCase();
  const prefix =
    targetLanguagePrefixes[normalizedLanguage as keyof typeof targetLanguagePrefixes] ||
    normalizedLanguage.toUpperCase() ||
    "TRANSLATED";

  return prefix + "_" + sourceFileName;
}
