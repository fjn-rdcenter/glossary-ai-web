"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, LogOut } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Logo } from "@/components/logo"
import { AuthService } from "@/api/services"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTranslations } from 'next-intl';
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Menu } from "lucide-react"

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await AuthService.getCurrentUser();
        if (userData) {
           setUser(userData);
        }
      } catch (error) {
        console.error("Failed to fetch user", error);
      }
    };
    fetchUser();
  }, []);

  const displayUser = user || { username: "Guest" };
  // Remove @fujinet.net suffix if present
  const username = displayUser.username.replace("@fujinet.net", "");

  const handleLogout = async () => {
      await AuthService.logout();
      router.push("/login");
  };

  const trml = useTranslations("Header");

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4 w-full max-w-md">
        {/* Logo - Back to Dashboard */}
        <Link href="/dashboard" className="shrink-0 transition-opacity hover:opacity-80">
          <Logo size="sm" />
        </Link>

        {/* <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={trml("searchPlaceholder")}
            className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
          />
        </div> */}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{trml("welcome")}</p>
          <p className="text-sm font-medium leading-tight">{username}</p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground">{username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{username}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <SidebarTrigger className="-mr-2 ml-1">
          <Menu className="h-5 w-5" />
        </SidebarTrigger>
      </div>
    </header>
  )
}
