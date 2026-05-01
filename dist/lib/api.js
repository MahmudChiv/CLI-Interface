"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.apiClient = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
const output_1 = require("./output");
let isRefreshing = false;
let failedQueue = [];
function processQueue(error, token) {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        }
        else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
}
function createClient() {
    const client = axios_1.default.create({
        baseURL: config_1.config.getBaseUrl(),
        timeout: 15000,
    });
    // REQUEST INTERCEPTOR
    client.interceptors.request.use((requestConfig) => {
        const token = config_1.config.getToken();
        if (token) {
            requestConfig.headers["Authorization"] = `Bearer ${token}`;
        }
        const user = config_1.config.getUser();
        if (!user?.is_active)
            output_1.output.error("Forbidden");
        requestConfig.headers["x-api-version"] = "1";
        console.log("INTERCEPTOR URL:", requestConfig.url);
        console.log("INTERCEPTOR HEADERS:", requestConfig.headers);
        return requestConfig;
    });
    // RESPONSE INTERCEPTOR
    client.interceptors.response.use(
    // Success — just pass through
    (response) => response, 
    // Error — this is where the magic happens
    async (error) => {
        const originalRequest = error.config;
        // Only attempt refresh on 401, and only if we haven't already retried.
        // The _retry flag prevents infinite loops.
        if (error.response?.status === 401 && !originalRequest._retry) {
            const refreshToken = config_1.config.getRefreshToken();
            // If we have no refresh token, there's nothing we can do — force re-login
            if (!refreshToken) {
                config_1.config.clearAll();
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
            console.log("Refresh token value:", refreshToken?.substring(0, 20) + "...");
            try {
                // Call the backend's refresh endpoint
                console.log("Calling refresh endpoint...");
                const response = await axios_1.default.post(`${config_1.config.getBaseUrl()}/auth/refresh`, { refreshToken }, {
                    timeout: 10000,
                    headers: { "Content-Type": "application/json" },
                });
                console.log("Refresh response:", response.data);
                const { accessToken, refreshToken: newRefreshToken } = response.data;
                // Save the new tokens
                config_1.config.setToken(accessToken);
                config_1.config.setRefreshToken(newRefreshToken);
                // Update the header on the original failed request
                originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
                // Let all the queued requests proceed with the new token
                processQueue(null, accessToken);
                // Retry the original request
                return client(originalRequest);
            }
            catch (refreshError) {
                // Refresh itself failed — tokens are dead, force re-login
                processQueue(refreshError, null);
                config_1.config.clearAll();
                console.error("\n⚠ Session expired and could not be refreshed. Please run: insighta login");
                process.exit(1);
            }
            finally {
                isRefreshing = false;
            }
        }
        // For non-401 errors, just reject normally
        return Promise.reject(error);
    });
    return client;
}
exports.apiClient = createClient();
exports.api = {
    // Auth
    refresh: (refreshToken) => exports.apiClient.post("/auth/refresh", { refreshToken }),
    logout: () => exports.apiClient.post("/auth/logout"),
    // Profiles
    listProfiles: (filters = {}) => exports.apiClient.get("/api/profiles", {
        params: filters,
    }),
    getProfile: (id) => exports.apiClient.get(`/api/profiles/${id}`),
    searchProfiles: (query, filters = {}) => exports.apiClient.get("/api/profiles/search", {
        params: { q: query, ...filters },
    }),
    createProfile: (name) => exports.apiClient.post("/api/profiles", { name }, { timeout: 60000 }),
    exportProfiles: (filters = {}) => exports.apiClient.get("/api/profiles/export", {
        params: { format: "csv", ...filters },
        responseType: "text",
    }),
};
