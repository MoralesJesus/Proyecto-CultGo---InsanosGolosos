import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  loginConGoogle,
  loginConCorreo,
  registrarConCorreo,
} from "../services/firebase";

const traducirError = (codigo: string) => {
  switch (codigo) {
    case "auth/email-already-in-use":
      return "Ese correo ya tiene una cuenta. Intenta iniciar sesión.";
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Correo o contraseña incorrectos.";
    case "auth/user-not-found":
      return "No existe una cuenta con ese correo.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
    default:
      return "Ocurrió un error. Inténtalo de nuevo.";
  }
};

const Login = () => {
  const navigate = useNavigate();
  const [modoRegistro, setModoRegistro] = useState(false);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);

  const handleGoogle = async () => {
    setError("");
    setCargandoGoogle(true);
    try {
      await loginConGoogle();
      navigate("/");
    } catch (e) {
      console.error(e);
      setError("No se pudo iniciar sesión con Google. Inténtalo de nuevo.");
    } finally {
      setCargandoGoogle(false);
    }
  };

  const handleCorreo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      if (modoRegistro) {
        await registrarConCorreo(correo, contrasena, nombre);
      } else {
        await loginConCorreo(correo, contrasena);
      }
      navigate("/");
    } catch (err) {
      const codigo = (err as { code?: string }).code ?? "";
      console.error(err);
      setError(traducirError(codigo));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="pantalla-login">
      <div className="marca-login">
        <h1 className="titulo-animado">CultGo!</h1>
        <p className="subtitulo">Encuentra eventos musicales en Oaxaca de Juarez</p>
      </div>

      <div className="tarjeta-login">
        <div className="encabezado-login" key={modoRegistro ? "registro" : "login"}>
          <h2>{modoRegistro ? "Crear cuenta" : "Bienvenido"}</h2>
          <p className="texto-ayuda">
            {modoRegistro
              ? "Regístrate para ver los eventos y guardar tus favoritos."
              : "Inicia sesión para ver los eventos y guardar tus favoritos."}
          </p>
        </div>

        <form onSubmit={handleCorreo} className="formulario-login">
          {modoRegistro && (
            <div className="campo-con-icono">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
              <input
                type="text"
                placeholder="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
          )}

          <div className="campo-con-icono">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 6 9-6" />
            </svg>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
          </div>

          <div className="campo-con-icono">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <input
              type="password"
              placeholder="Contraseña"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="boton-enviar" disabled={cargando}>
            {cargando ? (
              <>
                <span className="spinner" /> {modoRegistro ? "Creando cuenta..." : "Entrando..."}
              </>
            ) : modoRegistro ? (
              "Crear cuenta"
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        <p className="alternar-modo">
          {modoRegistro ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
          <button
            type="button"
            onClick={() => {
              setModoRegistro(!modoRegistro);
              setError("");
            }}
          >
            {modoRegistro ? "Inicia sesión" : "Regístrate"}
          </button>
        </p>

        {error && <p className="mensaje-error">{error}</p>}

        <div className="separador-login">O CONTINÚA CON</div>

        <button className="boton-google" onClick={handleGoogle} disabled={cargandoGoogle}>
          {cargandoGoogle ? (
            <>
              <span className="spinner" /> Conectando...
            </>
          ) : (
            <>
              <svg className="icono-google" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.9 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.1 35.4 26.7 36 24 36c-5.2 0-9.6-3.1-11.3-7.6l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C40.1 36.5 44 31 44 24c0-1.3-.1-2.7-.4-3.5z"/>
              </svg>
              Google
            </>
          )}
        </button>

        <p className="pie-login">
          Al continuar, aceptas usar tus datos únicamente para identificarte
          en CultGo!
        </p>
      </div>
    </div>
  );
};

export default Login;