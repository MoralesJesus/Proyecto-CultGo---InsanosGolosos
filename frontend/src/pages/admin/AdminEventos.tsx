import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useEventos } from "../../context/useEventos";
import Confirmacion from "../../components/admin/Confirmacion";
import { esExpirado, valorFecha } from "../../utils/formato";
import type { Evento } from "../../types";

type Filtro = "todos" | "expirados" | "proximos";

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: "todos", texto: "Todos" },
  { valor: "expirados", texto: "Expirados" },
  { valor: "proximos", texto: "Próximos" },
];

export default function AdminEventos() {
  const { eventos, cargando, error, borrar } = useEventos();
  const [porBorrar, setPorBorrar] = useState<Evento | null>(null);
  const [errorBorrar, setErrorBorrar] = useState("");

  // el filtro va en la url (?filtro=expirados) para poder enlazarlo desde el inicio
  const [parametros, setParametros] = useSearchParams();
  const filtroUrl = parametros.get("filtro");
  const filtro: Filtro = FILTROS.some((f) => f.valor === filtroUrl) ? (filtroUrl as Filtro) : "todos";

  const totalExpirados = eventos.filter((e) => esExpirado(e.fecha)).length;
  const totales: Record<Filtro, number> = {
    todos: eventos.length,
    expirados: totalExpirados,
    proximos: eventos.length - totalExpirados,
  };

  const visibles = eventos
    .filter((e) => {
      if (filtro === "expirados") return esExpirado(e.fecha);
      if (filtro === "proximos") return !esExpirado(e.fecha);
      return true;
    })
    .sort((a, b) => valorFecha(a.fecha) - valorFecha(b.fecha));

  const confirmarBorrado = async () => {
    if (!porBorrar) return;
    try {
      await borrar(porBorrar.id);
      setErrorBorrar("");
    } catch (err) {
      setErrorBorrar(err instanceof Error ? err.message : "No se pudo eliminar el evento.");
    }
    setPorBorrar(null);
  };

  return (
    <div>
      <div className="admin-encabezado">
        <div>
          <h1>Eventos</h1>
          <p className="admin-subtitulo">
            Agrega, edita o elimina los eventos de la página. Los eventos con fecha
            pasada se marcan como expirados para que puedas reprogramarlos.
          </p>
        </div>
        <div className="admin-herramientas">
          <Link to="/admin/eventos/nuevo" className="admin-boton">
            Nuevo evento
          </Link>
        </div>
      </div>

      <div className="admin-filtros" role="tablist">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            role="tab"
            aria-selected={filtro === f.valor}
            className={filtro === f.valor ? "activo" : ""}
            onClick={() => setParametros(f.valor === "todos" ? {} : { filtro: f.valor })}
          >
            {f.texto} ({totales[f.valor]})
          </button>
        ))}
      </div>

      {errorBorrar && <p className="admin-error">{errorBorrar}</p>}

      {cargando ? (
        <p>Cargando eventos...</p>
      ) : error ? (
        <p className="admin-error">{error}</p>
      ) : visibles.length === 0 ? (
        <p>
          {filtro === "expirados"
            ? "No hay eventos expirados."
            : "No hay eventos. Crea el primero con el botón Nuevo evento."}
        </p>
      ) : (
        <div className="admin-tabla-caja">
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Artista</th>
                <th>Género</th>
                <th>Fecha</th>
                <th>Lugar</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((evento) => {
                const expirado = esExpirado(evento.fecha);
                const estado = evento.estado ?? "activo";
                return (
                  <tr key={evento.id} className={expirado ? "admin-fila-expirada" : undefined}>
                    <td>{evento.nombre}</td>
                    <td>{evento.artista}</td>
                    <td>
                      <span className="admin-etiqueta">{evento.genero}</span>
                    </td>
                    <td>
                      {evento.fecha} · {evento.hora}
                      {expirado && <span className="admin-etiqueta admin-etiqueta-expirado">Expirado</span>}
                    </td>
                    <td>{evento.lugar}</td>
                    <td>
                      <span className={`admin-etiqueta admin-estado-${estado}`}>{estado}</span>
                    </td>
                    <td>
                      <div className="admin-acciones">
                        <Link
                          to={`/admin/eventos/${evento.id}/editar`}
                          className={expirado ? "admin-boton" : "admin-boton-sec"}
                        >
                          {expirado ? "Reprogramar" : "Editar"}
                        </Link>
                        <button
                          className="admin-boton-peligro"
                          onClick={() => setPorBorrar(evento)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {porBorrar && (
        <Confirmacion
          titulo="Eliminar evento"
          texto={`¿Seguro que quieres eliminar "${porBorrar.nombre}"? Esta acción no se puede deshacer.`}
          textoBoton="Eliminar"
          onConfirmar={confirmarBorrado}
          onCancelar={() => setPorBorrar(null)}
        />
      )}
    </div>
  );
}
