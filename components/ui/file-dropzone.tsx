"use client";

import React, { useCallback } from "react";
import { useDropzone, DropzoneOptions } from "react-dropzone";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface FileDropzoneProps extends Omit<DropzoneOptions, "onDrop"> {
  onFileSelect: (file: File) => void;
  className?: string;
  dropMessage?: string;
  acceptMessage?: string;
  instructionMessage?: React.ReactNode;
}

export function FileDropzone({
  onFileSelect,
  className,
  dropMessage,
  acceptMessage,
  instructionMessage,
  footer,
  ...props
}: FileDropzoneProps & { footer?: React.ReactNode }) {
  const trmlGlossaries = useTranslations("Glossaries");

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
      onDrop,
      multiple: false,
      ...props,
    });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[220px] bg-white hover:bg-slate-50",
        isDragActive
          ? "border-primary bg-primary/5 scale-[0.99]"
          : "border-muted-foreground/25 hover:border-primary/50",
        isDragReject && "border-destructive bg-destructive/5",
        className
      )}
    >
      <input {...getInputProps()} />

      <div
        className={cn(
          "rounded-full p-3 mb-3 transition-colors bg-secondary/50",
          isDragActive && "bg-primary/10",
        )}
      >
        {isDragReject ? (
          <AlertCircle className="w-6 h-6 text-destructive" />
        ) : (
          <Upload
            className={cn(
              "w-6 h-6 text-muted-foreground",
              isDragActive && "text-primary animate-bounce",
            )}
          />
        )}
      </div>

      <div className="space-y-1 w-full max-w-sm">
        <p
          className={cn(
            "text-base font-semibold transition-colors",
            isDragActive ? "text-primary" : "text-foreground",
          )}
        >
          {isDragActive
            ? dropMessage || trmlGlossaries("dropToUpload")
            : dropMessage || trmlGlossaries("clickToUpload")}
        </p>

        {/* Instruction / Accept Message */}
        <div className="text-xs text-muted-foreground space-y-3 pt-1">
          {instructionMessage}
        </div>
      </div>
    </div>
  );
}
