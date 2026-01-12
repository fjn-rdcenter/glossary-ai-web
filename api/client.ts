/**
 * API Client
 * Axios instance with interceptors for authentication and error handling
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { API_CONFIG, BASE_PATH } from "./config";

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage or your auth store
    const token = localStorage.getItem("auth_token");
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Queue for managing concurrent refresh requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });

  failedQueue = [];
};

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Avoid infinite loops
      if (originalRequest.url?.includes(API_CONFIG.ENDPOINTS.AUTH.LOGIN) || 
          originalRequest.url?.includes(API_CONFIG.ENDPOINTS.AUTH.REFRESH)) {
          return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh token
        // We use a fresh axios instance or explicit call to avoid interceptor cycles, 
        // but since we check url above, reusing apiClient is risky if it triggers this same interceptor 
        // on a different failure mode, though specific check for REFRESH url should prevent loop.
        // However, standard practice is to use a separate call or carefully managed state.
        
        // Using fetch to bypass axios interceptors completely involves manual cookie handling which is complex.
        // Safest: Use axios but ensure the refresh endpoint is excluded from 401 trap (checked above).
        
        // Note: We need to import API_CONFIG here, which is already imported.
        // We cannot use AuthService.refreshToken() directly if it uses apiClient, 
        // unless we export a "raw" client or handle it here. 
        // To avoid circular dependency, we implement the refresh call here.
        
        const response = await axios.post(
            `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REFRESH}`,
            {}, 
            { withCredentials: true } // Send cookies
        );

        const newToken = response.data?.data?.access_token || response.data?.access_token || response.data?.token;

        if (newToken) {
            localStorage.setItem("auth_token", newToken);
            apiClient.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
            
            processQueue(null, newToken);
            
            if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return apiClient(originalRequest);
        } else {
            throw new Error("No token returned from refresh");
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Logout user on failed refresh
        if (typeof window !== 'undefined') {
            localStorage.removeItem("auth_token");
            // Clear cookie loosely if possible specific to client logic
            document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            const loginPath = `${BASE_PATH}/login`;

            if (!window.location.pathname.startsWith(loginPath)) {
              window.location.replace(loginPath);
            }
             
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Handle other errors
    return Promise.reject(error);
  }
);

export default apiClient;
