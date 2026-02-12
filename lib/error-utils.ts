export class AppError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: any;
  public originalError?: any;

  constructor(message: string, statusCode: number, code?: string, details?: any, originalError?: any) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.originalError = originalError;
  }
}

export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError;
};

import exceptions from "@/lib/constants/exception.json";

export const getErrorMessage = (error: any): string => {
  if (isAppError(error)) {
    // 1. Try to match specific endpoint errors
    const config = (error.originalError as any)?.config;
    if (config?.url && config?.method) {
      const endpoint = `${config.method.toUpperCase()} ${config.url.replace(config.baseURL || '', '')}`;
      
      // Find matching endpoint key in exceptions (simple path matching for now)
      // Note: This needs to handle path parameters like /glossaries/123 -> /glossaries/{id}
      // For now we do a simple check.
      const exceptionEntries = Object.entries(exceptions);
      
      for (const [key, value] of exceptionEntries) {
        // Simple regex match for path params basic checking
        // Convert /api/v2/glossaries/{glossary_id} to regex /api/v2/glossaries/[^/]+
        // But for exact match keys in JSON are plain strings.
        
        let match = false;
        if (key === endpoint) {
           match = true;
        } else if (key.includes("{")) {
            // Convert template key to regex
            const regexPattern = key.replace(/\{[^}]+\}/g, "[^/]+");
            const regex = new RegExp(`^${regexPattern}$`);
             // Handle BASE_URL stripping which might leave leading slash issues or not
            if (regex.test(endpoint)) {
                match = true;
            }
        } else if (key === config.url) { // sometimes url is relative like /api/v2/...
            match = true;
        } else if (config.url && key === config.url.replace(config.baseURL || '', '')) {
             // Handle case where key is just path without method
             match = true;
        }

        if (match) {
             const endpointErrors = value as Record<string, any>;
             // Look for matching status code
             for (const errType in endpointErrors) {
                 const errDef = endpointErrors[errType];
                 if (errDef.code === error.statusCode) {
                     // PRIORITIZE SPECIFIC BACKEND DETAILS FOR CLIENT ERRORS
                     // If the error confirms to the "exception.json" schema (roughly)
                     // and we have a specific detail message from the backend, use it.
                     // But avoid using "detail" for Server Errors (500) as they are usually technical.
                     if (error.statusCode < 500 && error.details && typeof error.details === "string") {
                         return error.details;
                     }

                     // If the error object itself carries a meaningful message (propagated from backend response in client.ts),
                     // prefer it over the generic message in exception.json (e.g. "Conflict").
                     if (error.statusCode < 500 && error.message && error.message !== "An unexpected error occurred" && error.message !== "Network error. Please check your connection.") {
                        return error.message;
                     }

                     // Fallback to the mapped message from exception.json
                     return errDef.message;
                 }
             }
        }
      }
    }

    // 2. Fallback to generic errors if defined in exceptions (like "unauthorized")
    if (error.statusCode === 401 && (exceptions as any)["unauthorized"]) {
        return (exceptions as any)["unauthorized"].message;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred.";
};

export const getErrorDetails = (error: any): string | null => {
  if (!isAppError(error) || !error.details) {
    return null;
  }

  if (typeof error.details === "string") {
    return error.details;
  }
  
  // Handle FastAPI validation errors (array of objects)
  if (Array.isArray(error.details)) {
      return error.details.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
  }

  return JSON.stringify(error.details);
};
