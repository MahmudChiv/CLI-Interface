import Conf from "conf";

const store = new Conf({ projectName: "insighta", configName: "credentials" });

export const config = {
  getToken: (): string | undefined =>
    store.get("accessToken") as string | undefined,
  setToken: (token: string) => store.set("accessToken", token),

  getRefreshToken: (): string | undefined =>
    store.get("refreshToken") as string | undefined,
  setRefreshToken: (token: string) => store.set("refreshToken", token),

  clearToken: () => {
    store.delete("accessToken");
    store.delete("refreshToken");
  },

  // User info (we cache this after login for whoami)
  getUser: () =>
    store.get("user") as
      | { username: string; email: string; role: string; is_active: boolean }
      | undefined,
  setUser: (user: {
    username: string;
    email: string;
    role: string;
    is_active: boolean;
  }) => store.set("user", user),
  clearUser: () => store.delete("user"),

  getClientId: (): string =>
    (store.get("clientId") as string) || process.env.INSIGHTA_CLIENT_ID || "",
  setClientId: (id: string) => store.set("clientId", id),

  getBaseUrl: (): string =>
    (store.get("baseUrl") as string) ||
    "https://hng14-stage-1-production.up.railway.app",
  setBaseUrl: (url: string) => store.set("baseUrl", url),

  clearAll: () => store.clear(),
};
