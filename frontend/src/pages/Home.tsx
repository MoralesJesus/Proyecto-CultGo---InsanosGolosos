import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Buscador from '../components/buscador/Buscador';
import FiltroFecha from '../components/filtros/FiltroFecha';
import { useEventos } from '../context/useEventos';
import { calcularDistancia } from '../utils/distancia';
import { useAuth } from '../context/useAuth';
import { cerrarSesion } from '../services/firebase';
import { esAdmin } from '../config/admins';
import Footer from '../components/layout/Footer';
import Asistente from '../components/asistente/Asistente';
import { fechaHora, ordenarAgenda } from '../utils/agenda';
import type { EventoEnAgenda } from '../utils/agenda';
import { partesFecha } from '../utils/formato';
import { enlaceRuta } from '../utils/mapas';
import { fondoImagen } from '../utils/imagenes';
import CuentaRegresiva from '../components/inicio/CuentaRegresiva';
import TarjetaCartel from '../components/inicio/TarjetaCartel';
import MapaCercanos from '../components/inicio/MapaCercanos';
import Loteria from '../components/inicio/Loteria';
import '../styles/inicio.css';

// convierte "20/10/2026" a "2026-10-20" para poder comparar con el input tipo date
const convertirFecha = (fecha: string) => {
  const [dia, mes, anio] = fecha.split('/');
  return `${anio}-${mes}-${dia}`;
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
    // se quitan los otros filtros para que se vean todos los resultados del asistente
    setBusqueda('');
    setGenero('');
    setFecha('');
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
    

  // grupos de la lista: esta semana (destacados), proximos y los que ya terminaron (al final).
  // Con ubicacion, dentro de cada grupo se ordena por cercania; si no, por fecha
  const agenda = ordenarAgenda(
    eventosFiltrados,
    ubicacion ? (e) => calcularDistancia(ubicacion.lat, ubicacion.lon, e.latitud, e.longitud) : undefined
  );

  const distancia = (e: { latitud: number; longitud: number }) =>
    ubicacion ? calcularDistancia(ubicacion.lat, ubicacion.lon, e.latitud, e.longitud) : undefined;

  // evento destacado de la portada: el mas proximo de TODOS (no depende de los filtros)
  const todos = ordenarAgenda(eventos);
  const destacado: EventoEnAgenda | undefined = todos.semana[0] ?? todos.proximo[0];
  // eventos que aun no pasan, para el mazo de la loteria
  const proximos = [...todos.semana, ...todos.proximo].map((item) => item.evento);
  const proximosIds = proximos.map((e) => e.id).join(',');
  const inicioDestacado = destacado ? fechaHora(destacado.evento) : null;
  const imagenDestacado = destacado ? fondoImagen(destacado.evento.imagen) : undefined;
  const cuandoDestacado = (item: EventoEnAgenda) => {
    if (item.etiqueta && item.grupo === 'semana') return item.etiqueta.replace(' · Reprogramado', '');
    const { semana, dia, mes } = partesFecha(item.evento.fecha);
    return `${semana} ${dia} ${mes}`;
  };

  // fila de la lista ("Más adelante" y "Concluidos")
  const fila = ({ evento, etiqueta, grupo }: EventoEnAgenda) => {
    const { dia, mes, semana } = partesFecha(evento.fecha);
    const km = distancia(evento);
    return (
      <Link key={evento.id} to={`/evento/${evento.id}`} className={`fila-evento${grupo === 'terminado' ? ' pasada' : ''}`}>
        <span className="fila-fecha">
          <b>{dia}</b> {mes}
          <small>{semana}</small>
        </span>
        <span className="fila-nombre">
          {etiqueta && <span className="fila-etiqueta">{etiqueta}</span>}
          {evento.nombre}
          <small>
            {evento.genero} · {evento.hora}
          </small>
        </span>
        <span className="fila-lugar">
          {evento.lugar}
          {km !== undefined && grupo !== 'terminado' && <small>a {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}</small>}
        </span>
        <span className="fila-ver">Ver →</span>
      </Link>
    );
  };

  return (
    <div className="inicio">
      {/* ---------- portada con el proximo evento ---------- */}
      <header className="inicio-hero">
        {imagenDestacado && (
          <div className="hero-foto" style={{ backgroundImage: imagenDestacado }} aria-hidden="true" />
        )}
        <div className="reflector reflector-1" aria-hidden="true" />
        <div className="reflector reflector-2" aria-hidden="true" />
        <div className="hero-degradado" aria-hidden="true" />

        <nav className="inicio-nav">
          <Link to="/" className="inicio-logo">
            CultGo<span>!</span>
          </Link>
          <div className="inicio-enlaces">
            <a href="#eventos">Explorar</a>
            <a href="#semana">Esta semana</a>
            <a href="#mapa">Mapa</a>
          </div>
          <div className="inicio-sesion">
            {user ? (
              <>
                <span className="saludo">Hola, {user.displayName || user.email}</span>
                {/* solo los correos de config/admins.ts ven este boton */}
                {esAdmin(user.email) && (
                  <Link to="/admin" className="boton-contorno boton-admin-nav">
                    Panel de admin
                  </Link>
                )}
                <button onClick={cerrarSesion} className="boton-contorno">
                  Cerrar sesión
                </button>
              </>
            ) : (
              <Link to="/login" className="boton-contorno">
                Iniciar sesión
              </Link>
            )}
          </div>
        </nav>

        <div className="hero-contenido">
          {destacado ? (
            <>
              <p className="hero-antetitulo">
                <span className="punto-en-vivo" aria-hidden="true" />
                {destacado.dias === 0 ? 'Hoy en Oaxaca' : 'Próximo evento'}
                <span className="ecualizador" aria-hidden="true">
                  <span /> <span /> <span /> <span />
                </span>
              </p>
              <h1 className="hero-titulo">{destacado.evento.nombre}</h1>
              <p className="hero-datos">
                {destacado.evento.artista} · <b>{cuandoDestacado(destacado)}</b>, {destacado.evento.hora} ·{' '}
                {destacado.evento.lugar}
              </p>
              {inicioDestacado && <CuentaRegresiva meta={inicioDestacado} />}
              <div className="hero-botones">
                <Link to={`/evento/${destacado.evento.id}`} className="boton-principal">
                  Ver evento
                </Link>
                <a href={enlaceRuta(destacado.evento)} target="_blank" rel="noopener noreferrer" className="boton-vidrio">
                  Cómo llegar
                </a>
              </div>
            </>
          ) : (
            <>
              <p className="hero-antetitulo">Oaxaca de Juárez</p>
              <h1 className="hero-titulo">La música de Oaxaca</h1>
              <p className="hero-datos">Encuentra conciertos, sones, marimbas y jazz cerca de ti.</p>
            </>
          )}
        </div>
      </header>

      {/* ---------- loteria: un evento al azar de los que vienen ---------- */}
      {/* el key hace que se vuelva a repartir si cambian los eventos (se cargaron o se edito uno) */}
      <Loteria key={proximosIds} eventos={proximos} />

      {/* ---------- buscador y filtros ---------- */}
      <section id="eventos" className="inicio-filtros" aria-label="Buscar y filtrar eventos">
        <div className="filtros-fila">
          <Buscador valor={busqueda} onCambio={setBusqueda} />
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

        <div className="pildoras" role="group" aria-label="Filtrar por género">
          {['', ...generosDisponibles].map((g) => (
            <button
              key={g || 'todos'}
              type="button"
              className={`pildora${genero === g ? ' activa' : ''}`}
              aria-pressed={genero === g}
              onClick={() => setGenero(g)}
            >
              {g || 'Todos'}
            </button>
          ))}
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

      <p className="inicio-contador" ref={listaRef}>
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
        <>
          {/* ---------- esta semana: carteles ---------- */}
          {agenda.semana.length > 0 && (
            <section id="semana" className="inicio-seccion" aria-label="Esta semana">
              <div className="seccion-cabeza">
                <h2>Esta semana</h2>
                <span>
                  {agenda.semana.length} {agenda.semana.length === 1 ? 'evento' : 'eventos'} en los próximos 7 días
                </span>
              </div>
              <div className="rejilla-carteles">
                {agenda.semana.map(({ evento, etiqueta }, i) => (
                  <TarjetaCartel
                    key={evento.id}
                    evento={evento}
                    etiqueta={etiqueta}
                    distanciaKm={distancia(evento)}
                    orden={i}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ---------- mapa ---------- */}
          <div className="inicio-seccion">
            <MapaCercanos
              eventos={[...agenda.semana, ...agenda.proximo]}
              ubicacion={ubicacion}
              cargandoUbicacion={cargandoUbicacion}
              onPedirUbicacion={obtenerUbicacion}
            />
          </div>

          {/* ---------- mas adelante ---------- */}
          {agenda.proximo.length > 0 && (
            <section className="inicio-seccion" aria-label="Más adelante">
              <div className="seccion-cabeza">
                <h2>Más adelante</h2>
                <span>Del más cercano al más lejano</span>
              </div>
              <div className="lista-filas">{agenda.proximo.map(fila)}</div>
            </section>
          )}

          {/* ---------- concluidos ---------- */}
          {agenda.terminado.length > 0 && (
            <section className="inicio-seccion" aria-label="Concluidos">
              <div className="seccion-cabeza">
                <h2 className="titulo-apagado">Concluidos</h2>
                <span>Finalizados o cancelados</span>
              </div>
              <div className="lista-filas">{agenda.terminado.map(fila)}</div>
            </section>
          )}
        </>
      )}

      <Footer />

      {/* chat con IA (funcion extra: si la IA no responde, lo demas sigue igual) */}
      <Asistente onVerEnPagina={verResultadosAsistente} />
    </div>
  );
};

export default Home;
