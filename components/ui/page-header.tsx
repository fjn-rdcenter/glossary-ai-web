"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backUrl?: string;
  onRefresh?: () => void;
  refreshLoading?: boolean;
  refreshLabel?: string;
  children?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  backUrl,
  onRefresh,
  refreshLoading = false,
  refreshLabel = "Refresh",
  children,
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="flex items-start gap-3">
        {backUrl && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(backUrl)}
            className="mt-1 shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-serif font-semibold text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshLoading}
            className={children ? "mr-2" : ""}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshLoading ? "animate-spin" : ""}`} />
            {refreshLabel}
          </Button>
        )}
        {children}
      </div>
    </div>
  );
}
