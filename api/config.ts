/**
 * API Configuration
 * Central configuration for API endpoints and settings
 */

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  if (typeof window === "undefined") {
    return envUrl || "http://172.16.6.10:18000";
  }

  const { hostname, host } = window.location;

  if (hostname.includes("translatesphere.fujinet.net")) {
    return "https://translatesphere.fujinet.net";
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:18000";
  }

  if (host === "172.16.6.10:23000") {
    return "http://172.16.6.10:28000";
  }

  return envUrl || "http://172.16.6.10:18000";
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
      ME: "/api/v2/me/",
      UPDATE_ME: "/api/v2/me/",
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
    },

    // Documents
    DOCUMENTS: {
      SOURCE: "/api/v2/documents/source",
      DOWNLOAD: (id: string) => `/api/v2/documents/download/${id}`,
      DELETE: (id: string) => `/api/v2/documents/${id}`,
    },

    // Translations
    TRANSLATIONS: {
      UPLOAD: "/api/v2/documents/upload",
      START: "/api/v2/translations",
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
