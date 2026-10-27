import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginConGoogle } from "../services/firebase";

const Login = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    setError("");
    setCargando(true);
    try {
      await loginConGoogle();
      navigate("/");
    } catch (e) {
      console.error(e);
      setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <h1>CultGo!</h1>
      <p>Inicia sesión para continuar</p>
      <button onClick={handleLogin} disabled={cargando}>
        {cargando ? "Conectando..." : "Continuar con Google"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default Login;