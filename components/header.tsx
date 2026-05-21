"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePathname } from "@/i18n/routing"
import { Search, LogOut, BookOpen, History, PlayCircle, BellRing } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Logo } from "@/components/logo"
import { useUser } from "@/components/contexts/user-context"
import { AuthService, releaseNotesService, ReleaseNote } from "@/api/services"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { ReleaseNotesDialog } from "@/components/release-notes-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cn } from "@/lib/utils";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();

  const displayUser = user || { username: "Guest" };
  // Remove @fujinet.net suffix if present
  const username = displayUser.username.replace("@fujinet.net", "");

  const handleLogout = async () => {
    await AuthService.logout();
    router.push("/login");
  };

  const trml = useTranslations("Header");

  const [releases, setReleases] = useState<ReleaseNote[]>([]);
  const [latestRead, setLatestRead] = useState<string>("");
  const [hasNewRelease, setHasNewRelease] = useState(false);

  useEffect(() => {
    if (user) {
      releaseNotesService.getReleaseNotes().then(data => {
        setReleases(data.releases);
        setLatestRead(data.latest_read_release);

        if (data.releases.length > 0 && data.releases[0].version !== data.latest_read_release) {
          setHasNewRelease(true);
        }
      }).catch(err => {
        console.error("Failed to fetch release notes", err);
      });
    }
  }, [user]);

  const handleReleaseNotesOpened = () => {
    if (hasNewRelease && releases.length > 0) {
      const latestVersion = releases[0].version;
      setHasNewRelease(false);
      setLatestRead(latestVersion);
      releaseNotesService.markAsRead(latestVersion).catch(console.error);
    }
  };

  const navItems = [
    { href: "/dashboard/glossaries", label: "Glossaries", icon: BookOpen },
    { href: "/dashboard/history", label: "History", icon: History },
    { href: "/user-guidance", label: "User Guidance", icon: PlayCircle },
    { href: "/release-notes", label: "Release Notes", icon: BellRing },
  ];

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-8">
        {/* Logo - Back to Dashboard */}
        <Link href="/dashboard" className="shrink-0 transition-opacity hover:opacity-80">
          <Logo size="sm" />
        </Link>
      </div>

      <div className="flex items-center gap-6">
        <nav className="hidden md:flex items-center gap-6">
          <TooltipProvider>
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

              if (item.href === "/release-notes") {
                return (
                  <Tooltip key={item.href}>
                    <ReleaseNotesDialog
                      title={trml(item.label) ?? item.label}
                      releases={releases}
                      onOpen={handleReleaseNotesOpened}
                    >
                      <TooltipTrigger asChild>
                        <button className={cn("relative text-sm font-medium flex items-center gap-2 transition-colors", isActive ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                          <item.icon className="w-5 h-5" />
                          {hasNewRelease && (
                            <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                          )}
                        </button>
                      </TooltipTrigger>
                    </ReleaseNotesDialog>
                    <TooltipContent>
                      <p>{trml(item.label) ?? item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link href={item.href} className={cn("text-sm font-medium flex items-center gap-2 transition-colors", isActive ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                      <item.icon className="w-5 h-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{trml(item.label) ?? item.label}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </TooltipProvider>
        </nav>

        <div className="flex items-center gap-3 pl-4 md:border-l border-border">
          <LanguageSwitcher />

          <div className="text-right hidden sm:block ml-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              {trml("welcome")}
            </p>
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
                {trml("signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
