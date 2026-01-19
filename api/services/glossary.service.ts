import apiClient from "../client";
import { API_CONFIG } from "../config";
import {
  GlossaryResponse,
  CreateGlossaryRequest,
  UpdateGlossaryRequest,
  TermResponse,
  CreateTermRequest,
  UpdateTermRequest,
  ApiResponse,
  PaginatedResponse,
  GlossaryTermsUpsertResponse,
} from "@/lib/types";
import { ApiErrorHandler } from "../utils/error-handler";

export class GlossaryService {
  /**
   * Get all glossaries
   */
  static async getGlossaries(): Promise<GlossaryResponse[]> {
    try {
      const response = await apiClient.get<PaginatedResponse<GlossaryResponse>>(
        API_CONFIG.ENDPOINTS.GLOSSARIES.BASE, {
            params: { size: 100 }
        }
      );
      
      return response.data.items || [];
    } catch (error) {
      ApiErrorHandler.logError(error, "GlossaryService.getGlossaries");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  /**
   * Get glossary by ID
   */
  static async getGlossaryById(
    id: string,
    params?: { size?: number; page?: number }
  ): Promise<GlossaryResponse> {
    try {
      const response = await apiClient.get<GlossaryResponse>(
        API_CONFIG.ENDPOINTS.GLOSSARIES.BY_ID(id),
        { params }
      );
      
      return response.data;
    } catch (error) {
      ApiErrorHandler.logError(error, "GlossaryService.getGlossaryById");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  /**
   * Create new glossary
   */
  static async createGlossary(
    data: CreateGlossaryRequest
  ): Promise<GlossaryResponse> {
    try {
      const response = await apiClient.post<GlossaryResponse>(
        API_CONFIG.ENDPOINTS.GLOSSARIES.BASE,
        data
      );
      
      return response.data;
    } catch (error) {
      ApiErrorHandler.logError(error, "GlossaryService.createGlossary");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  /**
   * Update existing glossary
   */
  static async updateGlossary(
    id: string,
    data: UpdateGlossaryRequest
  ): Promise<GlossaryResponse> {
    try {
      const response = await apiClient.put<GlossaryResponse>(
        API_CONFIG.ENDPOINTS.GLOSSARIES.BY_ID(id),
        data
      );
      
      return response.data;
    } catch (error) {
      ApiErrorHandler.logError(error, "GlossaryService.updateGlossary");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  /**
   * Delete glossary
   */
  static async deleteGlossary(id: string): Promise<void> {
    try {
      await apiClient.delete(API_CONFIG.ENDPOINTS.GLOSSARIES.BY_ID(id));
    } catch (error) {
      ApiErrorHandler.logError(error, "GlossaryService.deleteGlossary");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  /**
   * Add term to glossary
   */
  static async addTerm(
    glossaryId: string,
    term: CreateTermRequest
  ): Promise<TermResponse> {
    try {
      const response = await apiClient.post<TermResponse>(
        API_CONFIG.ENDPOINTS.GLOSSARIES.TERMS(glossaryId),
        term
      );
      
      return response.data;
    } catch (error) {
      ApiErrorHandler.logError(error, "GlossaryService.addTerm");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  /**
   * Update term in glossary
   */
  static async updateTerm(
    glossaryId: string,
    termId: string,
    term: UpdateTermRequest
  ): Promise<TermResponse> {
    try {
      const response = await apiClient.put<TermResponse>(
        API_CONFIG.ENDPOINTS.GLOSSARIES.TERM_BY_ID(glossaryId, termId),
        term
      );
      
      return response.data;
    } catch (error) {
      ApiErrorHandler.logError(error, "GlossaryService.updateTerm");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  /**
   * Delete term from glossary
   */
  static async deleteTerm(glossaryId: string, termId: string): Promise<void> {
    try {
      await apiClient.delete(
        API_CONFIG.ENDPOINTS.GLOSSARIES.TERM_BY_ID(glossaryId, termId)
      );
    } catch (error) {
      ApiErrorHandler.logError(error, "GlossaryService.deleteTerm");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }
  /**
   * Upsert multiple terms (batch)
   */
  static async upsertTerms(
    glossaryId: string,
    terms: { source: string; target: string }[]
  ): Promise<GlossaryTermsUpsertResponse> {
    try {
      const response = await apiClient.post<GlossaryTermsUpsertResponse>(
        `${API_CONFIG.ENDPOINTS.GLOSSARIES.BASE}/${glossaryId}/terms/upsert`,
        { terms }
      );
      
      return response.data;
    } catch (error) {
      ApiErrorHandler.logError(error, "GlossaryService.upsertTerms");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }
}
