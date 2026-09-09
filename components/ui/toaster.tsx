"use client";

import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const variant = props.variant;
        return (
          <Toast key={id} {...props}>
            <div className="flex gap-3 w-full">
              {variant === "success" && (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              )}
              {variant === "destructive" && (
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              )}

              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />

            {/* Countdown Progress Bar - 3 seconds */}
            <div className="absolute bottom-0 left-0 h-1 w-full bg-black/5 dark:bg-white/10">
              <div
                className={cn(
                  "h-full w-full origin-left animate-[toast-progress_3s_linear_forwards]",
                  variant === "success" && "bg-green-500",
                  variant === "destructive" && "bg-destructive",
                  !variant && "bg-primary"
                )}
              />
            </div>
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
