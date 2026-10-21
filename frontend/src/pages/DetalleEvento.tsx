import { useParams, Link } from 'react-router-dom';
import { eventosPrueba } from '../data/eventosPrueba';

const DetalleEvento = () => {
  // toma el id que viene en la url, ej: /evento/2 -> id = "2"
  const { id } = useParams();

  // busca el evento cuyo id coincida (convertimos a numero porque useParams da texto)
  const evento = eventosPrueba.find((e) => e.id === Number(id));

  // si no se encuentra el evento (id invalido), mostramos un mensaje
  if (!evento) {
    return (
      <div style={{ padding: '20px' }}>
        <div className="detalle-evento">
          <p>Evento no encontrado.</p>
          <Link to="/" className="enlace-volver">← Volver al inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div className="detalle-evento">
        <Link to="/" className="enlace-volver">← Volver al inicio</Link>
        <h1>{evento.nombre}</h1>
        <p><strong>Artista:</strong> {evento.artista}</p>
        <p><strong>Genero:</strong> {evento.genero}</p>
        <p><strong>Fecha:</strong> {evento.fecha} - {evento.hora}</p>
        <p><strong>Lugar:</strong> {evento.lugar}</p>
        <p><strong>Direccion:</strong> {evento.direccion}</p>
        <p>{evento.descripcion}</p>

        {/* botones de musica: solo aparecen si el evento tiene el link */}
        <div className="botones-musica">
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
  );
};

export default DetalleEvento;