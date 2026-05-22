"use client";

import { motion } from "framer-motion";
import { Check, CheckCircle2, AlertCircle, Languages, Book, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { useTranslations } from 'next-intl';

interface GlossarySummaryProps {
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  description?: string;
  termCount: number;
  isValid: boolean;
  isSaving: boolean;
  mode: "create" | "edit";
  onSave: () => void;
  onCancel: () => void;
  className?: string; // Allow custom styling/positioning
}

export function GlossarySummary({
  name,
  sourceLanguage,
  targetLanguage,
  description,
  termCount,
  isValid,
  isSaving,
  mode,
  onSave,
  onCancel,
  className,
}: GlossarySummaryProps) {
  const trmlCommon = useTranslations("Common");
  const trmlGlossaries = useTranslations("Glossaries");

  const sourceLangName = trmlCommon(sourceLanguage) ?? sourceLanguage
  const targetLangName = trmlCommon(targetLanguage) ?? targetLanguage

  return (
    <Card id="glossary-summary" className={cn("sticky top-24 border border-border shadow-sm bg-card overflow-hidden", className)}>
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
           <Book className="w-4 h-4 text-primary" />
           {trmlGlossaries("basicInfo")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {/* Status Indicator */}
        <div className={cn(
            "p-3 rounded-lg border flex items-start gap-3 transition-colors",
            isValid 
               ? "bg-green-50/50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300"
               : "bg-amber-50/50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300"
        )}>
            {isValid ? (
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
            ) : (
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            )}
            <div className="text-sm">
                <p className="font-medium">
                    {isValid 
                       ? (mode === "create" ? trmlGlossaries("readyCreate") : trmlGlossaries("readySave"))
                       : trmlGlossaries("missingInfo")
                    }
                </p>
                {!isValid && (
                   <ul className="mt-1 list-disc list-inside text-xs opacity-90 space-y-0.5">
                       {!name && <li>{trmlGlossaries("errorNameRequired")}</li>}
                       {!termCount && <li>{trmlGlossaries("errorTermRequired")}</li>}
                       {(!sourceLanguage || !targetLanguage) && <li>{trmlGlossaries("errorLangRequired")}</li>}
                   </ul>
                )}
            </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-5">
             {/* Name Preview */}
             <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {trmlGlossaries("name")}
                  </span>
                  <span className="text-sm font-medium text-foreground leading-snug truncate">
                    {name || <span className="text-muted-foreground italic">{trmlGlossaries("untitled")}</span>}
                  </span>
             </div>

             {/* Language Pair */}
             <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5" />
                    {trmlGlossaries("languagePair")}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/40 rounded-md border border-border/50 shadow-sm text-sm font-medium text-foreground">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      {sourceLangName || "?"}
                    </div>
                    <span className="text-muted-foreground/60">→</span>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/40 rounded-md border border-border/50 shadow-sm text-sm font-medium text-foreground">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {targetLangName || "?"}
                    </div>
                  </div>
             </div>

             {/* Description */}
             <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {trmlGlossaries("description")}
                  </span>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {description ? (
                      <span className="line-clamp-3">{description}</span>
                    ) : (
                      <span className="italic opacity-50">{trmlGlossaries("noDescription") || "No description"}</span>
                    )}
                  </div>
             </div>

             {/* Stats */}
             <div className="pt-4 mt-2 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">{trmlGlossaries("totalTerms")}</span>
                    <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-md text-primary">
                      <span className="text-sm font-bold font-mono">{termCount}</span>
                    </div>
                  </div>
             </div>
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-3">
          <Button 
            className="w-full h-11 shadow-sm transition-all hover:shadow-md" 
            disabled={!isValid || isSaving} 
            onClick={onSave}
          >
            {isSaving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
              />
            ) : (
              <>
                {mode === "create" ? <Plus className="mr-2 w-4 h-4" /> : <Save className="mr-2 w-4 h-4" />}
                {mode === "create" ? trmlGlossaries("createGlossary") : trmlGlossaries("save")}
              </>
            )}
          </Button>
          <Button variant="outline" className="w-full hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30" onClick={onCancel}>
            {trmlCommon("cancel")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
