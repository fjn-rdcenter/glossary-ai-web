import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'vi', 'ja'],
  defaultLocale: 'vi',
  localeDetection: true,
  localePrefix: 'always'
});

export const {Link, redirect, usePathname, useRouter} = createNavigation(routing);

export type AppLocale = (typeof routing.locales)[number];

export function getBrowserLocale(acceptLanguage: string | null): AppLocale {
  const supportedLocales = new Set<string>(routing.locales);
  const requestedLocales = (acceptLanguage ?? "")
    .split(",")
    .map((value) => {
      const [language, ...parameters] = value.trim().split(";");
      const quality = Number(parameters.find((parameter) => parameter.trim().startsWith("q="))?.trim().slice(2) ?? 1);

      return {language, quality};
    })
    .sort((a, b) => b.quality - a.quality);

  for (const {language} of requestedLocales) {
    const locale = language.split("-")[0].toLowerCase();

    if (supportedLocales.has(locale)) return locale as AppLocale;
  }

  return routing.defaultLocale;
}
