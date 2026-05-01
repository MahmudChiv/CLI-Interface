"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const conf_1 = __importDefault(require("conf"));
const store = new conf_1.default({ projectName: "insighta", configName: "credentials" });
exports.config = {
    getToken: () => store.get("accessToken"),
    setToken: (token) => store.set("accessToken", token),
    getRefreshToken: () => store.get("refreshToken"),
    setRefreshToken: (token) => store.set("refreshToken", token),
    clearToken: () => {
        store.delete("accessToken");
        store.delete("refreshToken");
    },
    // User info (we cache this after login for whoami)
    getUser: () => store.get("user"),
    setUser: (user) => store.set("user", user),
    clearUser: () => store.delete("user"),
    getClientId: () => store.get("clientId") || process.env.INSIGHTA_CLIENT_ID || "",
    setClientId: (id) => store.set("clientId", id),
    getBaseUrl: () => store.get("baseUrl") ||
        "https://hng14-stage-1-production.up.railway.app",
    setBaseUrl: (url) => store.set("baseUrl", url),
    clearAll: () => store.clear(),
};
