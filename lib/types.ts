export type StatusEnum = "pending" | "translating" | "completed" | "failed" | "cancelled";

// --- User Schemas ---

export interface UserBase {
  username: string;
}

export interface UserCreate extends UserBase {}

export interface UserResponse extends UserBase {
  id: string;
}

// --- Auth Schemas ---

export interface LoginRequest {
  username: string;
  password: string;
  // Optional fields that might be used by OAuth2 flow but not in strict schema
  grant_type?: string; 
  scope?: string;
  client_id?: string;
  client_secret?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string; // Often included even if not in strict base model for some flows
  user?: UserResponse; // Often included for convenience
}

export interface RefreshTokenResponse {
    access_token: string;
    token_type: string;
    refresh_token?: string;
}

// --- Glossary Terms Schemas ---

export interface GlossaryTermBase {
  source: string;
  target: string;
}

export interface GlossaryTermCreate extends GlossaryTermBase {}

export interface GlossaryTermUpdate {
  source?: string;
  target?: string;
}

export interface GlossaryTermResponse extends GlossaryTermBase {
  id: string;
  glossaryId: string;
}

export interface GlossaryTermPaginatedResponse {
  items: GlossaryTermResponse[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface GlossaryTermsUpsertRequest {
  terms: GlossaryTermBase[];
}

export interface GlossaryTermsUpsertResponse {
  created: number;
  updated: number;
  total: number;
}

export interface GlossaryTermsDeleteRequest {
  termIds: string[];
}

export interface GlossaryTermsDeleteResponse {
  deleted: number;
}

// --- Glossary Schemas ---

export interface GlossaryBase {
  name: string;
  description?: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface GlossaryCreate extends GlossaryBase {}

export interface GlossaryUpdate {
  name?: string;
  description?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export interface GlossaryResponse extends GlossaryBase {
  id: string;
  termCount: number;
  createdAt: string; // datetime
  updatedAt: string; // datetime
  terms?: GlossaryTermPaginatedResponse;
}

export interface GlossaryPaginatedResponse {
  items: GlossaryResponse[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface GlossaryDetailResponse extends GlossaryResponse {
  terms: GlossaryTermPaginatedResponse;
}

// --- Document Schemas ---

export interface DocumentBase {
  name: string;
  size: number;
  type: string;
}

export interface DocumentResponse extends DocumentBase {
  id: string;
  uploadedAt: string; // datetime
}

export interface DocumentPaginatedResponse {
  items: DocumentResponse[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface UploadDocumentRequest {
    file: File;
    sourceLanguage: string;
    targetLanguage: string;
    glossaries?: string[];
}

export interface UploadDocumentResponse {
    id: string;
    name: string;
    size: number;
    type: string;
    uploadedAt: string;
}

// --- Translation Job Schemas ---

export interface TranslationJobCreate {
  documentId: string;
  sourceLanguage: string;
  targetLanguage: string;
  glossaries?: string[];
}

export interface TranslationJobResponse {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  glossaries?: string[];
  sourceDocument: string;
  sourceDocumentName?: string;
  targetDocument?: string;
  status: StatusEnum;
  progress: number;
  startedAt: string; // datetime
  completedAt?: string; // datetime
  errorMessage?: string;
}

export interface TranslationJobPaginatedResponse {
  items: TranslationJobResponse[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface BBox {
  vertices: number[][]; // float[][]
  text: string;
}

// --- Common API Types ---
// Keeping some utility types that might be needed by services
export interface ApiError {
    error?: {
      message: string;
      code?: string;
    };
    message?: string;
    detail?: string | { msg: string }[];
  }
  
export interface ApiResponse<T> {
    data: T;
    message?: string;
    error?: {
        message: string;
        code?: string;
    };
}
  
// Generic PaginatedResponse for utility if needed, though specific ones are defined above
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

export interface SourceDocumentResponse {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  usageCount: number;
}

export interface SourceDocumentPaginatedResponse {
  items: SourceDocumentResponse[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export type SourceDocumentSortField =
  | "name"
  | "uploadedAt"
  | "size"
  | "type"
  | "usageCount";

// Aliases for compatibility during migration if needed
export type TranslationStatusResponse = TranslationJobResponse;
export type TranslationHistoryResponse = TranslationJobResponse;
export type CreateTermRequest = GlossaryTermBase;
export type UpdateTermRequest = GlossaryTermUpdate;
export type CreateGlossaryRequest = GlossaryCreate;
export type UpdateGlossaryRequest = GlossaryUpdate;
export type TermResponse = GlossaryTermResponse;
export type StartTranslationRequest = TranslationJobCreate;
export type StartTranslationResponse = TranslationJobResponse;
