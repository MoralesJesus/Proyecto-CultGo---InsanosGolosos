import { useState } from 'react';
import { Link } from 'react-router-dom';
import TarjetaEvento from '../components/eventos/TarjetaEvento';
import Buscador from '../components/buscador/Buscador';
import FiltroGenero from '../components/filtros/FiltroGenero';
import FiltroFecha from '../components/filtros/FiltroFecha';
import { eventosPrueba } from '../data/eventosPrueba';
import { calcularDistancia } from '../utils/distancia';



// lista de generos disponibles, sacada de los eventos (sin repetidos)
const generosDisponibles = [...new Set(eventosPrueba.map((e) => e.genero))];

// convierte "20/10/2026" a "2026-10-20" para poder comparar con el input tipo date
const convertirFecha = (fecha: string) => {
  const [dia, mes, anio] = fecha.split('/');
  return `${anio}-${mes}-${dia}`;
};

// convierte la fecha a un objeto Date real, para poder ordenar cronologicamente
const aFechaReal = (fecha: string) => {
  const [dia, mes, anio] = fecha.split('/');
  return new Date(`${anio}-${mes}-${dia}`);
};

const Home = () => {
  const [busqueda, setBusqueda] = useState('');
  const [genero, setGenero] = useState('');
  const [fecha, setFecha] = useState('');
  const [ubicacion, setUbicacion] = useState<{ lat: number; lon: number } | null>(null);


    // pide permiso al navegador y guarda la ubicacion del usuario
  const obtenerUbicacion = () => {
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setUbicacion({
          lat: posicion.coords.latitude,
          lon: posicion.coords.longitude
        });
      },
      (error) => {
        console.error('Error al obtener ubicacion:', error);
        alert('No se pudo obtener tu ubicacion. Revisa los permisos del navegador.');
      }
    );
  };

  // filtro combinado: texto + genero + fecha
    const eventosFiltrados = eventosPrueba
    .filter((evento) => {
      const coincideTexto =
        evento.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        evento.artista.toLowerCase().includes(busqueda.toLowerCase());

      const coincideGenero = genero === '' || evento.genero === genero;

      const coincideFecha = fecha === '' || convertirFecha(evento.fecha) === fecha;

      return coincideTexto && coincideGenero && coincideFecha;
    })
    
        // si hay ubicacion, ordena por cercania; si no, ordena por fecha
    .sort((a, b) => {
      if (ubicacion) {
        const distanciaA = calcularDistancia(ubicacion.lat, ubicacion.lon, a.latitud, a.longitud);
        const distanciaB = calcularDistancia(ubicacion.lat, ubicacion.lon, b.latitud, b.longitud);
        return distanciaA - distanciaB;
      }
      return aFechaReal(a.fecha).getTime() - aFechaReal(b.fecha).getTime();
    });

    

  return (
    <div style={{ padding: '20px' }}>
      {/* barra superior con el boton de login a la derecha */}
      <div style={{ position: 'relative', textAlign: 'center' }}>
        <h1 className="titulo-animado">CultGo!</h1>
        <Link to="/login">
          <button style={{ position: 'absolute', top: '10px', right: '0', padding: '8px 16px', cursor: 'pointer' }}>
            Iniciar sesion
          </button>
        </Link>
      </div>
      <p>Encuentra eventos musicales en Oaxaca de Juarez</p>

                  <div style={{ marginBottom: '12px' }}>
        <Buscador valor={busqueda} onCambio={setBusqueda} />
        <FiltroGenero generoSeleccionado={genero} generos={generosDisponibles} onCambio={setGenero} />
        <FiltroFecha fechaSeleccionada={fecha} onCambio={setFecha} />
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button onClick={obtenerUbicacion} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          📍 Ordenar por cercania
        </button>
      </div>

      {eventosFiltrados.length === 0 ? (
        <p>
          {fecha
            ? `No hay eventos disponibles en la fecha ${fecha}.`
            : 'No hay eventos disponibles con esos filtros.'}
        </p>
      ) : (
                eventosFiltrados.map((evento) => (
          <Link key={evento.id} to={`/evento/${evento.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <TarjetaEvento evento={evento} />
          </Link>
        ))
      )}
    </div>
  );
};

export default Home;