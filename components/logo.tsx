import { cn } from "@/lib/utils"
import LOGO_RD from "@/public/rd-center-logo.png";
import Image from "next/image";

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src={LOGO_RD}
        alt="Logo"
        className={cn("object-contain", sizes[size])}
      />
      <span
        className={cn(
          "font-serif font-semibold tracking-tight text-foreground",
          size === "sm" && "text-lg",
          size === "md" && "text-xl",
          size === "lg" && "text-2xl",
        )}
      >
        TranslateSphere
      </span>
    </div>
  )
}
