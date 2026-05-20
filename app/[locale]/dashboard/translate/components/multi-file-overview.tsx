import { FileConfigState } from "../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Settings, Trash2, FileText, FileSpreadsheet, File, ArrowRight, Plus } from "lucide-react";
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
  isAllConfigured: boolean;
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
  onStartAll,
  isAllConfigured
}: MultiFileOverviewProps) {
  const trmlCommon = useTranslations("Common");
  const trmlTranslate = useTranslations("Translate"); 
  const trmlTranslationExecution = useTranslations("TranslationExecution");
  const [addFileDialogOpen, setAddFileDialogOpen] = useState(false);

  const handleFilesAdded = (newFiles: Array<{ documentId: string; metadata: { name: string; size: number; type: string } }>) => {
    onAddFiles?.(newFiles);
  }; 

  return (
    <Card className="h-full flex flex-col w-full shadow-md border-border">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-xl font-semibold flex items-center justify-between">
          <span>{trmlTranslate("configTranslation") || "Config Translation"}</span>
          <span className="text-xs text-muted-foreground font-normal bg-secondary px-2.5 py-1 rounded-full">
            {files.filter(f => f.configStatus === "configured").length} / {files.length} {trmlCommon("configured") || "done"}
          </span>
        </CardTitle>
        <CardDescription>
          {trmlTranslate("clickToConfig") || "Click a file below to customize its translation settings"}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col p-4 pt-0">
        {/* Scrollable Files List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
          {files.map((file) => {
            const Icon = getFileIcon(file.metadata.type);
            const extension = getFileExtension(file.metadata.name);
            const isActive = file.id === activeFileId;
            const isConfigured = file.configStatus === "configured";

            return (
              <div
                key={file.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all relative overflow-hidden select-none group",
                  isActive
                    ? "bg-primary/10 border-primary/80 ring-2 ring-primary/30 shadow-lg shadow-primary/10"
                    : "bg-background border-border hover:border-primary/40 hover:bg-slate-50/50"
                )}
                onClick={() => onSetupFile(file.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left section: Icon and file details */}
                  <div className={cn(
                    "flex items-start gap-3 flex-1 min-w-0 rounded-xl px-1 py-0.5 transition-colors",
                    isActive ? "bg-background/70" : ""
                  )}>
                    {/* File Icon */}
                    <div className="relative flex-shrink-0 mt-0.5">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                        isActive ? "bg-background shadow-sm ring-1 ring-primary/25" : "bg-primary/10"
                      )}>
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="absolute -bottom-1.5 -right-1.5 px-1 py-0.2 rounded-md text-[8px] font-bold bg-primary text-primary-foreground shadow-sm border border-background">
                        {extension}
                      </div>
                    </div>

                    {/* File Info & Configuration summary */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <p className="font-semibold text-foreground text-sm truncate leading-tight group-hover:text-primary transition-colors">
                        {file.metadata.name}
                      </p>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {formatFileSize(file.metadata.size)}
                      </span>

                      {/* Config summary badges if configured */}
                      {isConfigured && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px]">
                          <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200/50 font-bold uppercase tracking-wider">
                            {trmlCommon(file.sourceLanguage) || file.sourceLanguage} ➔ {trmlCommon(file.targetLanguage) || file.targetLanguage}
                          </span>
                          {file.selectedGlossaries.length > 0 && (
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium border border-slate-200/40">
                              {trmlTranslate("glossaryUsed", { count: file.selectedGlossaries.length })}
                            </span>
                          )}
                          {file.translateImages && (
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium border border-blue-200/40">
                              📷 {trmlTranslate("translateImages") || "Images"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right section: Status & Trash Action */}
                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Status Badge */}
                    {isConfigured ? (
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                        isActive ? "bg-primary/15 ring-1 ring-primary/25" : "bg-emerald-100"
                      )}>
                        <Check className={cn("w-3 h-3", isActive ? "text-primary" : "text-emerald-600")} />
                      </div>
                    ) : (
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                        isActive ? "bg-primary/15 ring-1 ring-primary/25 text-primary" : "bg-slate-100 text-slate-400"
                      )}>
                        <Settings className={cn("w-3.5 h-3.5", isActive && "animate-pulse text-primary")} />
                      </div>
                    )}

                    {onRemoveFile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
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
            <Button onClick={onStartAll} disabled={!isAllConfigured} className="w-full gap-2 py-5 text-sm font-semibold shadow-sm">
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
