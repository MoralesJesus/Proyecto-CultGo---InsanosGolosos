import { useParams, Link } from 'react-router-dom';
import { useEventos } from '../context/useEventos';
import { partesFecha } from '../utils/formato';
import { enlaceRuta } from '../utils/mapas';
import { urlImagen } from '../utils/imagenes';
import Reproductor from '../components/eventos/Reproductor';

const DetalleEvento = () => {
  // toma el id que viene en la url, ej: /evento/2 -> id = "2"
  const { id } = useParams();
  const { eventos, cargando } = useEventos();

  // busca el evento cuyo id coincida (convertimos a numero porque useParams da texto)
  const evento = eventos.find((e) => e.id === Number(id));

  if (cargando) return <p className="mensaje-lista">Cargando...</p>;

  // si no se encuentra el evento (id invalido), mostramos un mensaje
  if (!evento) {
    return (
      <div className="pagina-detalle">
        <div className="detalle-evento detalle-vacio">
          <p>Este evento no existe o ya fue eliminado.</p>
          <Link to="/" className="enlace-volver">← Volver al inicio</Link>
        </div>
      </div>
    );
  }

  const { dia, mes, semana } = partesFecha(evento.fecha);

  return (
    <div className="pagina-detalle">
      <Link to="/" className="enlace-volver">← Volver al inicio</Link>

      <article className="detalle-evento">
        {/* foto arriba, con el titulo encima */}
        <header className={evento.imagen ? 'detalle-portada con-foto' : 'detalle-portada'}>
          {evento.imagen && <img src={urlImagen(evento.imagen)} alt={evento.nombre} className="imagen-detalle" />}
          <div className="detalle-titulo">
            <span className="etiqueta-genero">{evento.genero}</span>
            <h1>{evento.nombre}</h1>
            <p className="detalle-artista">{evento.artista}</p>
          </div>
        </header>

        <div className="detalle-cuerpo">
          <div className="talon talon-detalle" aria-hidden="true">
            <span className="talon-semana">{semana}</span>
            <span className="talon-dia">{dia}</span>
            <span className="talon-mes">{mes}</span>
          </div>

          <div className="detalle-info">
            <dl className="detalle-datos">
              <div>
                <dt>Fecha</dt>
                <dd>{evento.fecha}</dd>
              </div>
              <div>
                <dt>Hora</dt>
                <dd>{evento.hora}</dd>
              </div>
              <div>
                <dt>Lugar</dt>
                <dd>{evento.lugar}</dd>
              </div>
              <div>
                <dt>Dirección</dt>
                <dd>{evento.direccion}</dd>
              </div>
            </dl>

            <p className="detalle-descripcion">{evento.descripcion}</p>

            <Reproductor evento={evento} />

            {/* botones de musica: solo aparecen si el evento tiene el link */}
            <div className="botones-musica">
              {evento.lugar && (
                // abre el camino desde donde esta el usuario, igual que la flechita del chat
                <a
                  href={enlaceRuta(evento)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="boton-musica boton-mapa"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
                    <circle cx="12" cy="9.5" r="2.5" />
                  </svg>
                  Cómo llegar
                </a>
              )}
              {evento.enlaceSpotify && (
                <a
                  href={evento.enlaceSpotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="boton-musica boton-spotify"
                >
                  Escuchar en Spotify
                </a>
              )}
              {evento.enlaceYoutube && (
                <a
                  href={evento.enlaceYoutube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="boton-musica boton-youtube"
                >
                  Ver en YouTube
                </a>
              )}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};

export default DetalleEvento;
