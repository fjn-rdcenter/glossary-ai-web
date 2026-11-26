/**
 * Translation Service
 * API calls for document translation
 * 
 * TODO: Implement the actual API calls based on your backend endpoints
 */

import apiClient from "../client";
import { API_CONFIG } from "../config";
import { watchJob } from "../job-watch";
import {
  UploadDocumentRequest,
  UploadDocumentResponse,
  StartTranslationRequest,
  StartTranslationResponse,
  StartTranslationJobRequest,
  TranslationTableResponse,
  TranslationTableUpdate,
  TranslationTableBatchUpdate,
  GenerateTranslationResponse,
  TranslationStatusResponse,
  TranslationHistoryResponse,
  PaginatedResponse,
  ApiResponse,
} from "@/lib/types";

export class TranslationService {
  /**
   * Upload document for translation
   */
  static async uploadDocument(
    file: File,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<UploadDocumentResponse> {
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
  }

  static async startTranslation(
    params: StartTranslationRequest
  ): Promise<StartTranslationResponse> {
    const response = await apiClient.post<StartTranslationResponse>(
      API_CONFIG.ENDPOINTS.TRANSLATIONS.START,
      params
    );

    return response.data;
  }

  static async createTranslation(
    params: StartTranslationRequest
  ): Promise<StartTranslationResponse> {
    const response = await apiClient.post<StartTranslationResponse>(
      API_CONFIG.ENDPOINTS.TRANSLATIONS.CREATE,
      params
    );

    return response.data;
  }

  static async startCreatedTranslation(
    params: StartTranslationJobRequest
  ): Promise<StartTranslationResponse> {
    const response = await apiClient.post<StartTranslationResponse>(
      API_CONFIG.ENDPOINTS.TRANSLATIONS.START_PIPELINE,
      params
    );

    return response.data;
  }

  static async getTranslationTables(
    translationId: string,
    page = 1,
    size = 100,
  ): Promise<PaginatedResponse<TranslationTableResponse>> {
    const response = await apiClient.get<PaginatedResponse<TranslationTableResponse>>(
      API_CONFIG.ENDPOINTS.TRANSLATIONS.TABLES(translationId),
      {params: {page, size, sort: "path:asc"}},
    );

    return response.data;
  }

  static async updateTranslationTables(
    translationId: string,
    data: TranslationTableBatchUpdate,
  ): Promise<TranslationTableResponse[]> {
    const response = await apiClient.patch<TranslationTableResponse[]>(
      API_CONFIG.ENDPOINTS.TRANSLATIONS.TABLES_BATCH(translationId),
      data,
    );

    return response.data;
  }

  static async updateTranslationTable(
    translationId: string,
    tableId: string,
    data: TranslationTableUpdate,
  ): Promise<TranslationTableResponse> {
    const response = await apiClient.patch<TranslationTableResponse>(
      API_CONFIG.ENDPOINTS.TRANSLATIONS.TABLE(translationId, tableId),
      data,
    );

    return response.data;
  }

  static async generateTranslation(
    translationId: string,
  ): Promise<GenerateTranslationResponse> {
    const response = await apiClient.post<GenerateTranslationResponse>(
      API_CONFIG.ENDPOINTS.TRANSLATIONS.GENERATE,
      {translationId},
    );

    return response.data;
  }

  static async getTranslationStatus(
    jobId: string
  ): Promise<TranslationStatusResponse> {
    const response = await apiClient.get<TranslationStatusResponse>(
      API_CONFIG.ENDPOINTS.TRANSLATIONS.STATUS(jobId)
    );

    return response.data;
  }

  /**
   * Follow a job until it ends, calling `onUpdate` with each change. Uses the push stream while it is up and
   * polls while it is not. Resolves with the finished job, or `null` once `isStopped` returns true.
   */
  static watchJob(
    initial: TranslationStatusResponse,
    options: { onUpdate: (job: TranslationStatusResponse) => void; isStopped: () => boolean },
  ): Promise<TranslationStatusResponse | null> {
    return watchJob(initial, { ...options, fetchJob: () => TranslationService.getTranslationStatus(initial.id) });
  }

  static async cancelTranslation(jobId: string): Promise<void> {
    await apiClient.get(API_CONFIG.ENDPOINTS.TRANSLATIONS.CANCEL(jobId));
  }

  static async downloadTranslatedDocument(jobId: string): Promise<Blob> {
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
  }

  static async getTranslationHistory(): Promise<TranslationHistoryResponse[]>;
  static async getTranslationHistory(
    params: {
      page?: number;
      size?: number;
      sort?: string;
      search?: string;
      startedFrom?: string;
      startedTo?: string;
      status?: string;
    }
  ): Promise<PaginatedResponse<TranslationHistoryResponse>>;
  static async getTranslationHistory(
    params?: {
      page?: number;
      size?: number;
      sort?: string;
      search?: string;
      startedFrom?: string;
      startedTo?: string;
      status?: string;
    }
  ): Promise<TranslationHistoryResponse[] | PaginatedResponse<TranslationHistoryResponse>> {
    const isPaginationRequest = !!params;
    const requestParams = params || { size: 100 };

    const response = await apiClient.get<PaginatedResponse<TranslationHistoryResponse>>(
      API_CONFIG.ENDPOINTS.TRANSLATIONS.HISTORY, {
        params: requestParams
      }
    );

    if (isPaginationRequest) {
      return response.data;
    }

    return response.data.items || [];
  }
  static async downloadOriginalDocument(documentId: string): Promise<Blob> {
    const response = await apiClient.get(
      API_CONFIG.ENDPOINTS.DOCUMENTS.DOWNLOAD(documentId),
      {
        responseType: "blob",
      }
    );

    return response.data;
  }
}
