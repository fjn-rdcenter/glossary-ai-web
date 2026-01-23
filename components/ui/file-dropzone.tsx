"use client";

import { useCallback } from "react";
import { useDropzone, DropzoneOptions } from "react-dropzone";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface FileDropzoneProps extends Omit<DropzoneOptions, "onDrop"> {
  onFileSelect: (file: File) => void;
  className?: string;
  dropMessage?: string;
  acceptMessage?: string;
}

export function FileDropzone({
  onFileSelect,
  className,
  dropMessage,
  acceptMessage,
  ...props
}: FileDropzoneProps) {
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
        "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[200px]",
        isDragActive
          ? "border-primary bg-primary/5 scale-[0.99]"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
        isDragReject && "border-destructive bg-destructive/5",
        className
      )}
    >
      <input {...getInputProps()} />
      
      <div className={cn("rounded-full p-4 mb-4 transition-colors", 
          isDragActive ? "bg-primary/10" : "bg-muted" 
      )}>
        {isDragReject ? (
             <AlertCircle className="w-8 h-8 text-destructive" />
        ) : isDragActive ? (
             <Upload className="w-8 h-8 text-primary animate-bounce" />
        ) : (
             <FileText className="w-8 h-8 text-muted-foreground" />
        )}
      </div>

      <div className="space-y-1">
        <p className={cn("text-sm font-medium transition-colors", isDragActive ? "text-primary" : "text-foreground")}>
          {isDragActive 
            ? (dropMessage || trmlGlossaries("dropToUpload") || "Drop file to upload") 
            : (dropMessage || trmlGlossaries("dragAndDropOrClick") || "Drag & drop or click to select")}
        </p>
        <p className="text-xs text-muted-foreground">
          {acceptMessage || trmlGlossaries("supportedFormats") || "Supports .txt, .csv"}
        </p>
      </div>
    </div>
  );
}
