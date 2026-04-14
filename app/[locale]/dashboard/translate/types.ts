export type TranslationStatus =
  | "idle"
  | "uploading"
  | "translating"
  | "success"
  | "error"
  | "cancelled";

export type FileConfigState = {
  id: string; // unique ID for state tracking
  file?: File; // keeping reference to the original file if available
  documentId: string;
  metadata: {
    name: string;
    size: number;
    type: string;
  };
  
  // Configuration Settings
  sourceLanguage: string; // default "jp"
  targetLanguage: string; // default "vn"
  translateImages: boolean;
  glossaryOption: "none" | "existing" | "new";
  selectedGlossaries: string[];
  
  // Statuses
  configStatus: "pending" | "configured";
  translationStatus: TranslationStatus;
  jobId: string | null;
  progress: number;
  errorMessage?: string;
  
  // To allow downloading later
  targetDocumentId?: string;
};
