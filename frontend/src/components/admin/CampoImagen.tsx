import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { subirImagen } from "../../services/eventosService";
import { prepararImagen, urlImagen } from "../../utils/imagenes";

interface Props {
  valor: string;
  onCambio: (url: string) => void;
}

// foto del evento: se puede subir un archivo (arrastrar o elegir) o pegar un enlace
export default function CampoImagen({ valor, onCambio }: Props) {
  const entradaRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [arrastrando, setArrastrando] = useState(false);
  const [verEnlace, setVerEnlace] = useState(() => Boolean(valor) && !valor.startsWith("/uploads/") && !valor.startsWith("/eventos/"));

  const subir = async (archivo?: File) => {
    if (!archivo || subiendo) return;
    setError("");
    setSubiendo(true);
    try {
      const datos = await prepararImagen(archivo);
      const { url } = await subirImagen(datos);
      onCambio(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
      if (entradaRef.current) entradaRef.current.value = "";
    }
  };

  const alElegir = (e: ChangeEvent<HTMLInputElement>) => subir(e.target.files?.[0]);

  const alSoltar = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    subir(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="admin-campo ancho">
      <span>Foto del evento</span>

      <div
        className={`campo-imagen${arrastrando ? " arrastrando" : ""}${valor ? " con-foto" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={alSoltar}
      >
        {valor ? (
          <img src={urlImagen(valor)} alt="Vista previa de la foto del evento" className="campo-imagen-vista" />
        ) : (
          <div className="campo-imagen-vacio" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="9" cy="10" r="2" />
              <path d="M21 16l-5-5-9 9" />
            </svg>
          </div>
        )}

        <div className="campo-imagen-acciones">
          <p className="campo-imagen-texto">
            {subiendo
              ? "Subiendo foto..."
              : valor
                ? "Esta foto se verá en la tarjeta y en el detalle del evento."
                : "Arrastra una foto aquí o elige un archivo (JPG, PNG o WEBP)."}
          </p>
          <div className="campo-imagen-botones">
            <button
              type="button"
              className="admin-boton"
              onClick={() => entradaRef.current?.click()}
              disabled={subiendo}
            >
              {subiendo ? "Subiendo..." : valor ? "Cambiar foto" : "Subir foto"}
            </button>
            {valor && !subiendo && (
              <button type="button" className="admin-boton-sec" onClick={() => onCambio("")}>
                Quitar
              </button>
            )}
            <button type="button" className="campo-imagen-enlace" onClick={() => setVerEnlace((v) => !v)}>
              {verEnlace ? "Ocultar enlace" : "o pegar un enlace"}
            </button>
          </div>
        </div>

        <input
          ref={entradaRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={alElegir}
          hidden
        />
      </div>

      {verEnlace && (
        <input
          type="text"
          name="imagen"
          placeholder="https://..."
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          aria-label="Enlace de la foto"
        />
      )}

      {error && <p className="admin-error">{error}</p>}
    </div>
  );
}
