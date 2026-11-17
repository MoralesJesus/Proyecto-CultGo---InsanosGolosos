import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { obtenerUbicacion, preguntarAsistente } from '../../services/asistenteService';
import type {
  ContextoAsistente,
  EventoAsistente,
  FiltrosAsistente,
  Ubicacion,
} from '../../services/asistenteService';
import { partesFecha } from '../../utils/formato';
import '../../styles/asistente.css';

interface Mensaje {
  autor: 'usuario' | 'asistente';
  texto: string;
  eventos?: EventoAsistente[];
  error?: boolean;
  // si el asistente pidio la ubicacion, aqui se guarda la pregunta para repetirla
  pideUbicacion?: string;
  // para recordar la busqueda: que pregunto el usuario y que filtros se usaron
  pregunta?: string;
  filtros?: FiltrosAsistente;
  sugerencias?: string[];
  total?: number;
  idsTodos?: number[];
}

interface Props {
  // muestra en la lista de la pagina todos los eventos que encontro el asistente
  onVerEnPagina?: (ids: number[], pregunta: string) => void;
}

// etiqueta para eventos que ya pasaron, se cancelaron o cambiaron de fecha
const etiquetaEstado = (evento: EventoAsistente): string | null => {
  if (evento.estado === 'cancelado') return 'Cancelado';
  if (evento.estado === 'reprogramado') return 'Reprogramado';
  const [dia, mes, anio] = evento.fecha.split('/').map(Number);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (evento.estado === 'finalizado' || new Date(anio, mes - 1, dia) < hoy) return 'Ya pasó';
  return null;
};

// ruta en Google Maps desde donde esta el usuario hasta el evento
const enlaceRuta = (evento: EventoAsistente) =>
  Number.isFinite(evento.latitud) && Number.isFinite(evento.longitud)
    ? `https://www.google.com/maps/dir/?api=1&destination=${evento.latitud},${evento.longitud}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${evento.lugar}, ${evento.direccion ?? ''} Oaxaca de Juarez`
      )}`;

// contexto de la siguiente pregunta:
// - filtros: los de la ultima respuesta (para "¿y en enero?")
// - ids: los de la ultima respuesta QUE MOSTRO eventos (para "¿como llego al segundo?"),
//   aunque despues haya habido una respuesta sin tarjetas
const contextoDe = (mensajes: Mensaje[]): ContextoAsistente | null => {
  const conFiltros = [...mensajes].reverse().find((m) => m.autor === 'asistente' && m.filtros && m.pregunta);
  const conEventos = [...mensajes].reverse().find((m) => m.autor === 'asistente' && m.eventos && m.eventos.length > 0);
  // si no hay ni filtros ni eventos anteriores, no hay contexto que mandar
  if (!conFiltros && !conEventos) return null;
  return {
    pregunta: conFiltros?.pregunta ?? '',
    filtros: conFiltros?.filtros ?? {},
    ids: (conEventos?.eventos ?? []).map((e) => e.id),
  };
};

const formatoDistancia = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

// ideas para que el usuario sepa que puede preguntar
const SUGERENCIAS = [
  'Quiero rock este fin de semana',
  '¿Qué hay de jazz en diciembre?',
  '¿A qué hora es el de sones istmeños?',
  '¿Qué conciertos me quedan cerca?',
];

const SALUDO: Mensaje = {
  autor: 'asistente',
  texto: '¡Hola! Dime qué música buscas y cuándo, y te digo qué eventos hay en Oaxaca.',
};

// la conversacion se guarda en sessionStorage: sobrevive si el usuario entra a un
// evento y regresa, o si recarga la pagina; se borra al cerrar la pestaña
const CLAVE_CHAT = 'cultgo-asistente-chat';
const CLAVE_ABIERTO = 'cultgo-asistente-abierto';

const leerGuardado = <T,>(clave: string, porDefecto: T): T => {
  try {
    const guardado = sessionStorage.getItem(clave);
    return guardado ? (JSON.parse(guardado) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
};

const guardar = (clave: string, valor: unknown) => {
  try {
    sessionStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // si el navegador no deja guardar, el chat funciona igual (solo no se recuerda)
  }
};

// boton flotante con una ventanita de chat; es una funcion extra:
// si la IA no responde, la pagina y los filtros siguen funcionando igual
const Asistente = ({ onVerEnPagina }: Props) => {
  const [abierto, setAbierto] = useState<boolean>(() => leerGuardado(CLAVE_ABIERTO, false));
  const [mensajes, setMensajes] = useState<Mensaje[]>(() => leerGuardado(CLAVE_CHAT, [SALUDO]));
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  // la ubicacion solo se guarda en memoria (no en sessionStorage) por privacidad
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => guardar(CLAVE_CHAT, mensajes), [mensajes]);
  useEffect(() => guardar(CLAVE_ABIERTO, abierto), [abierto]);

  const nuevaConversacion = () => {
    if (pensando) return;
    setMensajes([SALUDO]);
    setTexto('');
  };

  // baja hasta el ultimo mensaje
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, pensando]);

  // manda la pregunta al backend; "repetir" = no volver a pintar la burbuja del usuario
  const enviar = async (mensaje: string, ubicacionUsar: Ubicacion | null = ubicacion, repetir = false) => {
    const limpio = mensaje.trim();
    if (!limpio || pensando) return;
    setTexto('');
    if (!repetir) setMensajes((anteriores) => [...anteriores, { autor: 'usuario', texto: limpio }]);
    setPensando(true);
    try {
      const { respuesta, eventos, necesitaUbicacion, filtros, sugerencias, total, idsTodos } = await preguntarAsistente(
        limpio,
        ubicacionUsar,
        contextoDe(mensajes)
      );
      setMensajes((anteriores) => [
        ...anteriores,
        {
          autor: 'asistente',
          texto: respuesta,
          eventos,
          pideUbicacion: necesitaUbicacion ? limpio : undefined,
          // si pidio la ubicacion, aun no hay resultados que recordar
          pregunta: necesitaUbicacion ? undefined : limpio,
          filtros: necesitaUbicacion ? undefined : filtros,
          sugerencias,
          total,
          idsTodos,
        },
      ]);
    } catch (error) {
      const texto = error instanceof Error ? error.message : 'El asistente no está disponible.';
      setMensajes((anteriores) => [...anteriores, { autor: 'asistente', texto, error: true }]);
    } finally {
      setPensando(false);
    }
  };

  // el usuario toco "Compartir mi ubicación": se pide permiso y se repite su pregunta
  const compartirUbicacion = async (pregunta: string) => {
    if (buscandoUbicacion || pensando) return;
    setBuscandoUbicacion(true);
    try {
      const nueva = await obtenerUbicacion();
      setUbicacion(nueva);
      // el boton ya no hace falta en ese mensaje
      setMensajes((anteriores) => anteriores.map((m) => (m.pideUbicacion ? { ...m, pideUbicacion: undefined } : m)));
      setBuscandoUbicacion(false);
      await enviar(pregunta, nueva, true);
    } catch (error) {
      setBuscandoUbicacion(false);
      const texto = error instanceof Error ? error.message : 'No pude obtener tu ubicación.';
      setMensajes((anteriores) => [...anteriores, { autor: 'asistente', texto, error: true }]);
    }
  };

  const alEnviar = (e: FormEvent) => {
    e.preventDefault();
    enviar(texto);
  };

  return (
    <>
      {abierto && (
        <section className="asistente-ventana" aria-label="Asistente de CultGo">
          <header className="asistente-encabezado">
            <div>
              <strong>Asistente CultGo!</strong>
              <span>Busca eventos escribiendo como hablas</span>
            </div>
            <div className="asistente-acciones">
              {mensajes.length > 1 && (
                <button
                  onClick={nuevaConversacion}
                  disabled={pensando}
                  className="asistente-cerrar"
                  aria-label="Nueva conversación"
                  title="Nueva conversación"
                >
                  ↺
                </button>
              )}
              <button onClick={() => setAbierto(false)} aria-label="Cerrar asistente" className="asistente-cerrar">
                ×
              </button>
            </div>
          </header>

          <div className="asistente-mensajes">
            {mensajes.map((m, i) => (
              <div key={i} className={`asistente-burbuja ${m.autor}${m.error ? ' con-error' : ''}`}>
                <p>{m.texto}</p>
                {m.pideUbicacion && (
                  <button
                    className="asistente-ubicacion"
                    onClick={() => compartirUbicacion(m.pideUbicacion!)}
                    disabled={buscandoUbicacion || pensando}
                  >
                    📍 {buscandoUbicacion ? 'Buscando tu ubicación...' : 'Compartir mi ubicación'}
                  </button>
                )}
                {m.eventos && m.eventos.length > 0 && (
                  <ul className="asistente-eventos">
                    {m.eventos.map((evento) => {
                      const { dia, mes } = partesFecha(evento.fecha);
                      return (
                        <li key={evento.id} className="asistente-evento-fila">
                          <Link to={`/evento/${evento.id}`} className="asistente-evento">
                            <span className="asistente-fecha">
                              <b>{dia}</b>
                              {mes}
                            </span>
                            <span className="asistente-evento-info">
                              <b>
                                {etiquetaEstado(evento) && (
                                  <span className="asistente-etiqueta">{etiquetaEstado(evento)}</span>
                                )}
                                {evento.nombre}
                              </b>
                              <small>
                                {evento.hora} · {evento.lugar}
                              </small>
                              {evento.distanciaKm !== undefined && (
                                <small className="asistente-distancia">
                                  📍 a {formatoDistancia(evento.distanciaKm)}
                                </small>
                              )}
                            </span>
                          </Link>
                          <a
                            href={enlaceRuta(evento)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="asistente-ruta"
                            aria-label={`Cómo llegar a ${evento.nombre}`}
                            title="Cómo llegar"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path d="M3 11l18-8-8 18-2-8-8-2z" />
                            </svg>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* llevar todos los resultados a la lista de la pagina */}
                {onVerEnPagina && m.idsTodos && m.idsTodos.length >= 2 && (
                  <button
                    className="asistente-ver-pagina"
                    onClick={() => {
                      onVerEnPagina(m.idsTodos!, m.pregunta ?? '');
                      setAbierto(false);
                    }}
                  >
                    Ver {m.total === m.idsTodos.length ? `los ${m.total}` : 'todos'} en la página →
                  </button>
                )}

                {/* preguntas sugeridas: solo en la ultima respuesta */}
                {i === mensajes.length - 1 && !pensando && m.sugerencias && m.sugerencias.length > 0 && (
                  <div className="asistente-seguimiento">
                    {m.sugerencias.map((s) => (
                      <button key={s} onClick={() => enviar(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* sugerencias solo al inicio */}
            {mensajes.length === 1 && (
              <div className="asistente-sugerencias">
                {SUGERENCIAS.map((s) => (
                  <button key={s} onClick={() => enviar(s)} disabled={pensando}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {pensando && (
              <div className="asistente-burbuja asistente pensando" aria-live="polite">
                <span /> <span /> <span />
              </div>
            )}
            <div ref={finRef} />
          </div>

          <form className="asistente-formulario" onSubmit={alEnviar}>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ej. rock este fin de semana"
              maxLength={300}
              aria-label="Escribe tu búsqueda"
            />
            <button type="submit" disabled={pensando || !texto.trim()}>
              Enviar
            </button>
          </form>
        </section>
      )}

      <button
        className="asistente-boton"
        onClick={() => setAbierto((a) => !a)}
        aria-label={abierto ? 'Cerrar asistente' : 'Abrir asistente'}
      >
        {abierto ? '×' : '💬'}
      </button>
    </>
  );
};

export default Asistente;