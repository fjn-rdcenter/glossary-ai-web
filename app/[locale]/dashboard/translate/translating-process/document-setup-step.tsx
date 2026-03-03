import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  FileText,
  Trash2,
  ArrowRightLeft,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FileCard } from "@/components/file-card";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
// Remove mock data
// import { languages } from "@/lib/mock-data";

// Constants
import { SUPPORTED_LANGUAGES } from "@/lib/constants";

interface DocumentSetupStepProps {
  uploadedFile: {
    name: string;
    size: number;
    type: string;
  } | null;
  setUploadedFile: (
    file: { name: string; size: number; type: string } | null
  ) => void;
  setFileToUpload: (file: File | null) => void;
  sourceLanguage: string;
  setSourceLanguage: (lang: string) => void;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  translateImages: boolean;
  setTranslateImages: (value: boolean) => void;
  onNext: () => void;
  onBack: () => void;
  isUploading?: boolean;
}

export function DocumentSetupStep({
  uploadedFile,
  setUploadedFile,
  setFileToUpload,
  sourceLanguage,
  setSourceLanguage,
  targetLanguage,
  setTargetLanguage,
  translateImages,
  setTranslateImages,
  onNext,
  onBack,
  isUploading = false,
}: DocumentSetupStepProps) {
  const trmlCommon = useTranslations("Common");
  const trmlDocumentSetup = useTranslations("DocumentSetup");

  const isPublicDomain =
    typeof window !== "undefined" &&
    window.location.hostname === "translatesphere.fujinet.net";
  const maxSizeMB = isPublicDomain ? 20 : 50;

  // [NEW] Error Dialog State
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const handleRemoveFile = () => {
    setUploadedFile(null); // This triggers the logic in parent to clear everything
    // setFileToUpload(null) is called implicitly by parent's setUploadedFile wrapper if I implemented it that way,
    // OR we should call it explicitly if parent wrapper doesn't handle both.
    // In `page.tsx`, `setUploadedFile` prop wrapper clears `fileToUpload` if null passed.
    // So this is fine.
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedExtensions = [
      ".pdf",
      ".docx",
      ".pptx",
      ".xlsx",
    ];
    const fileName = file.name.toLowerCase();
    const isValidType = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidType) {
      setErrorDialog({
        open: true,
        message: "Please upload only PowerPoint, Word, Excel, or PDF files.",
      });
      return;
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      setErrorDialog({
        open: true,
        message: trmlDocumentSetup("fileTooLarge", { maxSize: maxSizeMB }),
      });
      return;
    }

    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
    };
    setUploadedFile(fileData);
    setFileToUpload(file);
    // sessionStorage.setItem("uploadedFile", JSON.stringify(fileData)); // REMOVED: Premature saving causing ghost state
  };

  return (
    <motion.div
      key="document"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15 }}
    >
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-semibold">
            {trmlDocumentSetup("documentTitle")}
          </CardTitle>
          <p className="text-lg text-muted-foreground">
            {trmlDocumentSetup("documentDescription")}
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* ================= FILE UPLOAD ================= */}
          <div data-tour="file-upload">
            {uploadedFile ? (
              <div className="flex items-stretch gap-2">
                {/* File card */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <FileCard
                    name={uploadedFile.name}
                    size={uploadedFile.size}
                    type={uploadedFile.type}
                    status="success"
                  />
                </div>

                {/* Remove action – full height */}
                <button
                  onClick={handleRemoveFile}
                  className="
                    group
                    w-12
                    flex items-center justify-center
                    rounded-xl
                    border border-border
                    text-muted-foreground
                    transition-all duration-200

                    hover:bg-destructive
                    hover:border-destructive
                    hover:text-white

                    active:bg-destructive/90
                  "
                  aria-label="Remove file"
                >
                  <Trash2 className="w-4 h-4 transition-transform group-hover:scale-110" />
                </button>
              </div>
            ) : (
              <div
                className="
                  p-10 border-2 border-dashed border-border
                  rounded-2xl text-center flex flex-col items-center justify-center min-h-[280px]
                  transition-colors
                "
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add(
                    "border-primary",
                  "bg-secondary/50"
                  );
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove(
                    "border-primary",
                  "bg-secondary/50"
                  );
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove(
                    "border-primary",
                  "bg-secondary/50"
                  );
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    handleFileSelect(file);
                  }
                }}
              >
                <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
                  <FileText className="w-12 h-12 text-muted-foreground" />
                </div>
                <p className="text-xl font-medium text-foreground mb-2">
                  {trmlDocumentSetup("dragAndDrop")}
                  <span className="text-sm text-muted-foreground font-normal">{trmlDocumentSetup("supportedFiles", { maxSize: maxSizeMB })}</span>
                </p>
                <p className="text-base text-muted-foreground mb-6">{trmlCommon("or")}</p>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.docm,.dotx,.dotm,.ppt,.pptx,.xlsx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(file);
                    }
                  }}
                />

                <Button
                  variant="outline"
                  size="lg"
                  className="bg-transparent text-base h-12 px-8"
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  <Upload className="mr-2 w-5 h-5" />
                  {trmlDocumentSetup("uploadDocument")}
                </Button>
              </div>
            )}
          </div>

          {/* ================= LANGUAGE PAIR ================= */}
          <div className="space-y-3" data-tour="language-selection">
            <Label id="language-selection-label" className="text-lg">{trmlDocumentSetup("translationLanguages")}</Label>

            <div className="flex items-center gap-4">
              {/* Source language */}
              <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                <SelectTrigger className="h-14 text-base flex-1" aria-labelledby="language-selection-label">
                  <SelectValue placeholder="From" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {trmlCommon(lang.code) ?? lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Swap */}
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label={trmlCommon("swapLanguages") || "Swap languages"}
                onClick={() => {
                  if (!sourceLanguage || !targetLanguage) return;
                  setSourceLanguage(targetLanguage);
                  setTargetLanguage(sourceLanguage);
                }}
              >
                <ArrowRightLeft className="w-4 h-4" />
              </Button>

              {/* Target language */}
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger className="h-14 text-base flex-1" aria-labelledby="language-selection-label">
                  <SelectValue placeholder="To" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.filter(
                    (l) => l.code !== sourceLanguage
                  ).map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {trmlCommon(lang.code) ?? lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ================= IMAGE TRANSLATION OPTION ================= */}
          <div
            className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/20"
            data-tour="translate-images"
          >
            <div className="space-y-0.5">
              <Label
                htmlFor="translate-images"
                className="text-base cursor-pointer"
              >
                {trmlDocumentSetup("translateImages")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {trmlDocumentSetup("translateImagesDescription")}
              </p>
            </div>
            <Switch
              id="translate-images"
              checked={translateImages}
              onCheckedChange={setTranslateImages}
            />
          </div>

          {/* ================= ACTIONS ================= */}
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={onBack} disabled={isUploading}>
              <ArrowLeft className="mr-2 w-4 h-4" />
              {trmlCommon("back")}
            </Button>

            <Button
              onClick={onNext}
              disabled={!uploadedFile || !targetLanguage || isUploading}
              className="group"
            >
              {isUploading
                ? trmlCommon("uploading") || "Uploading..."
                : trmlCommon("continue")}
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Dialog */}
      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {trmlCommon("error")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground font-medium mt-2">
              {errorDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialog({ open: false, message: "" })}>
              {trmlCommon("close") || "Close"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
