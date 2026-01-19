"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { LayoutDashboard, FileText, BookOpen, History, LogOut, Menu, X, PlayCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AuthService } from "@/api/services"

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
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = async () => {
    setIsOpen(false);
    await AuthService.logout();
    router.push("/login"); // Use router for client-side nav, or window.location.href to force clean state
  };

  return (
    <>
      {/* Toggle Button - Fixed on right side */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-4 top-4 z-40 bg-zinc-900 text-white p-2 rounded-lg shadow-lg hover:bg-zinc-800 transition-colors"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Slide in from right */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed right-0 top-0 h-screen w-64 bg-zinc-900 text-white flex flex-col border-l border-zinc-800 z-50 shadow-2xl"
          >
            {/* Logo Area */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800/50">
              <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                <Logo size="sm" className="[&_span]:text-white [&_path]:stroke-white shrink-0" />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-white/5",
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-white" : "text-zinc-400")} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-3 border-t border-zinc-800/50">
              <Button
                variant="ghost"
                className="w-full flex items-center gap-3 justify-start text-zinc-400 hover:text-white hover:bg-white/5"
                asChild
              >
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 text-left"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  <span>Sign out</span>
                </button>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
