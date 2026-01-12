/**
 * Translation Service
 * API calls for document translation
 * 
 * TODO: Implement the actual API calls based on your backend endpoints
 */

import apiClient from "../client";
import { API_CONFIG } from "../config";
import {
  UploadDocumentRequest,
  UploadDocumentResponse,
  StartTranslationRequest,
  StartTranslationResponse,
  TranslationStatusResponse,
  TranslationHistoryResponse,
  PaginatedResponse,
  ApiResponse,
} from "@/lib/types";
import { ApiErrorHandler } from "../utils/error-handler";

export class TranslationService {
  /**
   * Upload document for translation
   */
  static async uploadDocument(
    file: File,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<UploadDocumentResponse> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sourceLanguage", sourceLanguage);
      formData.append("targetLanguage", targetLanguage);

      const response = await apiClient.post<UploadDocumentResponse>(
        API_CONFIG.ENDPOINTS.TRANSLATIONS.UPLOAD,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data;
    } catch (error) {
      ApiErrorHandler.logError(error, "TranslationService.uploadDocument");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  static async startTranslation(
    params: StartTranslationRequest
  ): Promise<StartTranslationResponse> {
    try {
      const response = await apiClient.post<StartTranslationResponse>(
        API_CONFIG.ENDPOINTS.TRANSLATIONS.START,
        params
      );

      return response.data;
    } catch (error) {
      ApiErrorHandler.logError(error, "TranslationService.startTranslation");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  static async getTranslationStatus(
    jobId: string
  ): Promise<TranslationStatusResponse> {
    try {
      const response = await apiClient.get<TranslationStatusResponse>(
        API_CONFIG.ENDPOINTS.TRANSLATIONS.STATUS(jobId)
      );

      return response.data;
    } catch (error) {
      ApiErrorHandler.logError(
        error,
        "TranslationService.getTranslationStatus"
      );
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  static async cancelTranslation(jobId: string): Promise<void> {
    try {
      await apiClient.post(API_CONFIG.ENDPOINTS.TRANSLATIONS.CANCEL(jobId));
    } catch (error) {
      ApiErrorHandler.logError(error, "TranslationService.cancelTranslation");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  static async downloadTranslatedDocument(jobId: string): Promise<Blob> {
    try {
      // 1. Get job details to find the target document ID
      const job = await this.getTranslationStatus(jobId);
      
      if (!job.targetDocument) {
        throw new Error("Translation not yet completed or no target document available");
      }

      // 2. Download the document
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.DOCUMENTS.DOWNLOAD(job.targetDocument),
        {
          responseType: "blob",
        }
      );

      return response.data;
    } catch (error) {
      ApiErrorHandler.logError(
        error,
        "TranslationService.downloadTranslatedDocument"
      );
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  static async getTranslationHistory(): Promise<TranslationHistoryResponse[]> {
    try {
      // Backend returns a paginated response, but we return the items array
      // to maintain compatibility with existing components.
      // We explicitly request a larger size to "simulate" non-paginated history for now
      const response = await apiClient.get<PaginatedResponse<TranslationHistoryResponse>>(
        API_CONFIG.ENDPOINTS.TRANSLATIONS.HISTORY, {
          params: { size: 100 }
        }
      );

      return response.data.items || [];
    } catch (error) {
      ApiErrorHandler.logError(
        error,
        "TranslationService.getTranslationHistory"
      );
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }
  static async downloadOriginalDocument(documentId: string): Promise<Blob> {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.DOCUMENTS.DOWNLOAD(documentId),
        {
          responseType: "blob",
        }
      );

      return response.data;
    } catch (error) {
      ApiErrorHandler.logError(
        error,
        "TranslationService.downloadOriginalDocument"
      );
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }
}
