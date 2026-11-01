import { useState } from "react";
import { Link } from "react-router-dom";
import { useEventos } from "../../context/useEventos";
import Confirmacion from "../../components/admin/Confirmacion";
import type { Evento } from "../../types";

export default function AdminEventos() {
  const { eventos, cargando, borrar, restablecer } = useEventos();
  const [porBorrar, setPorBorrar] = useState<Evento | null>(null);
  const [confirmarReset, setConfirmarReset] = useState(false);

  const confirmarBorrado = async () => {
    if (!porBorrar) return;
    await borrar(porBorrar.id);
    setPorBorrar(null);
  };

  const confirmarRestablecer = async () => {
    await restablecer();
    setConfirmarReset(false);
  };

  return (
    <div>
      <div className="admin-encabezado">
        <div>
          <h1>Eventos</h1>
          <p className="admin-subtitulo">
            Agrega, edita o elimina los eventos de la página.
          </p>
        </div>
        <div className="admin-herramientas">
          <button className="admin-boton-sec" onClick={() => setConfirmarReset(true)}>
            Restablecer datos de prueba
          </button>
          <Link to="/admin/eventos/nuevo" className="admin-boton">
            Nuevo evento
          </Link>
        </div>
      </div>

      {cargando ? (
        <p>Cargando eventos...</p>
      ) : eventos.length === 0 ? (
        <p>No hay eventos. Crea el primero con el botón Nuevo evento.</p>
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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((evento) => (
                <tr key={evento.id}>
                  <td>{evento.nombre}</td>
                  <td>{evento.artista}</td>
                  <td>
                    <span className="admin-etiqueta">{evento.genero}</span>
                  </td>
                  <td>
                    {evento.fecha} · {evento.hora}
                  </td>
                  <td>{evento.lugar}</td>
                  <td>
                    <div className="admin-acciones">
                      <Link
                        to={`/admin/eventos/${evento.id}/editar`}
                        className="admin-boton-sec"
                      >
                        Editar
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
              ))}
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

      {confirmarReset && (
        <Confirmacion
          titulo="Restablecer datos de prueba"
          texto="Se van a borrar los cambios y volverán los eventos de prueba originales."
          textoBoton="Restablecer"
          onConfirmar={confirmarRestablecer}
          onCancelar={() => setConfirmarReset(false)}
        />
      )}
    </div>
  );
}
