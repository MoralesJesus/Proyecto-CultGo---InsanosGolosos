import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { reenviarVerificacion, cerrarSesion, auth } from "../services/firebase";
import { useAuth } from "../context/AuthContext";

const VerificarCorreo = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  // si ya no hay sesion, regresa al login
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  // revisa cada 3 segundos si el usuario ya verifico su correo,
  // y lo manda a la pagina principal en cuanto lo haga
  useEffect(() => {
    const intervalo = setInterval(async () => {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        clearInterval(intervalo);
        // recarga para que el estado de sesion se actualice con el correo ya verificado
        window.location.href = "/";
      }
    }, 3000);

    return () => clearInterval(intervalo);
  }, []);

  const handleReenviar = async () => {
    setCargando(true);
    try {
      await reenviarVerificacion();
      setEnviado(true);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  const handleVolver = async () => {
    await cerrarSesion();
    navigate("/login", { replace: true });
  };

  return (
    <div className="pantalla-login">
      <div className="marca-login">
        <h1 className="titulo-animado">CultGo!</h1>
      </div>

      <div className="tarjeta-login">
        <h2>Verifica tu correo</h2>
        <p className="texto-ayuda">
          Te enviamos un enlace de verificación a <strong>{user?.email}</strong>.
          Ábrelo para continuar; esta página se actualizará sola en cuanto lo confirmes.
        </p>

        <button
          className="boton-google"
          onClick={handleReenviar}
          disabled={cargando || enviado}
        >
          {cargando ? "Enviando..." : enviado ? "Correo reenviado ✓" : "Reenviar correo"}
        </button>

        <p className="alternar-modo" style={{ marginTop: "20px" }}>
          <button type="button" onClick={handleVolver}>
            ← Volver al inicio de sesión
          </button>
        </p>
      </div>
    </div>
  );
};

export default VerificarCorreo;