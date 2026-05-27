"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  className,
  align = "center",
  asChild = false,
  children,
  id
}: {
  className?: string;
  align?: "start" | "center" | "end";
  asChild?: boolean;
  children?: React.ReactNode;
  id?: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return;
    router.replace(pathname, { locale: newLocale });
    router.refresh();
  };

  const localeDisplayMap: Record<string, { flag: string }> = {
    en: { flag: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1ec-1f1e7.svg" },
    vi: { flag: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1fb-1f1f3.svg" },
    ja: { flag: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1ef-1f1f5.svg" },
  };

  const currentFlag = localeDisplayMap[locale]?.flag ?? "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f310.svg";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={asChild || !children}>
        {children ? children : (
          <Button
            id={id}
            variant="ghost"
            size="sm"
            className={cn(
              "gap-2 font-normal text-slate-500 hover:text-slate-900 transition-colors",
              className
            )}
          >
            <span className="w-5 h-5 shrink-0 flex items-center justify-center overflow-hidden rounded-sm">
              <img src={currentFlag} alt={locale} className="w-full h-auto object-cover" />
            </span>
            <span className="uppercase">{locale}</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuItem
          onClick={() => handleLanguageChange("en")}
          className="gap-2 cursor-pointer"
        >
          <span className="w-4 h-4 shrink-0 flex items-center justify-center overflow-hidden rounded-sm">
            <img src={localeDisplayMap["en"].flag} alt="en" className="w-full h-auto object-cover" />
          </span>
          <span className="flex-1">English</span>
          <span className="w-4">
            {locale === "en" && <Check className="w-3 h-3" />}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange("vi")}
          className="gap-2 cursor-pointer"
        >
          <span className="w-4 h-4 shrink-0 flex items-center justify-center overflow-hidden rounded-sm">
            <img src={localeDisplayMap["vi"].flag} alt="vi" className="w-full h-auto object-cover" />
          </span>
          <span className="flex-1">Tiếng Việt</span>
          <span className="w-4">
            {locale === "vi" && <Check className="w-3 h-3" />}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange("ja")}
          className="gap-2 cursor-pointer"
        >
          <span className="w-4 h-4 shrink-0 flex items-center justify-center overflow-hidden rounded-sm">
            <img src={localeDisplayMap["ja"].flag} alt="ja" className="w-full h-auto object-cover" />
          </span>
          <span className="flex-1">日本語</span>
          <span className="w-4">
            {locale === "ja" && <Check className="w-3 h-3" />}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
