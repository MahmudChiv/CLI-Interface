import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { config } from "./config";
import { output } from "./output";

let isRefreshing = false;

let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
}

function createClient(): AxiosInstance {
  const client = axios.create({
    baseURL: config.getBaseUrl(),
    timeout: 15000,
  });

  // REQUEST INTERCEPTOR
  client.interceptors.request.use(
    (requestConfig: InternalAxiosRequestConfig) => {
      const token = config.getToken();
      if (token) {
        requestConfig.headers["Authorization"] = `Bearer ${token}`;
      }

      const user = config.getUser();
      if (!user?.is_active) output.error("Forbidden");

      requestConfig.headers["x-api-version"] = "1";

      console.log("INTERCEPTOR URL:", requestConfig.url);
      console.log("INTERCEPTOR HEADERS:", requestConfig.headers);

      return requestConfig;
    },
  );

  // RESPONSE INTERCEPTOR
  client.interceptors.response.use(
    // Success — just pass through
    (response) => response,

    // Error — this is where the magic happens
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // Only attempt refresh on 401, and only if we haven't already retried.
      // The _retry flag prevents infinite loops.
      if (error.response?.status === 401 && !originalRequest._retry) {
        const refreshToken = config.getRefreshToken();

        // If we have no refresh token, there's nothing we can do — force re-login
        if (!refreshToken) {
          config.clearAll();
          console.error("\n⚠ Session expired. Please run: insighta login");
          process.exit(1);
        }

        // If a refresh is already happening, queue this request up
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers["Authorization"] = `Bearer ${token}`;
              return client(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        // We're the first request to fail — we lead the refresh
        originalRequest._retry = true;
        isRefreshing = true;

        console.log("401 received, attempting refresh...");
        console.log("Refresh token exists:", !!refreshToken);
        console.log(
          "Refresh token value:",
          refreshToken?.substring(0, 20) + "...",
        );

        try {
          // Call the backend's refresh endpoint
          console.log("Calling refresh endpoint...");
          const response = await axios.post(
            `${config.getBaseUrl()}/auth/refresh`,
            { refreshToken },
            {
              timeout: 10000,
              headers: { "Content-Type": "application/json" },
            },
          );

          console.log("Refresh response:", response.data);

          const { accessToken, refreshToken: newRefreshToken } =
            response.data;

          // Save the new tokens
          config.setToken(accessToken);
          config.setRefreshToken(newRefreshToken);

          // Update the header on the original failed request
          originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;

          // Let all the queued requests proceed with the new token
          processQueue(null, accessToken);

          // Retry the original request
          return client(originalRequest);
        } catch (refreshError) {
          // Refresh itself failed — tokens are dead, force re-login
          processQueue(refreshError, null);
          config.clearAll();
          console.error(
            "\n⚠ Session expired and could not be refreshed. Please run: insighta login",
          );
          process.exit(1);
        } finally {
          isRefreshing = false;
        }
      }

      // For non-401 errors, just reject normally
      return Promise.reject(error);
    },
  );

  return client;
}

export const apiClient = createClient();

// ---- Typed API functions ----

export interface Profile {
  id: string;
  name: string;
  gender: string;
  gender_probability: number;
  age: number;
  age_group: string;
  country_id: string;
  country_name: string;
  country_probability: number;
  created_at: string;
}

export interface PaginatedResponse<T> {
  status: string;
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  links: {
    self: string;
    next: string | null;
    prev: string | null;
  };
  data: T[];
}

export interface ProfileFilters {
  gender?: string;
  country_id?: string;
  age_group?: string;
  min_age?: number;
  max_age?: number;
  sort_by?: string;
  order?: string;
  page?: number;
  limit?: number;
}

export const api = {
  // Auth
  refresh: (refreshToken: string) =>
    apiClient.post("/auth/refresh", { refreshToken }),

  logout: () => apiClient.post("/auth/logout"),

  // Profiles
  listProfiles: (filters: ProfileFilters = {}) =>
    apiClient.get<PaginatedResponse<Profile>>("/api/profiles", {
      params: filters,
    }),

  getProfile: (id: string) =>
    apiClient.get<{ status: string; data: Profile }>(`/api/profiles/${id}`),

  searchProfiles: (query: string, filters: ProfileFilters = {}) =>
    apiClient.get<PaginatedResponse<Profile>>("/api/profiles/search", {
      params: { q: query, ...filters },
    }),

  createProfile: (name: string) =>
    apiClient.post<{ status: string; data: Profile }>(
      "/api/profiles",
      { name },
      { timeout: 60000 },
    ),

  exportProfiles: (filters: ProfileFilters = {}) =>
    apiClient.get("/api/profiles/export", {
      params: { format: "csv", ...filters },
      responseType: "text",
    }),
};
