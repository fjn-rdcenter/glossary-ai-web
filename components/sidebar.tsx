"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { LayoutDashboard, FileText, BookOpen, History, LogOut, Globe, PlayCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"
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
  const { setOpenMobile } = useSidebar()
  const trml = useTranslations("Sidebar");
  const locale = useLocale();

  const handleLogout = async () => {
    setOpenMobile(false);
    await AuthService.logout();
    router.push("/login");
  };

  return (
    <SidebarUI 
      side="right" 
      className="bg-sidebar border-l border-sidebar-border text-sidebar-foreground"
    >
      <SidebarHeader className="h-24 flex flex-row items-center justify-center p-0 border-b border-sidebar-border gap-0">
        <Link href="/dashboard" className="flex items-center justify-center gap-2 w-full" onClick={() => setOpenMobile(false)}>
          <Logo size="md" variant="full" className="shrink-0 text-sidebar-foreground" imageClassName="bg-[#e0f7fa] rounded-md p-2" />
        </Link>
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
                <Globe className="w-5 h-5 shrink-0" />
                <span className="uppercase">{locale}</span>
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
