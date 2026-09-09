/**
 * API Module Index
 * Main entry point for API integration
 * 
 * Usage:
 * import { GlossaryService, TranslationService, AuthService } from '@/api';
 * 
 * Or import specific items:
 * import { API_CONFIG } from '@/api';
 * import type { GlossaryResponse } from '@/api';
 */

// Export configuration
export { API_CONFIG, BASE_PATH } from "./config";

// Export client
export { default as apiClient } from "./client";

// Export services
export * from "./services";

// Export types
export * from "./types";

// Export utilities
export * from "./utils/error-handler";
