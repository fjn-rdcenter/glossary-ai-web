import { cn } from "@/lib/utils"
import Image from "next/image"
import GlossaryLogo from "@/public/glossaryai-logo.svg"
import GlossaryLogoWithText from "@/public/glossaryai-logo-with-text.svg"

interface LogoProps {
  className?: string
  imageClassName?: string
  size?: "sm" | "md" | "lg"
  variant?: "icon" | "full"
}

const logoSizes = {
  sm: "h-28 w-auto",
  md: "h-48 w-auto",
  lg: "h-56 w-auto",
}

const textSizes = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-7xl",
}

export function Logo({ className, imageClassName, size = "lg", variant = "icon" }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src={variant === "full" ? GlossaryLogoWithText : GlossaryLogo}
        className={cn(
          logoSizes[size],
          "shrink-0",
          imageClassName
        )}
        alt="GlossaryAI Logo"
        aria-hidden
        loading="eager"
        priority
      />

      {variant === "icon" && (
        <span
          className={cn(
            "font-serif font-semibold tracking-tight",
            textSizes[size]
          )}
        >
          <span className="text-[#203658]">Glossary</span>
          <span className="text-[#f16518]">AI</span>
        </span>
      )}
    </div>
  )
}
