import { Link } from "react-router-dom";
import { useEventos } from "../../context/useEventos";

export default function AdminInicio() {
  const { eventos } = useEventos();

  const totalEventos = eventos.length;
  const totalGeneros = new Set(eventos.map((e) => e.genero)).size;
  const totalArtistas = new Set(eventos.map((e) => e.artista)).size;

  return (
    <div>
      <h1>Resumen</h1>
      <p className="admin-subtitulo">Información general de los eventos de CultGo!</p>

      <section className="admin-tarjetas">
        <div className="admin-tarjeta">
          <span>Eventos</span>
          <strong>{totalEventos}</strong>
        </div>
        <div className="admin-tarjeta">
          <span>Artistas</span>
          <strong>{totalArtistas}</strong>
        </div>
        <div className="admin-tarjeta">
          <span>Géneros</span>
          <strong>{totalGeneros}</strong>
        </div>
      </section>

      <section className="admin-seccion">
        <h2>Accesos rápidos</h2>
        <div className="admin-herramientas">
          <Link to="/admin/eventos" className="admin-boton-sec">
            Ver todos los eventos
          </Link>
          <Link to="/admin/eventos/nuevo" className="admin-boton">
            Agregar evento
          </Link>
        </div>
      </section>
    </div>
  );
}
