import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEventos } from "../../context/useEventos";
import { a12Horas, a24Horas, dmaAIso, esExpirado, isoADma } from "../../utils/formato";
import type { EstadoEvento, Evento } from "../../types";

const ESTADOS: { valor: EstadoEvento; texto: string }[] = [
  { valor: "activo", texto: "Activo" },
  { valor: "reprogramado", texto: "Reprogramado" },
  { valor: "cancelado", texto: "Cancelado" },
  { valor: "finalizado", texto: "Finalizado" },
];

// valores al crear un evento nuevo (coordenadas del centro de Oaxaca)
const vacio = {
  nombre: "",
  artista: "",
  genero: "",
  fecha: "",
  hora: "",
  lugar: "",
  direccion: "",
  latitud: "17.0654",
  longitud: "-96.7237",
  descripcion: "",
  enlaceSpotify: "",
  enlaceYoutube: "",
  imagen: "",
  estado: "activo" as EstadoEvento,
};

function Formulario({ evento }: { evento?: Evento }) {
  const navigate = useNavigate();
  const { eventos, agregar, editar } = useEventos();
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // si es edicion, el formulario arranca con los datos del evento
  const [datos, setDatos] = useState(() =>
    evento
      ? {
          nombre: evento.nombre,
          artista: evento.artista,
          genero: evento.genero,
          fecha: dmaAIso(evento.fecha),
          hora: a24Horas(evento.hora),
          lugar: evento.lugar,
          direccion: evento.direccion ?? "",
          latitud: String(evento.latitud),
          longitud: String(evento.longitud),
          descripcion: evento.descripcion ?? "",
          enlaceSpotify: evento.enlaceSpotify ?? "",
          enlaceYoutube: evento.enlaceYoutube ?? "",
          imagen: evento.imagen ?? "",
          estado: evento.estado ?? "activo",
        }
      : vacio
  );

  // al editar un evento cuya fecha ya paso, se avisa (pero se deja guardar)
  const fechaPasada = datos.fecha !== "" && esExpirado(isoADma(datos.fecha));

  const generos = [...new Set(eventos.map((e) => e.genero))];

  const cambiar = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setDatos({ ...datos, [e.target.name]: e.target.value });
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const latitud = Number(datos.latitud);
    const longitud = Number(datos.longitud);

    if (
      !datos.nombre.trim() ||
      !datos.artista.trim() ||
      !datos.genero.trim() ||
      !datos.lugar.trim()
    ) {
      setError("Completa el nombre, el artista, el género y el lugar.");
      return;
    }

    if (!datos.fecha || !datos.hora) {
      setError("Elige la fecha y la hora del evento.");
      return;
    }

    if (
      datos.latitud.trim() === "" ||
      datos.longitud.trim() === "" ||
      Number.isNaN(latitud) ||
      Number.isNaN(longitud) ||
      Math.abs(latitud) > 90 ||
      Math.abs(longitud) > 180
    ) {
      setError("Revisa las coordenadas: latitud entre -90 y 90, longitud entre -180 y 180.");
      return;
    }

    const nuevo = {
      nombre: datos.nombre.trim(),
      artista: datos.artista.trim(),
      genero: datos.genero.trim(),
      fecha: isoADma(datos.fecha),
      hora: a12Horas(datos.hora),
      lugar: datos.lugar.trim(),
      direccion: datos.direccion.trim(),
      latitud,
      longitud,
      descripcion: datos.descripcion.trim(),
      enlaceSpotify: datos.enlaceSpotify.trim() || undefined,
      enlaceYoutube: datos.enlaceYoutube.trim() || undefined,
      imagen: datos.imagen.trim() || undefined,
      estado: datos.estado,
    };

    setGuardando(true);
    try {
      if (evento) {
        await editar({ ...nuevo, id: evento.id });
      } else {
        await agregar(nuevo);
      }
      navigate("/admin/eventos");
    } catch (err) {
      setError(err instanceof Error ? `No se pudo guardar: ${err.message}` : "No se pudo guardar. Intenta de nuevo.");
      setGuardando(false);
    }
  };

  return (
    <div>
      <div className="admin-encabezado">
        <div>
          <h1>{evento ? "Editar evento" : "Nuevo evento"}</h1>
          <p className="admin-subtitulo">Los campos con * son obligatorios.</p>
        </div>
      </div>

      <form className="admin-formulario" onSubmit={guardar}>
        <label className="admin-campo ancho">
          <span>Nombre del evento *</span>
          <input name="nombre" value={datos.nombre} onChange={cambiar} />
        </label>

        <label className="admin-campo">
          <span>Artista o grupo *</span>
          <input name="artista" value={datos.artista} onChange={cambiar} />
        </label>

        <label className="admin-campo">
          <span>Género *</span>
          <input
            name="genero"
            list="lista-generos"
            value={datos.genero}
            onChange={cambiar}
          />
          <datalist id="lista-generos">
            {generos.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </label>

        <label className="admin-campo">
          <span>Fecha *</span>
          <input type="date" name="fecha" value={datos.fecha} onChange={cambiar} />
        </label>

        <label className="admin-campo">
          <span>Hora *</span>
          <input type="time" name="hora" value={datos.hora} onChange={cambiar} />
        </label>

        {fechaPasada && (
          <p className="admin-aviso ancho-texto">
            La fecha es anterior a hoy, así que el evento aparece como expirado.
            Cámbiala si quieres reprogramarlo; también puedes guardarlo así.
          </p>
        )}

        <label className="admin-campo">
          <span>Estado</span>
          <select name="estado" value={datos.estado} onChange={cambiar}>
            {ESTADOS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.texto}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-campo">
          <span>Lugar *</span>
          <input name="lugar" value={datos.lugar} onChange={cambiar} />
        </label>

        <label className="admin-campo">
          <span>Dirección</span>
          <input name="direccion" value={datos.direccion} onChange={cambiar} />
        </label>

        <label className="admin-campo">
          <span>Latitud *</span>
          <input
            type="number"
            step="any"
            name="latitud"
            value={datos.latitud}
            onChange={cambiar}
          />
        </label>

        <label className="admin-campo">
          <span>Longitud *</span>
          <input
            type="number"
            step="any"
            name="longitud"
            value={datos.longitud}
            onChange={cambiar}
          />
        </label>

        <p className="admin-ayuda ancho-texto">
          Por defecto son las coordenadas del centro de Oaxaca. Se pueden copiar desde
          Google Maps dando clic derecho sobre el lugar.
        </p>

        <label className="admin-campo ancho">
          <span>Descripción</span>
          <textarea name="descripcion" value={datos.descripcion} onChange={cambiar} />
        </label>

        <label className="admin-campo">
          <span>Link de Spotify</span>
          <input
            type="url"
            name="enlaceSpotify"
            placeholder="https://..."
            value={datos.enlaceSpotify}
            onChange={cambiar}
          />
        </label>

        <label className="admin-campo">
          <span>Link de YouTube</span>
          <input
            type="url"
            name="enlaceYoutube"
            placeholder="https://..."
            value={datos.enlaceYoutube}
            onChange={cambiar}
          />
        </label>

        <label className="admin-campo ancho">
          <span>Link de la imagen</span>
          <input
            type="url"
            name="imagen"
            placeholder="https://..."
            value={datos.imagen}
            onChange={cambiar}
          />
        </label>

        {error && <p className="admin-error">{error}</p>}

        <div className="admin-formulario-botones">
          <button type="submit" className="admin-boton" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </button>
          <Link to="/admin/eventos" className="admin-boton-sec">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function AdminEventoForm() {
  const { id } = useParams();
  const { eventos, cargando } = useEventos();

  if (cargando) return <p>Cargando...</p>;

  // si hay id en la url, es edicion
  if (id) {
    const evento = eventos.find((e) => e.id === Number(id));
    if (!evento) {
      return (
        <div>
          <p>Evento no encontrado.</p>
          <Link to="/admin/eventos" className="admin-boton-sec">
            Volver a la lista
          </Link>
        </div>
      );
    }
    return <Formulario key={evento.id} evento={evento} />;
  }

  return <Formulario />;
}
