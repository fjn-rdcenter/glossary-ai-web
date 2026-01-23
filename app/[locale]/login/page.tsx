"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { AuthService } from "@/api";
import { toast } from "sonner";
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from "@/components/language-switcher";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trml = useTranslations("Login");

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if user explicitly logged out
        if (localStorage.getItem("user_logged_out")) {
           console.log("User explicitly logged out, skipping auto-check.");
           setIsChecking(false);
           return;
        }

        await AuthService.refreshToken();
        router.push("/dashboard");
        return; 
      } catch (error) {
        console.log("Session check failed:", error);
        // Clean up potential stale data if needed
        localStorage.removeItem("auth_token");
      } finally {
        // Always stop checking to show form if we didn't redirect
        // Note: if router.push is called, component might unmount, 
        // but setting state is fine if we are still here.
        setIsChecking(false);
      }
    };

    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Set to false when you want to test real authentication
    const DEV_BYPASS_AUTH = false;

    if (DEV_BYPASS_AUTH && process.env.NODE_ENV === "development") {
      console.log("🔓 DEV MODE: Bypassing authentication");
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push("/dashboard");
      return;
    }

    try {
      const result = await AuthService.login({
        username,
        password,
      });

      setErrorMessage(null);
      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : trml("loginError"));
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full"
          />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f6fc] p-4">
      {/* Top Section - Logo */}
      <div className="flex justify-center pt-8 md:pt-12">
        <Logo size="lg" />
      </div>

      {/* Middle Section - Sign In Box */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-[560px] space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {trml("signIn")}
            </h1>
          </div>

          {/* Login Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-700">
                    {trml("usernameLabel")}
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder={trml("usernamePlaceholder")}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMessage) setErrorMessage(null); // Clear error when typing
                    }}
                    className="h-10 bg-white border-slate-300 focus-visible:ring-slate-400"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-700">
                      {trml("passwordLabel")}
                    </Label>
                    {/* <button
                      type="button"
                      tabIndex={-1}
                      className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      {t("forgotPassword")}
                    </button> */}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={trml("passwordPlaceholder")}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null); // Clear error when typing
                      }}
                      className="h-10 pr-10 bg-white border-slate-300 focus-visible:ring-slate-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                      className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                    />
                  ) : (
                    trml("signIn")
                  )}
                </Button>

                {/* Error Message */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3 text-center"
                  >
                    {errorMessage}
                  </motion.div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Section - Footer & Language */}
      <div className="mt-auto flex flex-col items-center gap-4 py-8">
        <LanguageSwitcher id="login-language-switcher" />
        <p className="text-center text-xs text-slate-400">{trml("footer")}</p>
      </div>
    </div>
  );
}
