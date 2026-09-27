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
        <p>Evento no encontrado.</p>
        <Link to="/">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <Link to="/">← Volver al inicio</Link>
      <h1>{evento.nombre}</h1>
      <p><strong>Artista:</strong> {evento.artista}</p>
      <p><strong>Genero:</strong> {evento.genero}</p>
      <p><strong>Fecha:</strong> {evento.fecha} - {evento.hora}</p>
      <p><strong>Lugar:</strong> {evento.lugar}</p>
      <p><strong>Direccion:</strong> {evento.direccion}</p>
      <p>{evento.descripcion}</p>
    </div>
  );
};

export default DetalleEvento;