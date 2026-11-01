import type { ReactNode } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { esAdmin } from "../../config/admins";

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Cargando...</p>;
  if (!user) return <Navigate to="/login" replace />;

  if (!esAdmin(user.email)) {
    return (
      <div className="admin-sin-permiso">
        <h2>No tienes permiso</h2>
        <p>Esta zona es solo para administradores.</p>
        <Link to="/">Volver al inicio</Link>
      </div>
    );
  }

  return <>{children}</>;
}
