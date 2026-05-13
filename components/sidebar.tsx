"use client"

import { Link, useRouter, usePathname } from "@/i18n/routing"
import { LayoutDashboard, FileText, BookOpen, History, LogOut, PlayCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { AuthService } from "@/api/services"
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useTranslations, useLocale } from 'next-intl';
import { LanguageSwitcher } from "@/components/language-switcher"
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/translate", label: "Translate", icon: FileText },
  { href: "/dashboard/glossaries", label: "Glossaries", icon: BookOpen },
  { href: "/dashboard/history", label: "History", icon: History },
  { href: "/user-guidance", label: "User Guidance", icon: PlayCircle },
]

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { setOpenMobile, setOpen, isMobile } = useSidebar()
  const trml = useTranslations("Sidebar");
  const locale = useLocale();

  const localeDisplayMap: Record<string, { flag: string; label: string }> = {
    en: { 
      flag: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1ec-1f1e7.svg", 
      label: "English" 
    },
    vi: { 
      flag: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1fb-1f1f3.svg", 
      label: "Tiếng Việt" 
    },
    ja: { 
      flag: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1ef-1f1f5.svg", 
      label: "日本語" 
    },
  };
  const localeDisplay = localeDisplayMap[locale] ?? {
    flag: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f310.svg",
    label: locale.toUpperCase(),
  };

  const handleLogout = async () => {
    setOpenMobile(false);
    await AuthService.logout();
    router.push("/login");
  };

  const handleCloseSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  return (
    <SidebarUI 
      side="right" 
      className="bg-sidebar border-l border-sidebar-border text-sidebar-foreground"
    >
      <SidebarHeader className="px-6 py-4">
        <Button onClick={handleCloseSidebar} className="absolute top-4 right-4"> <X className="w-5 h-5" /></Button>
      </SidebarHeader>

      <SidebarContent className="py-6 px-3">
        <SidebarMenu className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )}
                  onClick={() => setOpenMobile(false)}
                >
                  <Link href={item.href}>
                    <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/70")} />
                    <span>{trml(item.label) ?? item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <SidebarMenu className="space-y-1">
          <SidebarMenuItem>
            <LanguageSwitcher align="end" asChild>
              <SidebarMenuButton
                id="sidebar-language-switcher"
                className="w-full flex items-center gap-3 justify-start px-3 py-2.5 h-auto text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-2xl"
              >
                <span className="w-5 h-5 shrink-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
                  <img 
                    src={localeDisplay.flag} 
                    alt={localeDisplay.label}
                    className="w-full h-auto object-cover" // Giúp ảnh phẳng và lấp đầy khung
                  />
                </span>
                <span>{localeDisplay.label}</span>
              </SidebarMenuButton>
            </LanguageSwitcher>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="w-full flex items-center gap-3 justify-start px-3 py-2.5 h-auto text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 group rounded-2xl"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 shrink-0 transition-colors group-hover:text-red-400" />
              <span>{trml("signOut")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarUI>
  )
}
