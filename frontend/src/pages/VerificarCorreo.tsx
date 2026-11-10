import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { reenviarVerificacion, cerrarSesion, auth } from "../services/firebase";

const VerificarCorreo = () => {
  const navigate = useNavigate();
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

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

  const handleYaVerifique = async () => {
    // recarga los datos del usuario para ver si ya se verificó
    await auth.currentUser?.reload();
    if (auth.currentUser?.emailVerified) {
      navigate("/");
    } else {
      alert("Todavía no detectamos la verificación. Revisa tu correo e inténtalo de nuevo.");
    }
  };

  return (
    <div className="pantalla-login">
      <div className="marca-login">
        <h1 className="titulo-animado">CultGo!</h1>
      </div>

      <div className="tarjeta-login">
        <h2>Verifica tu correo</h2>
        <p className="texto-ayuda">
          Te enviamos un enlace de verificación a <strong>{auth.currentUser?.email}</strong>.
          Ábrelo para poder continuar.
        </p>

        <button className="boton-enviar" onClick={handleYaVerifique} style={{ marginBottom: "10px" }}>
          Ya verifiqué mi correo
        </button>

        <button
          className="boton-google"
          onClick={handleReenviar}
          disabled={cargando || enviado}
        >
          {cargando ? "Enviando..." : enviado ? "Correo reenviado ✓" : "Reenviar correo"}
        </button>

        <p className="alternar-modo" style={{ marginTop: "20px" }}>
          <button type="button" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </p>
      </div>
    </div>
  );
};

export default VerificarCorreo;