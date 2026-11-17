import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import TarjetaEvento from '../components/eventos/TarjetaEvento';
import Buscador from '../components/buscador/Buscador';
import FiltroGenero from '../components/filtros/FiltroGenero';
import FiltroFecha from '../components/filtros/FiltroFecha';
import { useEventos } from '../context/useEventos';
import { calcularDistancia } from '../utils/distancia';
import { useAuth } from '../context/AuthContext';
import { cerrarSesion } from '../services/firebase';
import { esAdmin } from '../config/admins';
import Footer from '../components/layout/Footer';
import Asistente from '../components/asistente/Asistente';




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
  // resultados que mando el asistente a la lista ("Ver en la página")
  const [delAsistente, setDelAsistente] = useState<{ ids: number[]; pregunta: string } | null>(null);
  const listaRef = useRef<HTMLParagraphElement>(null);

  const verResultadosAsistente = (ids: number[], pregunta: string) => {
    setDelAsistente({ ids, pregunta });
    // se baja hasta la lista para que se vean
    setTimeout(() => listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };


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

      const coincideAsistente = !delAsistente || delAsistente.ids.includes(evento.id);

      return coincideTexto && coincideGenero && coincideFecha && coincideAsistente;
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
        <span className="logo-barra">CultGo!</span>
        <div className="barra-sesion">
          {user ? (
            <>
              <span className="saludo">Hola, {user.displayName || user.email}</span>
              {/* solo los correos de config/admins.ts ven este boton */}
              {esAdmin(user.email) && (
                <Link to="/admin" className="boton-barra boton-admin">
                  Panel de admin
                </Link>
              )}
              <button onClick={cerrarSesion} className="boton-barra">
                Cerrar sesión
              </button>
            </>
          ) : (
            <Link to="/login" className="boton-barra">
              Iniciar sesión
            </Link>
          )}
        </div>
      </header>

      <section className="portada">
        <h1 className="titulo-animado">CultGo!</h1>
        <p className="subtitulo">Encuentra eventos musicales en Oaxaca de Juárez</p>
      </section>

      {/* buscador y filtros */}
      <section className="panel-filtros" aria-label="Buscar y filtrar eventos">
        <Buscador valor={busqueda} onCambio={setBusqueda} />

        <div className="fila-filtros">
          <FiltroGenero generoSeleccionado={genero} generos={generosDisponibles} onCambio={setGenero} />

          <div className="grupo-fecha">
            <FiltroFecha fechaSeleccionada={fecha} onCambio={setFecha} />
            {fecha && (
              <button onClick={() => setFecha('')} className="boton-limpiar">
                Limpiar fecha
              </button>
            )}
          </div>

          <button onClick={obtenerUbicacion} disabled={cargandoUbicacion} className="boton-cercania">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
            {cargandoUbicacion ? 'Buscando ubicación...' : ubicacion ? 'Ordenado por cercanía' : 'Ordenar por cercanía'}
          </button>
        </div>
      </section>

      {delAsistente && (
        <div className="aviso-asistente">
          <span>
            Resultados del asistente{delAsistente.pregunta ? `: “${delAsistente.pregunta}”` : ''}
          </span>
          <button onClick={() => setDelAsistente(null)}>Ver todos los eventos</button>
        </div>
      )}

      <p className="contador" ref={listaRef}>
        {eventosFiltrados.length} {eventosFiltrados.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
      </p>

      {cargando ? (
        <p className="mensaje-lista">Cargando eventos...</p>
      ) : error ? (
        <p className="mensaje-lista">{error}</p>
      ) : eventosFiltrados.length === 0 ? (
        <p className="mensaje-lista">
          {fecha
            ? `No hay eventos disponibles en la fecha ${fecha}.`
            : 'No hay eventos disponibles con esos filtros.'}
        </p>
      ) : (
        <div className="lista-eventos">
          {eventosFiltrados.map((evento) => (
            <Link key={evento.id} to={`/evento/${evento.id}`} className="enlace-tarjeta">
              <TarjetaEvento evento={evento} />
            </Link>
          ))}
        </div>
      )}

      <Footer />

      {/* chat con IA (funcion extra: si la IA no responde, lo demas sigue igual) */}
      <Asistente onVerEnPagina={verResultadosAsistente} />
    </div>
  );
};

export default Home;