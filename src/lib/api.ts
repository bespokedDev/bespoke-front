// En: lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_URL) {
  throw new Error("FATAL ERROR: NEXT_PUBLIC_API_URL is not defined.");
}

const handleLogout = () => {
  // Esta función centraliza el cierre de sesión para ser llamada desde cualquier lugar.
  console.log("[Auth] Token inválido o sesión expirada. Cerrando sesión...");
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
  document.cookie =
    "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
  // Redirigimos forzosamente al login
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("authToken");
  }
  return null;
};

export const apiClient = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  headers.append("Content-Type", "application/json");

  if (token) {
    headers.append("Authorization", `Bearer ${token}`);
  }

  const config: RequestInit = { ...options, headers };
  const fullUrl = `${API_URL}${endpoint}`;

  try {
    const response = await fetch(fullUrl, config);

    // --- ¡VERIFICACIÓN ACTIVA AQUÍ! ---
    // Si la API nos dice que no estamos autorizados, cerramos sesión.
    if (response.status === 401 || response.status === 403) {
      handleLogout();
      // Devolvemos una promesa que nunca se resuelve para detener la cadena.
      return new Promise(() => {});
    }

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      throw new Error(
        errorData.message || `API request failed with status ${response.status}`
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }

    return response;
  } catch (error) {
    console.error(`[apiClient] Error fetching ${fullUrl}:`, error);
    // Si la API está apagada, el fetch fallará. Aquí podríamos decidir qué hacer.
    // Por ahora, relanzamos el error para que el componente lo maneje.
    throw error;
  }
};
