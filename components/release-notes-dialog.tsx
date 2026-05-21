import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export function ReleaseNotesDialog({
  children,
  title = "Release Notes",
  releases = [],
  onOpen,
}: {
  children: React.ReactNode;
  title?: string;
  releases?: any[];
  onOpen?: () => void;
}) {
  const handleOpenChange = (open: boolean) => {
    if (open && onOpen) {
      onOpen();
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Danh sách các thay đổi và cập nhật mới nhất của ứng dụng
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {releases.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No release notes available.
              </div>
            ) : (
              releases.map((release, idx) => (
                <div key={idx} className="relative pl-6 border-l-2 border-muted">
                  <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1.5 ring-4 ring-background" />
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold tracking-tight">{release.version}</h3>
                    <Badge variant={idx % 2 === 0 ? 'default' : 'secondary'}>
                      {release.date}
                    </Badge>
                  </div>
                  <ul className="space-y-2 mt-3 text-sm text-muted-foreground list-disc pl-4 marker:text-muted-foreground/50">
                    {release.changes.map((change: string, i: number) => (
                      <li key={i}>{change}</li>
                    ))}
                  </ul>
                  {release.url && (
                    <div className="mt-3">
                      <a href={release.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                        View on GitHub &rarr;
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
