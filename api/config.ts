/**
 * API Configuration
 * Central configuration for API endpoints and settings
 */

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
      const hostname = window.location.hostname;

      if (hostname.includes("translatesphere.fujinet.net")) {
        return "https://translatesphere.fujinet.net"; 
      }
      
      return "http://172.16.6.10:18000";
    }

    return process.env.NEXT_PUBLIC_API_URL || "http://172.16.6.10:18000";
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
      BY_ID: (id: string) => `/api/v2/glossaries/${id}`,
      TERMS: (glossaryId: string) => `/api/v2/glossaries/${glossaryId}/terms`,
      TERM_BY_ID: (glossaryId: string, termId: string) => 
        `/api/v2/glossaries/${glossaryId}/terms/${termId}`,
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
  },
} as const;
