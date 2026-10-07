/**
 * API Configuration
 * Central configuration for API endpoints and settings
 */

export const USE_LEGACY_EXTRACTION_MEDIA = process.env.NEXT_PUBLIC_USE_LEGACY_EXTRACTION_MEDIA !== "false";

export const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL || "http://172.16.6.10:28888";
export const MEDIA_STORAGE = process.env.MEDIA_STORAGE || "http://172.16.6.10:28888/GlossaryAI";

export const getApiBaseUrl = (): string => {
  const envUrl = process.env.API_BASE_URL;

  if (envUrl) return envUrl;

  if (typeof window === "undefined") {
    return "http://localhost:18000";
  }

  const apiUrl = new URL(window.location.origin);
  apiUrl.port = window.location.port === "23000" ? "28000" : "18000";

  return apiUrl.origin;
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  TIMEOUT: 30000, // 30 seconds

  // API Endpoints - Update these to match your backend routes
  ENDPOINTS: {
    // Authentication
    AUTH: {
      LOGIN: "/api/v2/auth/login",
      LOGOUT: "/api/v2/auth/logout",
      REFRESH: "/api/v2/auth/refresh-token",
      ME: "/api/v2/users/me",
      UPDATE_ME: "/api/v2/users/me",
    },

    // Glossaries
    GLOSSARIES: {
      BASE: "/api/v2/glossaries",
      PUBLIC: "/api/v2/glossaries/public",
      SHARED_WITH_ME: "/api/v2/glossaries/shared-with-me",
      BY_ID: (id: string) => `/api/v2/glossaries/${id}`,
      TERMS: (glossaryId: string) => `/api/v2/glossaries/${glossaryId}/terms`,
      TERM_BY_ID: (glossaryId: string, termId: string) =>
        `/api/v2/glossaries/${glossaryId}/terms/${termId}`,
      PERMISSIONS: (id: string) => `/api/v2/glossaries/${id}/permissions`,
      MY_PERMISSION: (id: string) => `/api/v2/glossaries/${id}/permissions/my-permission`,
      PERMISSION_BY_ID: (id: string, permissionId: string) =>
        `/api/v2/glossaries/${id}/permissions/${permissionId}`,
      CLONE: (id: string) => `/api/v2/glossaries/${id}/clone`,
      RECOMMEND: "/api/v2/glossaries/recommend",
    },

    // Documents
    DOCUMENTS: {
      SOURCE: "/api/v2/documents/source",
      DOWNLOAD: (id: string) => `/api/v2/documents/download/${id}`,
      DELETE: (id: string) => `/api/v2/documents/${id}`,
    },

    MEDIA: {
      GET: (mediaPath: string) => `/api/v2/media/${encodeURIComponent(mediaPath)}`,
    },

    // Translations
    TRANSLATIONS: {
      UPLOAD: "/api/v2/documents/upload",
      START: "/api/v2/translations",
      CREATE: "/api/v2/translations/create",
      START_PIPELINE: "/api/v2/translations/start",
      TABLES: (translationId: string) => `/api/v2/translations/${translationId}/tables`,
      TABLE: (translationId: string, tableId: string) => `/api/v2/translations/${translationId}/tables/${tableId}`,
      TABLES_BATCH: (translationId: string) => `/api/v2/translations/${translationId}/tables/batch`,
      GENERATE: "/api/v2/translations/generate",
      STATUS: (jobId: string) => `/api/v2/translations/${jobId}`,
      CANCEL: (jobId: string) => `/api/v2/translations/${jobId}/cancel`,
      HISTORY: "/api/v2/translations",
    },

    // Release Notes
    RELEASE_NOTES: {
      BASE: "/api/v2/release-notes",
      MARK_READ: "/api/v2/release-notes/read",
    },
  },
} as const;
