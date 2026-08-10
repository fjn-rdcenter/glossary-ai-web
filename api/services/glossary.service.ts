import apiClient from "../client";
import { API_CONFIG } from "../config";
import {
  GlossaryResponse,
  GlossaryDetailResponse,
  CreateGlossaryRequest,
  UpdateGlossaryRequest,
  TermResponse,
  CreateTermRequest,
  UpdateTermRequest,
  ApiResponse,
  PaginatedResponse,
  GlossaryTermsUpsertResponse,
  GlossaryPermissionAdminResponse,
  GlossaryPermissionCreate,
  GlossaryPermissionUpdate,
  GlossaryPermissionBaseResponse,
  MyGlossaryPermissionResponse,
} from "@/lib/types";

export class GlossaryService {
  static async getGlossaries(
    search?: string
  ): Promise<GlossaryResponse[]>;
  static async getGlossaries(
    params: { search?: string; page?: number; size?: number }
  ): Promise<PaginatedResponse<GlossaryResponse>>;
  static async getGlossaries(
    searchOrParams?: string | { search?: string; page?: number; size?: number }
  ): Promise<GlossaryResponse[] | PaginatedResponse<GlossaryResponse>> {
    try {
      const params: Record<string, any> = {};
      let isPaginationRequest = false;

      if (typeof searchOrParams === "string") {
        params.size = 100;
        if (searchOrParams) params.search = searchOrParams;
      } else if (searchOrParams && typeof searchOrParams === "object") {
        isPaginationRequest = true;
        if (searchOrParams.size !== undefined) params.size = searchOrParams.size;
        if (searchOrParams.page !== undefined) params.page = searchOrParams.page;
        if (searchOrParams.search) params.search = searchOrParams.search;
      } else {
        params.size = 100;
      }

      const response = await apiClient.get<PaginatedResponse<GlossaryResponse>>(
        API_CONFIG.ENDPOINTS.GLOSSARIES.BASE, { params }
      );

      if (isPaginationRequest) {
        return response.data;
      }

      return response.data.items || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get public glossaries from marketplace
   */
  static async getPublicGlossaries(
    search?: string
  ): Promise<GlossaryResponse[]>;
  static async getPublicGlossaries(
    params: { search?: string; page?: number; size?: number }
  ): Promise<PaginatedResponse<GlossaryResponse>>;
  static async getPublicGlossaries(
    searchOrParams?: string | { search?: string; page?: number; size?: number }
  ): Promise<GlossaryResponse[] | PaginatedResponse<GlossaryResponse>> {
    try {
      const params: Record<string, any> = {};
      let isPaginationRequest = false;

      if (typeof searchOrParams === "string") {
        params.size = 100;
        if (searchOrParams) params.search = searchOrParams;
      } else if (searchOrParams && typeof searchOrParams === "object") {
        isPaginationRequest = true;
        if (searchOrParams.size !== undefined) params.size = searchOrParams.size;
        if (searchOrParams.page !== undefined) params.page = searchOrParams.page;
        if (searchOrParams.search) params.search = searchOrParams.search;
      } else {
        params.size = 100;
      }

      const response = await apiClient.get<PaginatedResponse<GlossaryResponse>>(
        API_CONFIG.ENDPOINTS.GLOSSARIES.PUBLIC, { params }
      );

      if (isPaginationRequest) {
        return response.data;
      }

      return response.data.items || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get glossaries shared with current user
   */
  static async getSharedWithMeGlossaries(
    search?: string
  ): Promise<GlossaryResponse[]>;
  static async getSharedWithMeGlossaries(
    params: { search?: string; page?: number; size?: number }
  ): Promise<PaginatedResponse<GlossaryResponse>>;
  static async getSharedWithMeGlossaries(
    searchOrParams?: string | { search?: string; page?: number; size?: number }
  ): Promise<GlossaryResponse[] | PaginatedResponse<GlossaryResponse>> {
    try {
      const params: Record<string, any> = {};
      let isPaginationRequest = false;

      if (typeof searchOrParams === "string") {
        params.size = 100;
        if (searchOrParams) params.search = searchOrParams;
      } else if (searchOrParams && typeof searchOrParams === "object") {
        isPaginationRequest = true;
        if (searchOrParams.size !== undefined) params.size = searchOrParams.size;
        if (searchOrParams.page !== undefined) params.page = searchOrParams.page;
        if (searchOrParams.search) params.search = searchOrParams.search;
      } else {
        params.size = 100;
      }

      const response = await apiClient.get<PaginatedResponse<GlossaryResponse>>(
        API_CONFIG.ENDPOINTS.GLOSSARIES.SHARED_WITH_ME, { params }
      );

      if (isPaginationRequest) {
        return response.data;
      }

      return response.data.items || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get glossary by ID
   */
  static async getGlossaryById(
    id: string,
    params?: { size?: number; page?: number; sort?: string; search?: string }
  ): Promise<GlossaryDetailResponse> {
    try {
      const response = await apiClient.get<GlossaryDetailResponse>(
        API_CONFIG.ENDPOINTS.GLOSSARIES.BY_ID(id),
        { params }
      );

      return response.data;
    } catch (error) {
      throw error;
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
      throw error;
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
      throw error;
    }
  }

  /**
   * Delete glossary
   */
  static async deleteGlossary(id: string): Promise<void> {
    try {
      await apiClient.delete(API_CONFIG.ENDPOINTS.GLOSSARIES.BY_ID(id));
    } catch (error) {
      throw error;
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
      throw error;
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
      throw error;
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
      throw error;
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
      throw error;
    }
  }

  /**
   * Get permissions for a glossary
   */
  static async getGlossaryPermissions(id: string): Promise<GlossaryPermissionAdminResponse> {
    try {
      const response = await apiClient.get<GlossaryPermissionAdminResponse>(
        API_CONFIG.ENDPOINTS.GLOSSARIES.PERMISSIONS(id)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new permission for a glossary
   */
  static async createGlossaryPermission(
    id: string,
    data: GlossaryPermissionCreate
  ): Promise<GlossaryPermissionBaseResponse> {
    try {
      const response = await apiClient.post<GlossaryPermissionBaseResponse>(
        API_CONFIG.ENDPOINTS.GLOSSARIES.PERMISSIONS(id),
        data
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a permission for a glossary
   */
  static async updateGlossaryPermission(
    id: string,
    permissionId: string,
    data: GlossaryPermissionUpdate
  ): Promise<GlossaryPermissionBaseResponse> {
    try {
      const response = await apiClient.patch<GlossaryPermissionBaseResponse>(
        API_CONFIG.ENDPOINTS.GLOSSARIES.PERMISSION_BY_ID(id, permissionId),
        data
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a permission from a glossary
   */
  static async deleteGlossaryPermission(id: string, permissionId: string): Promise<void> {
    try {
      await apiClient.delete(
        API_CONFIG.ENDPOINTS.GLOSSARIES.PERMISSION_BY_ID(id, permissionId)
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current user's permission for a glossary
   */
  static async getMyPermission(id: string): Promise<MyGlossaryPermissionResponse> {
    try {
      const response = await apiClient.get<MyGlossaryPermissionResponse>(
        API_CONFIG.ENDPOINTS.GLOSSARIES.MY_PERMISSION(id)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clone a glossary
   */
  static async cloneGlossary(id: string, data: { name?: string | null; description?: string | null }): Promise<GlossaryResponse> {
    try {
      const response = await apiClient.post<GlossaryResponse>(
        API_CONFIG.ENDPOINTS.GLOSSARIES.CLONE(id),
        data
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Recommend glossary for a file
   */
  static async recommendGlossary(fileId: string): Promise<{ terms: { source: string; target: string }[] }> {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.GLOSSARIES.RECOMMEND,
        { fileId },
        { timeout: 180000 }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}
