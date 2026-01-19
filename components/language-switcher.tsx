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
  children
}: { 
  className?: string;
  align?: "start" | "center" | "end";
  asChild?: boolean;
  children?: React.ReactNode;
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={asChild || !children}>
        {children ? children : (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-3 font-normal text-slate-500 hover:text-slate-900 transition-colors",
              className
            )}
          >
            <Globe className="w-5 h-5 shrink-0" />
            <span className="uppercase">{locale}</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuItem
          onClick={() => handleLanguageChange("en")}
          className="gap-2"
        >
          <span className="w-4">
            {locale === "en" && <Check className="w-3 h-3" />}
          </span>
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange("vi")}
          className="gap-2"
        >
          <span className="w-4">
            {locale === "vi" && <Check className="w-3 h-3" />}
          </span>
          Tiếng Việt
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange("ja")}
          className="gap-2"
        >
          <span className="w-4">
            {locale === "ja" && <Check className="w-3 h-3" />}
          </span>
          日本語
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
