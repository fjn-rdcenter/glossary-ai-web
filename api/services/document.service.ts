import apiClient from "../client";
import { API_CONFIG } from "../config";
import {
  SourceDocumentPaginatedResponse,
  SourceDocumentSortField,
  ApiResponse,
} from "@/lib/types";

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
    uploadedFrom?: string,
    uploadedTo?: string
  ): Promise<SourceDocumentPaginatedResponse> {
    const response = await apiClient.get<SourceDocumentPaginatedResponse>(
      API_CONFIG.ENDPOINTS.DOCUMENTS.SOURCE,
      {
        params: {
          page,
          size,
          sort: `${sortBy}:${sortOrder}`,
          search,
          uploadedFrom,
          uploadedTo,
        },
      }
    );

    return response.data;
  }

  /**
   * Delete a document
   */
  static async deleteDocument(documentId: string): Promise<void> {
    await apiClient.delete(
      API_CONFIG.ENDPOINTS.DOCUMENTS.DELETE(documentId)
    );
  }

  /**
   * Download a document
   * Returns a blob which can be used to create a download link
   */
  static async downloadDocument(documentId: string): Promise<Blob> {
    const response = await apiClient.get(
      API_CONFIG.ENDPOINTS.DOCUMENTS.DOWNLOAD(documentId),
      {
        responseType: "blob",
      }
    );
    return response.data;
  }
}
