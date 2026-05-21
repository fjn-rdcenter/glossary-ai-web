import { FileConfigState } from "../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Settings, Trash2, FileText, FileSpreadsheet, File, ArrowRight, Plus, BookOpen, X, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AddFileDialog } from "@/components/add-file-dialog";

interface MultiFileOverviewProps {
  files: FileConfigState[];
  activeFileId: string | null;
  onSetupFile: (id: string) => void;
  onRemoveFile?: (id: string) => void;
  onAddFiles?: (files: Array<{ documentId: string; metadata: { name: string; size: number; type: string } }>) => void;
  onStartAll: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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

export function MultiFileOverview({
  files,
  activeFileId,
  onSetupFile,
  onRemoveFile,
  onAddFiles,
  onStartAll
}: MultiFileOverviewProps) {
  const trmlCommon = useTranslations("Common");
  const trmlTranslate = useTranslations("Translate");
  const trmlTranslationExecution = useTranslations("TranslationExecution");
  const [addFileDialogOpen, setAddFileDialogOpen] = useState(false);

  const handleFilesAdded = (newFiles: Array<{ documentId: string; metadata: { name: string; size: number; type: string } }>) => {
    onAddFiles?.(newFiles);
  };

  return (
    <Card className="h-full flex flex-col w-full shadow-md border-border gap-0">
      <CardHeader className="shrink-0">
        <CardTitle className="text-xl font-semibold flex items-center justify-between">
          <span>{trmlTranslate("configTranslation") || "Config Translation"}</span>
        </CardTitle>
        <CardDescription>
          {trmlTranslate("clickToConfig") || "Click a file below to customize its translation settings"}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col px-4 pb-4">
        {/* Scrollable Files List */}
        {files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border rounded-xl bg-muted/20 my-4">
            <p className="text-sm font-semibold text-foreground">
              {trmlTranslate("noFilesYet") || "No files added yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-[200px]">
              {trmlTranslate("addFilesToStart") || "Add files to start configuring translation"}
            </p>
            <Button onClick={() => setAddFileDialogOpen(true)} size="sm" className="font-semibold shadow-xs">
              <Plus className="w-4 h-4 mr-1.5" />
              {trmlTranslate("addFiles") || "Add Files"}
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
            {files.map((file) => {
              const Icon = getFileIcon(file.metadata.type);
              const extension = getFileExtension(file.metadata.name);
              const isActive = file.id === activeFileId;

              return (
                <div
                  key={file.id}
                  className={cn(
                    "mt-4 p-3 rounded-xl border cursor-pointer select-none group relative overflow-hidden",
                    "transition-all duration-200 ease-out",
                    "hover:-translate-y-0.5 hover:shadow-md",
                    isActive
                      ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/30 font-bold"
                      : "bg-background border-border hover:border-primary/40 hover:bg-muted/30"
                  )}
                  onClick={() => onSetupFile(file.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left section: Icon and file details */}
                    <div className="flex items-start gap-3 flex-1 min-w-0 rounded-xl px-1 py-0.5 transition-colors">
                      {/* File Icon */}
                      <div className="relative flex-shrink-0 mt-0.5">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md scale-105"
                            : "bg-primary/10 text-primary group-hover:bg-primary/20"
                        )}>
                          <Icon className={cn("transition-all", isActive ? "w-5.5 h-5.5" : "w-5 h-5")} />
                        </div>
                        <div className={cn(
                          "absolute -bottom-1.5 -right-1.5 px-1 py-0.2 rounded-md text-[8px] shadow-sm border transition-colors",
                          isActive
                            ? "bg-foreground text-background border-primary"
                            : "bg-primary text-primary-foreground border-background"
                        )}>
                          {extension}
                        </div>
                      </div>

                      {/* File Info & Configuration summary */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <p className={cn(
                          "text-sm truncate leading-tight transition-colors",
                          isActive
                            ? "text-primary"
                            : "font-medium text-foreground group-hover:text-primary"
                        )}>
                          {file.metadata.name}
                        </p>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          {formatFileSize(file.metadata.size)}
                        </span>

                        {/* Config summary badges if configured */}

                        <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                          {/* 1. Languages */}
                          <span className="px-1.5 py-0.5 rounded border tracking-wider transition-colors bg-background/20 border-primary/20">
                            {trmlCommon(file.sourceLanguage) || file.sourceLanguage} ➔ {trmlCommon(file.targetLanguage) || file.targetLanguage}
                          </span>

                          {/* 2. Selected glossaries */}
                          <span className={cn(
                            "px-1.5 py-0.5 rounded border tracking-wider transition-colors flex items-center gap-1",
                            file.selectedGlossaries.length > 0
                              ? "bg-background/20 border-primary/20 text-foreground"
                              : "bg-background/80 border-slate-200 text-muted-foreground"
                          )}>
                            <BookOpen className="w-3 h-3 flex-shrink-0" />
                            <span>
                              {trmlTranslate("glossaryUsed", { count: file.selectedGlossaries.length }) || `Glossary: ${file.selectedGlossaries.length}`}
                            </span>
                          </span>

                          {/* 3. Translate image */}
                          {file.translateImages && (
                            <span className="px-1.5 py-0.5 rounded border border-primary/20 tracking-wider transition-colors flex items-center gap-1.5">
                              <div className="flex items-center gap-1">
                                <span>{trmlTranslate("translateImages") || "Images"}</span>
                              </div>
                              <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right section: Status & Trash Action */}
                    <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>

                      {onRemoveFile && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-7 w-7 transition-all duration-200",
                            "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                            isActive && "hover:bg-destructive hover:text-destructive-foreground"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFile(file.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Start Button anchored at the bottom */}
        {files.length > 0 && (
          <div className="pt-3 border-t mt-4 shrink-0 space-y-2">
            {files.length < 5 && (
              <Button
                onClick={() => setAddFileDialogOpen(true)}
                variant="outline"
                className="w-full gap-2 py-5 text-sm font-semibold"
              >
                <Plus className="w-4 h-4" />
                {trmlTranslate("addMoreFiles") || "Add More Files"}
              </Button>
            )}
            <Button onClick={onStartAll} className="w-full gap-2 py-5 text-sm font-semibold shadow-sm">
              {trmlTranslationExecution("startTranslating") || "Start Translating"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>

      <AddFileDialog
        open={addFileDialogOpen}
        onOpenChange={setAddFileDialogOpen}
        maxFiles={5}
        currentFileCount={files.length}
        onFilesAdded={handleFilesAdded}
      />
    </Card>
  );
}
