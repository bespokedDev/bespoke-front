"use client";

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

// Definimos los tipos para el usuario y el contexto
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isLoading: boolean;
}

// Creamos el contexto con un valor por defecto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Creamos el AuthProvider, que envolverá nuestra aplicación
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Para saber si estamos verificando el estado inicial
  const router = useRouter();

  useEffect(() => {
    // Al cargar la app, intentamos recuperar el token y los datos del usuario del localStorage
    try {
      const storedToken = localStorage.getItem("authToken");
      const storedUser = localStorage.getItem("user");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse auth data from localStorage", error);
      // Si hay un error, limpiamos el storage
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, userData: User) => {
    // Guardamos el token y los datos del usuario en el estado y en localStorage
    setToken(newToken);
    setUser(userData);
    localStorage.setItem("authToken", newToken);
    localStorage.setItem("user", JSON.stringify(userData));
    // Guardamos el token en las cookies para que el middleware pueda acceder a él
    document.cookie = `authToken=${newToken}; path=/; max-age=86400; SameSite=Strict;`; // max-age=1 day
    router.push("/"); // Redirigimos al dashboard o a la página principal
  };

  const logout = () => {
    // Limpiamos el estado y el localStorage
    setToken(null);
    setUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    // Eliminamos la cookie
    document.cookie =
      "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
    router.push("/login"); // Redirigimos a la página de login
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        user,
        token,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto de autenticación más fácilmente
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
