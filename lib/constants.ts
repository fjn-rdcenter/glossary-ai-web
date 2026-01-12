export const SUPPORTED_LANGUAGES = [
  { code: "vn", name: "Vietnamese" },
  { code: "en", name: "English" },
  { code: "jp", name: "Japanese" },
] as const;

export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGES[number]["code"];
