"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GlossaryService } from "@/api/services";
import {
  GlossaryPermissionAdminResponse,
  GlossaryPermissionBaseResponse,
  PrincipalType,
  PermissionType,
  GlossaryPermissionCreate,
} from "@/lib/types";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";
import {
  Users,
  Globe,
  MoreVertical,
  Trash2,
  UserPlus,
  Clock,
  Shield,
  AlertTriangle,
  Calendar as CalendarIcon,
  Check,
  X,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { tr } from "date-fns/locale";

interface ShareGlossaryDialogProps {
  glossaryId: string;
  glossaryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareGlossaryDialog({
  glossaryId,
  glossaryName,
  open,
  onOpenChange,
}: ShareGlossaryDialogProps) {
  console.log("Rendering ShareGlossaryDialog for glossaryId:", glossaryId);
  const trmlGlossaries = useTranslations("Glossaries");
  const trmlCommon = useTranslations("Common");
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<GlossaryPermissionAdminResponse | null>(null);
  const [inviteType, setInviteType] = useState<PrincipalType>("user");
  const [inviteId, setInviteId] = useState("");
  const [invitePermission, setInvitePermission] = useState<PermissionType>("clone");
  const [expiredAt, setExpiredAt] = useState<Date | undefined>(undefined);
  const [isAdding, setIsAdding] = useState(false);
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

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await GlossaryService.getGlossaryPermissions(glossaryId);
      setPermissions(data);
    } catch (error) {
      showErrorDialog(error);
    } finally {
      setLoading(false);
    }
  }, [glossaryId, toast, trmlCommon]);

  useEffect(() => {
    if (open) {
      fetchPermissions();
      resetForm();
    }
  }, [open, fetchPermissions]);

  const resetForm = () => {
    setInviteType("user");
    setInviteId("");
    setInvitePermission("clone");
    setExpiredAt(undefined);
  };

  const handleAddPermission = async () => {
    if (inviteType === "user" && !inviteId.trim()) {
      toast({
        variant: "destructive",
        description: trmlGlossaries("userRequired"),
      });
      return;
    }

    // Unique check
    if (permissions) {
      const exists = inviteType === "public"
        ? !!permissions.publicPermission && permissions.publicPermission.status !== "revoked"
        : permissions.userPermissions.some(p => p.principalId === inviteId && p.status !== "revoked");

      if (exists) {
        showErrorDialog(new Error(trmlGlossaries("existingPermission")));
        return;
      }
    }

    setIsAdding(true);
    try {
      const data: GlossaryPermissionCreate = {
        principalType: inviteType,
        principalId: inviteType === "public" ? null : inviteId,
        permission: invitePermission,
        expiresAt: expiredAt ? expiredAt.toISOString() : null,
      };

      await GlossaryService.createGlossaryPermission(glossaryId, data);
      const target = inviteType === "public" ? trmlGlossaries("shareSuccess.anyone") : inviteId;
      const message = trmlGlossaries("shareSuccess.success", { target });
      toast({
        title: trmlGlossaries("shareSuccess.title"),
        description: message,
      });
      fetchPermissions();
      resetForm();
    } catch (error) {
      showErrorDialog(error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdatePermission = async (permissionId: string, updates: any) => {
    try {
      await GlossaryService.updateGlossaryPermission(glossaryId, permissionId, updates);
      toast({
        description: trmlGlossaries("permissionUpdated"),
      });
      fetchPermissions();
    } catch (error) {
      showErrorDialog(error);
    }
  };

  const handleRevoke = async (permissionId: string) => {
    try {
      await GlossaryService.deleteGlossaryPermission(glossaryId, permissionId);
      toast({
        description: trmlGlossaries("accessRemoved"),
      });
      fetchPermissions();
    } catch (error) {
      showErrorDialog(error);
    }
  };

  const PermissionRow = ({ p, isOwner = false }: { p: any, isOwner?: boolean }) => {
    const isPublic = p.principalType === "public";
    const isRevoked = p.status === "revoked";

    if (isRevoked) return null;

    return (
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            {isOwner ? <Shield className="w-5 h-5 text-primary" /> : (isPublic ? <Globe className="w-5 h-5" /> : <Users className="w-5 h-5" />)}
          </div>
          <div>
            <div className="text-sm font-medium">
              {isOwner ? `${p.ownerName} (${trmlGlossaries("owner")})` : (isPublic ? trmlGlossaries("anyoneWithAccess") : p.principalId)}
            </div>
            {!isOwner && p.expiresAt && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {trmlGlossaries("expires")}: {format(new Date(p.expiresAt), "dd/MM/yyyy")}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwner ? (
            <Badge variant="outline">{trmlGlossaries("owner")}</Badge>
          ) : (
            <div className="flex items-center gap-2">

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => handleRevoke(p.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0 bg-background shadow-2xl border-border">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl">{trmlGlossaries("share")} "{glossaryName}"</DialogTitle>
          <DialogDescription>
            {trmlGlossaries("shareDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-6">
          {/* Add Section */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-4">
                  <Select
                    value={inviteType}
                    onValueChange={(val: PrincipalType) => setInviteType(val)}
                  >
                    <SelectTrigger className="w-[140px] shrink-0 focus:ring-primary !h-10 bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">{trmlGlossaries("userPrincipal")}</SelectItem>
                      <SelectItem value="public">{trmlGlossaries("publicPrincipal")}</SelectItem>
                    </SelectContent>
                  </Select>

                  {inviteType === "user" ? (
                    <Input
                      placeholder={trmlGlossaries("userPlaceholder")}
                      value={inviteId}
                      onChange={(e) => setInviteId(e.target.value)}
                      className="h-10 flex-1 border bg-card"
                    />
                  ) : (
                    <div className="flex-1 h-10 flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground border border-input italic">
                      {trmlGlossaries("everyonePlaceholder")}
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleAddPermission}
                disabled={isAdding || (inviteType === "user" && !inviteId.trim())}
                className="h-10"
              >
                {isAdding ? "..." : <Plus className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <Label className="text-xs text-muted-foreground w-[194px] pl-2">{trmlGlossaries("expiresOptional")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "h-10 text-xs font-normal w-[180px] justify-start text-left",
                      !expiredAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {expiredAt ? format(expiredAt, "PPP") : <span>{trmlGlossaries("setExpiration")}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expiredAt}
                    onSelect={setExpiredAt}
                    autoFocus
                    disabled={(date) => date < new Date()}
                  />
                  {expiredAt && (
                    <div className="p-2 border-t flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setExpiredAt(undefined)} className="h-7 text-xs">Clear</Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* List Section */}
          <div className="space-y-1">
            <h4 className="text-sm font-semibold mb-2">{trmlGlossaries("peopleWithAccess")}</h4>
            <ScrollArea className="h-[200px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center h-full py-10 text-muted-foreground text-sm italic">
                  {trmlGlossaries("loadingPermissions")}
                </div>
              ) : (
                <div className="space-y-1">
                  {permissions && (
                    <>
                      <PermissionRow
                        p={{
                          ownerName: permissions.ownerName,
                          principalId: permissions.ownerId,
                          principalType: "user"
                        }}
                        isOwner
                      />
                      {permissions.publicPermission && permissions.publicPermission.status !== "revoked" && (
                        <PermissionRow p={permissions.publicPermission} />
                      )}
                      {permissions.userPermissions.filter(p => p.status !== "revoked").map((p) => (
                        <PermissionRow key={p.id} p={p} />
                      ))}

                      {(!permissions.publicPermission || permissions.publicPermission.status === "revoked") &&
                        permissions.userPermissions.filter(p => p.status !== "revoked").length === 0 && (
                          <div className="py-10 text-center text-sm text-muted-foreground italic">
                            {trmlGlossaries("noAdditionalPermissions")}
                          </div>
                        )}
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="bg-muted/30 p-4 border-t px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {trmlCommon("close")}
          </Button>
        </DialogFooter>

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
      </DialogContent>
    </Dialog>
  );
}
