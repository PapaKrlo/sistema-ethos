"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../_lib/auth/AuthContext";

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export default function RoleProtectedRoute({ 
  children, 
  allowedRoles, 
  redirectTo = "/dashboard" 
}: RoleProtectedRouteProps) {
  const { role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !allowedRoles.includes(role as string)) {
      router.push(redirectTo);
    }
  }, [role, isLoading, allowedRoles, redirectTo, router]);

  // Mostrar loader mientras comprueba la autenticación
  if (isLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#008A4B]"></div>
      </div>
    );
  }

  // No mostrar nada si el usuario no tiene el rol adecuado
  if (!allowedRoles.includes(role as string)) {
    return null;
  }

  // Si el usuario tiene el rol adecuado, mostrar el contenido
  return <>{children}</>;
} 