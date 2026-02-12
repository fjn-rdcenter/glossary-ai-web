import apiClient from "../client";
import { API_CONFIG } from "../config";
import {
  SourceDocumentPaginatedResponse,
  SourceDocumentSortField,
  ApiResponse,
} from "@/lib/types";
import { ApiErrorHandler } from "../utils/error-handler";

export class DocumentService {
  /**
   * Get unique source documents with usage count
   */
  static async getSourceDocuments(
    page: number = 1,
    size: number = 10,
    sortBy: SourceDocumentSortField = "uploadedAt",
    sortOrder: "asc" | "desc" = "desc",
    search?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<SourceDocumentPaginatedResponse> {
    try {
      const response = await apiClient.get<SourceDocumentPaginatedResponse>(
        API_CONFIG.ENDPOINTS.DOCUMENTS.SOURCE,
        {
          params: {
            page,
            size,
            sort: `${sortBy}:${sortOrder}`,
            search,
            fromDate,
            toDate,
          },
        }
      );

      return response.data;
    } catch (error) {
      ApiErrorHandler.logError(error, "DocumentService.getSourceDocuments");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  /**
   * Delete a document
   */
  static async deleteDocument(documentId: string): Promise<void> {
    try {
      await apiClient.delete(
        API_CONFIG.ENDPOINTS.DOCUMENTS.DELETE(documentId)
      );
    } catch (error) {
      ApiErrorHandler.logError(error, "DocumentService.deleteDocument");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  /**
   * Download a document
   * Returns a blob which can be used to create a download link
   */
  static async downloadDocument(documentId: string): Promise<Blob> {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.DOCUMENTS.DOWNLOAD(documentId),
        {
          responseType: "blob",
        }
      );
      return response.data;
    } catch (error) {
        ApiErrorHandler.logError(error, "DocumentService.downloadDocument");
        throw new Error(ApiErrorHandler.parseError(error));
    }
  }
}
