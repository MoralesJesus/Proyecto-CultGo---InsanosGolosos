import { useState } from 'react';
import { Link } from 'react-router-dom';
import TarjetaEvento from '../components/eventos/TarjetaEvento';
import Buscador from '../components/buscador/Buscador';
import FiltroGenero from '../components/filtros/FiltroGenero';
import FiltroFecha from '../components/filtros/FiltroFecha';
import { useEventos } from '../context/useEventos';
import { calcularDistancia } from '../utils/distancia';
import { useAuth } from '../context/AuthContext';
import { cerrarSesion } from '../services/firebase';
import Footer from '../components/layout/Footer';




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
  const { user } = useAuth();
  const { eventos, cargando, error } = useEventos();

  // lista de generos disponibles, sacada de los eventos (sin repetidos)
  const generosDisponibles = [...new Set(eventos.map((e) => e.genero))];
  const [busqueda, setBusqueda] = useState('');
  const [genero, setGenero] = useState('');
  const [fecha, setFecha] = useState('');
  const [ubicacion, setUbicacion] = useState<{ lat: number; lon: number } | null>(null);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(false);


    // pide permiso al navegador y guarda la ubicacion del usuario
    const obtenerUbicacion = () => {
    setCargandoUbicacion(true);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setUbicacion({
          lat: posicion.coords.latitude,
          lon: posicion.coords.longitude
        });
        setCargandoUbicacion(false);
      },
      (error) => {
        console.error('Error al obtener ubicacion:', error);
        alert('No se pudo obtener tu ubicación. Intenta de nuevo.');
        setCargandoUbicacion(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // espera hasta 10 segundos antes de rendirse
        maximumAge: 0
      }
    );
  };

  // filtro combinado: texto + genero + fecha
    const eventosFiltrados = eventos
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
      <div className="contenedor-home">
      {/* barra del usuario: va dentro de la pagina (no fija) para que no se encime al bajar */}
      <header className="barra-usuario">
        {user ? (
          <>
            <span>Hola, {user.displayName || user.email}</span>
            <button onClick={cerrarSesion} className="boton-barra">
              Cerrar sesión
            </button>
          </>
        ) : (
          <Link to="/login" className="boton-barra">
            Iniciar sesión
          </Link>
        )}
      </header>
      <div style={{ textAlign: 'center' }}>
        <h1 className="titulo-animado">CultGo!</h1>
      </div>
        <p className="subtitulo">Encuentra eventos musicales en Oaxaca de Juárez</p>

                        <div style={{ marginBottom: '24px' }}>
        <Buscador valor={busqueda} onCambio={setBusqueda} />
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
          <FiltroGenero generoSeleccionado={genero} generos={generosDisponibles} onCambio={setGenero} />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>📅 Fecha:</span>
            <FiltroFecha fechaSeleccionada={fecha} onCambio={setFecha} />
            {fecha && (
              <button onClick={() => setFecha('')} style={{ padding: '4px 10px', cursor: 'pointer' }}>
                ✕ Limpiar fecha
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <button onClick={obtenerUbicacion} disabled={cargandoUbicacion} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          {cargandoUbicacion ? '⏳ Buscando ubicación...' : '📍 Ordenar por cercanía'}
        </button>
      </div>

            <p className="contador">
        {eventosFiltrados.length} {eventosFiltrados.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
      </p>

      {cargando ? (
        <p>Cargando eventos...</p>
      ) : error ? (
        <p>{error}</p>
      ) : eventosFiltrados.length === 0 ? (
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
            <Footer />
    </div>
  );
};

export default Home;