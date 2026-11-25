export type StatusEnum = "pending" | "translating" | "completed" | "failed" | "cancelled";

// --- User Schemas ---

export interface UserBase {
  username: string;
}

export interface UserCreate extends UserBase {}

export interface UserResponse extends UserBase {
  displayName: string | null;
  email: string | null;
  id: string;
  walkthrough_status: {
    dashboard_tour: boolean;
    glossary_tour: boolean;
    upload_tour: boolean;
  };
}

export interface UserUpdateRequest {
  walkthrough_status?: {
    dashboard_tour?: boolean;
    glossary_tour?: boolean;
    upload_tour?: boolean;
  };
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
  matchedTermCount?: number;
  /** Whose glossary it is. Set by the list endpoints; absent from a single glossary. */
  ownerName?: string | null;
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
  isTranslateImage?: boolean;
  keepSource?: boolean;
  glossaries?: string[];
}

export interface TranslationJobResponse {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  glossaries?: string[];
  isTranslateImage?: boolean;
  sourceDocument: string;
  sourceDocumentName?: string;
  targetDocument?: string;
  targetDocumentName?: string;
  extractionId?: string | null;
  status: StatusEnum;
  progress: number;
  startedAt: string; // datetime
  completedAt?: string; // datetime
  /** Failure reason of a failed job (an error code); translate it with `Errors.<code>`. */
  errorCode?: string | null;
  errorParams?: Record<string, string | number | boolean | null> | null;
}

export interface TranslationJobPaginatedResponse {
  items: TranslationJobResponse[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface TranslationTableResponse {
  id: string;
  translationId: string;
  path: string;
  source: string | null;
  target: string | null;
  feedback: string | null;
  isSkipped: boolean;
}

export interface TranslationTableUpdate {
  feedback?: string | null;
  isSkipped?: boolean | null;
}

export interface TranslationTableBatchUpdate {
  items: Array<TranslationTableUpdate & {id: string}>;
}

export interface GenerateTranslationResponse {
  targetDocument: string;
}

export interface BBox {
  vertices: number[][]; // float[][]
  text: string;
}

// --- Common API Types ---
// Keeping some utility types that might be needed by services
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
export interface StartTranslationJobRequest {
  translationId: string;
}
export type CreateTermRequest = GlossaryTermBase;
export type UpdateTermRequest = GlossaryTermUpdate;
export type CreateGlossaryRequest = GlossaryCreate;
export type UpdateGlossaryRequest = GlossaryUpdate;
export type TermResponse = GlossaryTermResponse;
export type StartTranslationRequest = TranslationJobCreate;
export type StartTranslationResponse = TranslationJobResponse;

// --- Glossary Permission Schemas ---

export type PermissionStatus = "pending" | "accepted" | "revoked" | "declined";
export type PermissionType = "view" | "clone" | "edit" | "admin";
export type PrincipalType = "user" | "team" | "public" | "link";

export interface GlossaryPermissionBaseResponse {
  principalType: PrincipalType;
  principalId: string | null;
  permission: PermissionType;
  expiresAt: string | null;
  id: string;
  status: PermissionStatus;
  grantedBy: string;
  createdAt: string;
  /** Display name of the person a user permission is for. Only the permissions listing sets it; empty without an account. */
  principalDisplayName?: string | null;
}

export interface GlossaryPermissionAdminResponse {
  glossaryId: string;
  ownerId: string;
  /** The owner's username. */
  ownerName: string;
  ownerDisplayName?: string | null;
  publicPermission: GlossaryPermissionBaseResponse | null;
  userPermissions: GlossaryPermissionBaseResponse[];
}

export interface GlossaryPermissionCreate {
  principalType: PrincipalType;
  principalId?: string | null;
  permission?: PermissionType;
  expiresAt?: string | null;
}

export interface GlossaryPermissionUpdate {
  permission?: PermissionType | null;
  expiresAt?: string | null;
}

export interface MyGlossaryPermissionResponse {
  permission: PermissionType | "owner";
}

export interface GlossaryCloneCreate {
  name?: string | null;
  description?: string | null;
}

// --- Notification Schemas ---

/** Live state of what a notification asks for (an invitation). `null` when it asks for nothing. */
export type NotificationActionState = "pending" | "accepted" | "declined" | "revoked" | "expired";

export interface NotificationResponse {
  id: string;
  /** A backend `NotificationType`; may be one this build does not know yet (see lib/notification-types.ts). */
  type: string;
  /** Values safe to show; interpolated into `Notifications.<type>`. */
  params: Record<string, string | number | boolean | null>;
  subjectType: string | null;
  subjectId: string | null;
  actionState: NotificationActionState | null;
  readAt: string | null; // datetime
  createdAt: string; // datetime
}

export interface NotificationListResponse {
  items: NotificationResponse[];
  nextCursor: string | null;
}

// --- User search (share dialog suggestions) ---

export interface UserSuggestion {
  username: string;
  displayName: string | null;
  /** What was typed is exactly this user's username or email, ignoring case. */
  exact: boolean;
}

export interface UserSearchResponse {
  items: UserSuggestion[];
}
