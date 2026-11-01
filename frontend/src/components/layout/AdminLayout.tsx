import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { cerrarSesion } from "../../services/firebase";

export default function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const nombre = user?.displayName || user?.email || "Admin";
  const inicial = nombre.charAt(0).toUpperCase();

  const salir = async () => {
    await cerrarSesion();
    navigate("/login");
  };

  return (
    <div className="admin-contenedor">
      <aside className="admin-menu">
        <div className="admin-marca">
          CultGo!<span>Admin</span>
        </div>

        <nav className="admin-nav">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => (isActive ? "activo" : "")}
          >
            Inicio
          </NavLink>
          <NavLink
            to="/admin/eventos"
            className={({ isActive }) => (isActive ? "activo" : "")}
          >
            Eventos
          </NavLink>
          <Link to="/">Ver sitio</Link>
        </nav>

        <div className="admin-usuario">
          <div className="admin-avatar">{inicial}</div>
          <p>{user?.email}</p>
          <button onClick={salir}>Cerrar sesión</button>
        </div>
      </aside>

      <div className="admin-principal">
        <header className="admin-barra">
          <span>Panel de administración</span>
          <span>
            Hola, <strong>{nombre}</strong>
          </span>
        </header>

        <main className="admin-contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
