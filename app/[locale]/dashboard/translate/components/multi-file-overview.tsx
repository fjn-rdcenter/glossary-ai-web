import { FileConfigState } from "../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Settings, Languages, Trash2, FileText, FileSpreadsheet, File, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface MultiFileOverviewProps {
  files: FileConfigState[];
  onSetupFile: (id: string) => void;
  onRemoveFile?: (id: string) => void;
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
  onSetupFile,
  onRemoveFile,
  onStartAll,
  isAllConfigured
}: MultiFileOverviewProps) {
  const trmlCommon = useTranslations("Common");
  const trmlTranslate = useTranslations("Translate"); 
  const trmlTranslationExecution = useTranslations("TranslationExecution"); 

  return (
    <Card className="max-w-4xl mx-auto shadow-sm p-4 sm:p-6 border border-border rounded-xl">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight mb-1">{trmlTranslate("configTranslation") || "Config Translation"}</h2>
        <p className="text-primary text-sm">{trmlTranslate("clickToConfig") || "Click to file to config"}</p>
      </div>

      <div className="grid gap-4">
        {files.map((file, index) => {
          const Icon = getFileIcon(file.metadata.type);
          const extension = getFileExtension(file.metadata.name);

          return (
            <div
              key={file.id}
              className={`flex items-center justify-between p-4 rounded-xl border border-border shadow-sm transition-colors cursor-pointer hover:border-primary/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 bg-background`}
              onClick={() => onSetupFile(file.id)}
            >
              <div className="flex items-center gap-4 flex-1">
                {/* File Icon/Thumbnail */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-primary text-primary-foreground shadow-sm border border-background">
                    {extension}
                  </div>
                </div>

                {/* File Information */}
                <div className="flex-1 min-w-0 flex flex-col justify-center ml-2">
                  <p className="font-medium text-foreground truncate text-sm sm:text-base">{file.metadata.name}</p>
                  <span className="text-sm text-primary/80 mt-0.5">
                    {formatFileSize(file.metadata.size)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 ml-4" onClick={(e) => e.stopPropagation()}>
                {/* Checkmark when configured */}
                {file.configStatus === "configured" ? (
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                ) : null}

                {/* Setup button as requested by user to keep */}
                <Button
                  variant={file.configStatus === "configured" ? "outline" : "default"}
                  size="sm"
                  className="hidden sm:flex"
                  onClick={(e) => { e.stopPropagation(); onSetupFile(file.id); }}
                >
                  <Settings className="w-4 h-4 mr-1 sm:mr-2" />
                  {file.configStatus === "configured" ? (trmlTranslate("editSettings") || "Edit") : (trmlTranslate("setup") || "Setup")}
                </Button>

                {/* Setup icon for mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); onSetupFile(file.id); }}
                >
                  <Settings className="w-4 h-4" />
                </Button>

                {/* Delete button */}
                {onRemoveFile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors relative left-1"
                    onClick={(e) => { e.stopPropagation(); onRemoveFile(file.id); }}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {files.length > 0 && (
        <div className="flex justify-end items-center mt-8 pt-2">
          <Button onClick={onStartAll} disabled={!isAllConfigured} className="gap-2 min-w-[120px] px-6">
            {trmlTranslationExecution("startTranslating") || "Start Translating"} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Card>
  );
}
