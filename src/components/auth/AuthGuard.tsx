// En: components/auth/AuthGuard.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api"; // Importamos el apiClient

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated,
    isLoading: isAuthContextLoading,
    logout,
  } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Solo ejecutamos la verificación si el contexto terminó de cargar
    // y encontró un token que cree que es válido.
    if (isAuthContextLoading) {
      return;
    }

    if (!isAuthenticated) {
      // Si el contexto ya sabe que no hay autenticación, redirigimos.
      setIsVerifying(false);
      router.push("/login");
      return;
    }

    // --- ¡VERIFICACIÓN ACTIVA AL CARGAR! ---
    // Hacemos una llamada ligera a la API (ej. obtener profesores)
    // para validar el token. Si falla, el apiClient se encargará del logout.
    const verifyToken = async () => {
      try {
        // Usamos una llamada que sabemos que debe funcionar si estamos logueados.
        await apiClient("api/professors?limit=1");
        console.log("[AuthGuard] Verificación de token exitosa.");
        setIsVerifying(false);
      } catch (error) {
        console.error("[AuthGuard] La verificación del token falló.", error);
        // El apiClient ya habrá iniciado el proceso de logout, pero por si acaso:
        logout();
      }
    };

    verifyToken();
  }, [isAuthContextLoading, isAuthenticated, router, logout]);

  // Mostramos el loader mientras el contexto carga O mientras verificamos el token.
  if (isAuthContextLoading || isVerifying) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-light-background dark:bg-dark-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Si todo está correcto, renderizamos el contenido protegido.
  return <>{children}</>;
}
