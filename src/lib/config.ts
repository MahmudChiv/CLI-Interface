import Conf from "conf";

const store = new Conf({ projectName: "insighta", configName: "credentials" });

export const config = {
  getToken: (): string | undefined =>
    store.get("access_token") as string | undefined,
  setToken: (token: string) => store.set("access_token", token),

  getRefreshToken: (): string | undefined =>
    store.get("refresh_token") as string | undefined,
  setRefreshToken: (token: string) => store.set("refresh_token", token),

  clearToken: () => {
    store.delete("access_token");
    store.delete("refresh_token");
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
    (store.get("baseUrl") as string) || "http://localhost:4000",
  setBaseUrl: (url: string) => store.set("baseUrl", url),

  clearAll: () => store.clear(),
};
