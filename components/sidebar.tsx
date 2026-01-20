"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { LayoutDashboard, FileText, BookOpen, History, LogOut, Globe } from "lucide-react"
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
      className="dark border-l border-zinc-800 text-white [--sidebar:oklch(0.145_0_0)] [--sidebar-foreground:oklch(0.985_0_0)] [--sidebar-border:oklch(0.269_0_0)] [--sidebar-accent:oklch(0.269_0_0)]"
    >
      <SidebarHeader className="h-16 flex flex-row items-center justify-start p-0 px-5 border-b border-zinc-800/50 gap-0">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setOpenMobile(false)}>
          <Logo size="sm" className="[&_span]:text-white [&_path]:stroke-white shrink-0" />
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/10 text-white hover:bg-white/15"
                      : "text-zinc-400 hover:text-white hover:bg-white/5",
                  )}
                  onClick={() => setOpenMobile(false)}
                >
                  <Link href={item.href}>
                    <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-white" : "text-zinc-400")} />
                    <span>{trml(item.label) ?? item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-zinc-800/50">
        <SidebarMenu className="space-y-1">
          <SidebarMenuItem>
            <LanguageSwitcher align="end" asChild>
              <SidebarMenuButton
                className="w-full flex items-center gap-3 justify-start px-3 py-2.5 h-auto text-zinc-400 hover:text-white hover:bg-white/5"
              >
                <Globe className="w-5 h-5 shrink-0" />
                <span className="uppercase">{locale}</span>
              </SidebarMenuButton>
            </LanguageSwitcher>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="w-full flex items-center gap-3 justify-start px-3 py-2.5 h-auto text-zinc-400 hover:text-white hover:bg-white/5 group"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 shrink-0 transition-colors group-hover:text-white" />
              <span>{trml("signOut")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarUI>
  )
}
