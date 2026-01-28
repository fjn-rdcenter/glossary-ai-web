"use client";

import { motion } from "framer-motion";
import {
  FileText,
  FileSpreadsheet,
  File,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileCardProps {
  name: string;
  size: number;
  type: string;
  status?: "idle" | "uploading" | "success" | "error";
  onRemove?: () => void;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
}

function getFileIcon(type: string) {
  if (type.includes("pdf")) return FileText;
  if (
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type.includes("csv")
  )
    return FileSpreadsheet;
  return File;
}

function getFileExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
}

export function FileCard({
  name,
  size,
  type,
  status = "idle",
  onRemove,
  className,
}: FileCardProps) {
  const Icon = getFileIcon(type);
  const extension = getFileExtension(name);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group relative flex items-center gap-4 p-4 rounded-xl bg-card border border-border",
        "shadow-sm hover:shadow-md transition-all duration-300",
        className
      )}
    >
      {/* File Icon/Thumbnail */}
      <div className="relative flex-shrink-0">
        <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary text-primary-foreground">
          {extension}
        </div>
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0 overflow-hidden text-left">
        <p className="font-medium text-foreground truncate" title={name}>
          {name}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {formatFileSize(size)}
        </p>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        {status === "uploading" && (
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        )}
        {status === "success" && (
          <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
            <Check className="w-4 h-4 text-success" />
          </div>
        )}
        {onRemove && status !== "uploading" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className={cn(
              "w-8 h-8 opacity-0 group-hover:opacity-100 transition-all",
              "hover:bg-red-700 hover:text-white"
            )}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
