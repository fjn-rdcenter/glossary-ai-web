import { create } from "zustand";

export type UploadedFileInfo = {
  id: string;
  file: File;
  documentId: string;
  metadata: {
    name: string;
    size: number;
    type: string;
  };
};

type PendingUploadState = {
  pendingFiles: UploadedFileInfo[];
  setPendingFiles: (files: UploadedFileInfo[]) => void;
  clearPendingFiles: () => void;
};

export const usePendingUploadStore = create<PendingUploadState>((set) => ({
  pendingFiles: [],
  setPendingFiles: (files) => set({ pendingFiles: files }),
  clearPendingFiles: () => set({ pendingFiles: [] }),
}));
