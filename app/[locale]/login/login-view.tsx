"use client";

import Image from "next/image";
import type {FormEvent} from "react";
import {useEffect, useState} from "react";
import {AlertCircle, LoaderCircle} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {AuthService} from "@/api";
import {usePathname, useRouter} from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
  {
    code: "en",
    label: "English",
    short: "EN",
    flag: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1ec-1f1e7.svg",
  },
  {
    code: "vi",
    label: "Vietnamese",
    short: "VI",
    flag: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1fb-1f1f3.svg",
  },
  {
    code: "ja",
    label: "Japanese",
    short: "JA",
    flag: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1ef-1f1f5.svg",
  },
] as const;

const publicAssetPath = (path: `/${string}`) => {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/new";

  return `${basePath}${path}`;
};

type AppLocale = (typeof languages)[number]["code"];

export function LoginView() {
  const t = useTranslations("Login");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentLanguage =
    languages.find((language) => language.code === locale) ?? languages[0];

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const wasLoggedOut = localStorage.getItem("user_logged_out") === "true";

        if (!token || wasLoggedOut) {
          if (isMounted) setIsRestoringSession(false);
          return;
        }

        await AuthService.getCurrentUser();
        if (isMounted) router.replace("/dashboard");
      } catch {
        if (isMounted) setIsRestoringSession(false);
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUsername = username.trim();

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await AuthService.login({
        username: normalizedUsername,
        password,
      });

      localStorage.setItem("glossaryai_username", normalizedUsername);
      router.replace("/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message ? error.message : t("loginError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLanguageChange = (nextLocale: AppLocale) => {
    if (nextLocale !== locale) {
      router.replace(pathname, {locale: nextLocale});
    }
  };

  if (isRestoringSession) {
    return (
      <div className="login-shell relative isolate grid min-h-dvh place-items-center overflow-hidden text-[#1f2537]">
        <div aria-hidden="true" className="login-background-orbs">
          <span className="login-orb login-orb-primary" />
          <span className="login-orb login-orb-accent" />
          <span className="login-orb login-orb-soft" />
        </div>
        <div
          aria-label={t("restoringSession")}
          className="relative z-10 grid size-14 place-items-center rounded-full border border-white/70 bg-white/80 text-[#21175c] shadow-[0_16px_40px_rgba(33,23,92,0.14)] backdrop-blur-md"
          role="status"
        >
          <LoaderCircle aria-hidden="true" className="size-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell relative flex min-h-dvh overflow-hidden flex-col justify-between text-[#1f2537]">
      <div aria-hidden="true" className="login-background-orbs">
        <span className="login-orb login-orb-primary" />
        <span className="login-orb login-orb-accent" />
        <span className="login-orb login-orb-soft" />
      </div>

      {errorMessage ? (
        <div className="pointer-events-none fixed left-1/2 top-6 z-50 w-[calc(100%-2rem)] max-w-[520px] -translate-x-1/2" role="alert">
          <div className="content-reveal flex items-start gap-3 rounded-[7px] border border-[#f2aaa4] bg-[#fff5f3]/95 px-4 py-3 text-[#a5271d] shadow-[0_14px_36px_rgba(126,37,27,0.16)] backdrop-blur-md">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p className="min-w-0 text-[13px] font-medium leading-5">{errorMessage}</p>
          </div>
        </div>
      ) : null}

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-8 sm:px-10 lg:px-14">
        <div className="grid w-full max-w-[1360px] items-center justify-center gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-32 xl:gap-48 2xl:gap-64">
          <section className="flex -translate-y-6 flex-col items-center justify-center text-center sm:-translate-y-8 lg:-translate-y-10 lg:justify-self-center lg:pr-8 xl:-translate-y-12 xl:pr-12 2xl:pr-16">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <Image
                alt="GlossaryAI symbol"
                className="h-auto w-[175px] max-w-full sm:w-[195px] lg:w-[205px]"
                height={500}
                priority
                src={publicAssetPath("/glossaryai-logo.svg")}
                width={500}
              />
              <p className="login-brand-wordmark text-[50px] font-normal leading-none tracking-[-0.04em] text-[#253858] sm:text-[56px] lg:text-[62px]">
                <span>Glossary</span>
                <span className="text-[#ee7822]">AI</span>
              </p>
            </div>

            <p className="login-brand-tagline relative z-10 -mt-8 whitespace-nowrap p-0 text-[20px] font-medium leading-8 text-[#21175c] sm:-mt-10 sm:text-[22px] lg:-mt-12 2xl:text-[26px]">
              {t.rich("brandTagline", {
                highlight: (chunks) => (
                  <span className="text-[#ee7822]">{chunks}</span>
                ),
              })}
            </p>
          </section>

          <section className="flex justify-center md:justify-end">
            <div
              className="login-card relative isolate w-full max-w-[420px] overflow-hidden rounded-lg border border-[#c9c4d1] bg-white px-8 py-10 sm:px-9"
              data-testid="login-card"
            >
              <svg
                aria-hidden="true"
                className="login-card-border"
                preserveAspectRatio="none"
                viewBox="0 0 420 520"
              >
                <rect className="login-card-border-line login-card-border-line-primary" height="518" pathLength="100" rx="8" width="418" x="1" y="1" />
                <rect className="login-card-border-line login-card-border-line-accent" height="518" pathLength="100" rx="8" width="418" x="1" y="1" />
              </svg>

              <header className="mb-8 flex justify-center">
                <Image
                  alt="AI Innovation Center"
                  className="h-auto w-[240px] max-w-full"
                  height={89}
                  priority
                  src={publicAssetPath("/aiic-logo.png")}
                  width={240}
                />
              </header>

              <form className="space-y-7" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-2 block text-[14px] font-medium text-[#1f2537]" htmlFor="username">
                    {t("usernameLabel")}
                  </label>
                  <input
                    autoComplete="username"
                    className="login-line-input"
                    id="username"
                    name="username"
                    onChange={(event) => {
                      setUsername(event.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder={t("usernamePlaceholder")}
                    required
                    type="text"
                    value={username}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-medium text-[#1f2537]" htmlFor="password">
                    {t("passwordLabel")}
                  </label>
                  <input
                    autoComplete="current-password"
                    className="login-line-input"
                    id="password"
                    name="password"
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder={t("passwordPlaceholder")}
                    required
                    type="password"
                    value={password}
                  />
                </div>

                <button
                  className="login-submit-button flex h-[60px] w-full items-center justify-center rounded-[6px] px-6 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  type="submit"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {isSubmitting ? (
                      <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
                    ) : (
                      t("signIn")
                    )}
                  </span>
                </button>
              </form>

              <div className="mt-5 flex justify-center border-t border-[#c9c4d1] pt-5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label={t("languageMenu")}
                      className="flex h-6 items-center gap-1.5 rounded px-0 text-[13px] font-medium text-[#6b778d] transition-colors hover:text-[#ee7822] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21175c]"
                      data-testid="language-menu-trigger"
                      type="button"
                    >
                      <img
                        alt=""
                        aria-hidden="true"
                        className="h-3.5 w-5 rounded-[1px] object-contain"
                        src={currentLanguage.flag}
                      />
                      <span className="leading-none">
                        {currentLanguage.short}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-20 bg-white text-[#1f2537]">
                    {languages.map((language) => (
                      <DropdownMenuItem
                        className="justify-center gap-2 text-sm focus:bg-[#f6f1ff] focus:text-[#21175c]"
                        key={language.code}
                        onSelect={() => handleLanguageChange(language.code)}
                      >
                        <img
                          alt=""
                          aria-hidden="true"
                          className="h-3.5 w-5 rounded-[1px] object-contain"
                          src={language.flag}
                        />
                        <span className="w-6 text-xs font-medium leading-none text-[#6b778d]">
                          {language.short}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/45 bg-white/30 px-6 py-3 text-center backdrop-blur-md">
        <p className="text-[12px] font-medium tracking-[0.01em] text-[#3d3a45]">
          {t("copyright")}
        </p>
      </footer>
    </div>
  );
}
