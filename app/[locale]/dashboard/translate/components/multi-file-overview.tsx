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
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          {trmlTranslate("configTranslation") || "Config Translation"}
        </CardTitle>
        <CardDescription>
          {trmlTranslate("clickToConfig") || "Click to file to config"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Files List */}
        <div className="space-y-3">
          {files.map((file, index) => {
            const Icon = getFileIcon(file.metadata.type);
            const extension = getFileExtension(file.metadata.name);

            return (
              <div
                key={file.id}
                className="p-4 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => onSetupFile(file.id)}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left section: Icon and file info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* File Icon */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-primary text-primary-foreground shadow-sm border border-background">
                        {extension}
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="font-medium text-foreground truncate text-sm">
                        {file.metadata.name}
                      </p>
                      <span className="text-sm text-muted-foreground mt-0.5">
                        {formatFileSize(file.metadata.size)}
                      </span>
                    </div>

                    {/* Checkmark when configured */}
                    {file.configStatus === "configured" && (
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                    )}
                  </div>

                  {/* Right section: Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant={file.configStatus === "configured" ? "outline" : "default"}
                      size="sm"
                      className="hidden sm:flex"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onSetupFile(file.id); 
                      }}
                    >
                      <Settings className="w-4 h-4 mr-1.5" />
                      {file.configStatus === "configured" 
                        ? (trmlTranslate("editSettings") || "Edit") 
                        : (trmlTranslate("setup") || "Setup")
                      }
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="sm:hidden text-muted-foreground hover:text-foreground"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onSetupFile(file.id); 
                      }}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>

                    {onRemoveFile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onRemoveFile(file.id); 
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      {files.length > 0 && (
        <div className="flex justify-end pt-4">
          <Button onClick={onStartAll} disabled={!isAllConfigured} className="gap-2">
            {trmlTranslationExecution("startTranslating") || "Start Translating"} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
      </CardContent>
    </Card>
  );
}
