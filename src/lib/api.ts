const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_URL) {
  throw new Error(
    "FATAL ERROR: NEXT_PUBLIC_API_BASE_URL environment variable is not defined."
  );
}

const clearBrowserSession = () => {
  if (typeof window === "undefined") {
    return;
  }

  console.log("[Auth] Invalid token detected. Clearing browser session.");
  window.localStorage.removeItem("authToken");
  window.localStorage.removeItem("user");
  document.cookie =
    "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
};

const resolveBrowserToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem("authToken");
  } catch (error) {
    console.warn("[apiClient] Unable to read auth token from localStorage.", error);
    return null;
  }
};

type ApiClientOptions = RequestInit & {
  token?: string | null;
  skipContentTypeHeader?: boolean;
  onUnauthorized?: () => void;
};

export const apiClient = async (
  endpoint: string,
  {
    token,
    skipContentTypeHeader,
    onUnauthorized,
    ...requestInit
  }: ApiClientOptions = {}
) => {
  const headers = new Headers(requestInit.headers);

  if (!skipContentTypeHeader && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const authToken = token ?? resolveBrowserToken();
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const requestConfig: RequestInit = {
    ...requestInit,
    headers,
  };

  const fullUrl = `${API_URL}${endpoint}`;

  try {
    const response = await fetch(fullUrl, requestConfig);

    if (response.status === 401 || response.status === 403) {
      if (typeof window !== "undefined") {
        clearBrowserSession();
        window.location.href = "/login";
      }
      onUnauthorized?.();
      throw new Error("Unauthorized request");
    }

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      throw new Error(
        errorData.message ||
          `API request failed with status ${response.status}`
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }

    return response;
  } catch (error) {
    console.error(`[apiClient] Error fetching ${fullUrl}:`, error);
    throw error;
  }
};
