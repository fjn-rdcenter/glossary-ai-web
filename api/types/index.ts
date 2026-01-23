export type StatusEnum = "pending" | "translating" | "completed" | "failed" | "cancelled";

export type GlossaryDetailResponse = GlossaryResponse;

export interface LoginRequest {
  username: string;
  password: string;
  grant_type?: string;
  scope?: string;
  client_id?: string;
  client_secret?: string;
}

export interface UserResponse {
  id: string;
  username: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  user?: UserResponse;
  data?: { // For nested data structure
      token?: string;
      access_token?: string;
      refreshToken?: string;
      refresh_token?: string;
      user?: UserResponse;
  };
  // Compatibility
  token?: string;
  refreshToken?: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  // Compatibility
  token?: string;
  refreshToken?: string;
      data?: { 
      token?: string;
      access_token?: string;
      refreshToken?: string;
      refresh_token?: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApiError {
  message: string;
  status_code?: number;
  detail?: any;
  error_code?: string;
  code?: string; // backwards compatibility
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: {
      message: string;
      code?: string;
  };
}

export interface GlossaryResponse {
  id: string;
  name: string;
  description?: string;
  sourceLanguage: string;
  targetLanguage: string;
  termCount: number;
  createdAt?: string;
  updatedAt?: string;
  terms?: {
    items: TermResponse[];
    total: number;
    page: number;
    size: number;
    pages: number;
  };
  // Compatibility for older usages expecting top-level items?
  items?: TermResponse[];
}


export interface TermResponse {
  id: string;
  source: string;
  target: string;
  glossaryId: string;
}

export type GlossaryTermResponse = TermResponse;

export interface CreateGlossaryRequest {
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  description?: string;
}

export interface UpdateGlossaryRequest {
  name?: string;
  description?: string;
}

export interface CreateTermRequest {
  source: string;
  target: string;
}


export interface GlossaryTermsUpsertRequest {
  terms: {
      source: string;
      target: string;
  }[];
}

export interface GlossaryTermsUpsertResponse {
  created: number;
  updated: number;
  total: number;
}

export interface UpdateTermRequest {
  source?: string;
  target?: string;
}

export interface UploadDocumentResponse {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface UploadDocumentRequest {
  file: File;
  sourceLanguage: string;
  targetLanguage: string;
  glossaries?: string[];
}

export interface StartTranslationRequest {
  documentId: string;
  sourceLanguage: string;
  targetLanguage: string;
  glossaries?: string[];
}

export interface StartTranslationResponse {
  id: string;
  status: string;
  submittedAt: string;
  targetDocument?: string;
}

export interface TranslationStatusResponse {
  id: string;
  status: StatusEnum;
  progress: number;
  sourceLanguage: string;
  targetLanguage: string;
  documentId: string;
  targetDocument?: string; // ID of translated doc
  errorMessage?: string;
}

export interface TranslationHistoryResponse {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: StatusEnum;
  submittedAt: string;
  completedAt?: string;
  progress?: number; // Optional in history?
  targetDocument?: string;
  sourceDocument?: string; // Compatibility alias
  startedAt?: string; // Compatibility alias
}

// Alias for compatibility if needed
// Alias for compatibility if needed
export type TranslationJobResponse = TranslationStatusResponse;

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
