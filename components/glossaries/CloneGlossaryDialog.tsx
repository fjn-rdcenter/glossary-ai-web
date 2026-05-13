"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlossaryService } from "@/api/services";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { Copy, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getErrorMessage } from "@/lib/error-utils";
import { tr } from "date-fns/locale";

interface CloneGlossaryDialogProps {
  glossaryId: string | null;
  glossaryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CloneGlossaryDialog({
  glossaryId,
  glossaryName,
  open,
  onOpenChange,
  onSuccess,
}: CloneGlossaryDialogProps) {
  const [name, setName] = useState(`${glossaryName} (Copy)`);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const trmlCommon = useTranslations("Common");
  const trmlGlossaries = useTranslations("Glossaries");
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const showErrorDialog = (error: unknown) => {
    setErrorDialog({
      open: true,
      message: getErrorMessage(error),
    });
  };

  // Default default name when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName(`${glossaryName} (Copy)`);
      setDescription("");
    }
    onOpenChange(isOpen);
  };

  const handleClone = async () => {
    if (!glossaryId) return;
    setLoading(true);
    try {
      await GlossaryService.cloneGlossary(glossaryId, {
        name: name.trim() || null,
        description: description.trim() || null,
      });
      toast({
        title: trmlGlossaries("cloneSuccess.title"),
        description: trmlGlossaries("cloneSuccess.description"),
        variant: "success",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      showErrorDialog(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            {trmlGlossaries("cloneGlossary")}
          </DialogTitle>
          <DialogDescription>
            {trmlGlossaries("cloneGlossaryDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{trmlGlossaries("name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={trmlGlossaries("name")}
              className="bg-card"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">{trmlGlossaries("description")}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={trmlGlossaries("description")}
              className="bg-card"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {trmlCommon("cancel")}
          </Button>
          <Button onClick={handleClone} disabled={loading}>
            {loading ? trmlGlossaries("cloning") : trmlGlossaries("clone")}
          </Button>
        </DialogFooter>
      </DialogContent>
      <AlertDialog
        open={errorDialog.open}
        onOpenChange={(isOpen) => setErrorDialog((prev) => ({ ...prev, open: isOpen }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {trmlCommon("error")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground">
              {errorDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialog({ open: false, message: "" })}>
              {trmlCommon("close")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
