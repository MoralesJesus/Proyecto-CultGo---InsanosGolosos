import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Cargando...</p>;
  if (!user) return <Navigate to="/login" replace />;

  // si el usuario entro con correo/contraseña y no ha verificado su correo,
  // lo mandamos a la pantalla de verificacion antes de dejarlo pasar
  if (!user.emailVerified) {
    return <Navigate to="/verificar-correo" replace />;
  }

  return <>{children}</>;
}