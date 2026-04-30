"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const conf_1 = __importDefault(require("conf"));
const store = new conf_1.default({ projectName: "insighta", configName: "credentials" });
exports.config = {
    getToken: () => store.get("access_token"),
    setToken: (token) => store.set("access_token", token),
    getRefreshToken: () => store.get("refresh_token"),
    setRefreshToken: (token) => store.set("refresh_token", token),
    clearToken: () => {
        store.delete("access_token");
        store.delete("refresh_token");
    },
    // User info (we cache this after login for whoami)
    getUser: () => store.get("user"),
    setUser: (user) => store.set("user", user),
    clearUser: () => store.delete("user"),
    getClientId: () => store.get("clientId") || process.env.INSIGHTA_CLIENT_ID || "",
    setClientId: (id) => store.set("clientId", id),
    getBaseUrl: () => store.get("baseUrl") || "http://localhost:4000",
    setBaseUrl: (url) => store.set("baseUrl", url),
    clearAll: () => store.clear(),
};
