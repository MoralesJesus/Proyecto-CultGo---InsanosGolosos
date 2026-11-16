import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Evento } from '../../types';
import { preguntarAsistente } from '../../services/asistenteService';
import { partesFecha } from '../../utils/formato';
import '../../styles/asistente.css';

interface Mensaje {
  autor: 'usuario' | 'asistente';
  texto: string;
  eventos?: Evento[];
  error?: boolean;
}

// ideas para que el usuario sepa que puede preguntar
const SUGERENCIAS = [
  'Quiero rock este fin de semana',
  '¿Qué hay de jazz en diciembre?',
  '¿Qué eventos hay en el centro?',
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
const Asistente = () => {
  const [abierto, setAbierto] = useState<boolean>(() => leerGuardado(CLAVE_ABIERTO, false));
  const [mensajes, setMensajes] = useState<Mensaje[]>(() => leerGuardado(CLAVE_CHAT, [SALUDO]));
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
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

  const enviar = async (mensaje: string) => {
    const limpio = mensaje.trim();
    if (!limpio || pensando) return;
    setTexto('');
    setMensajes((anteriores) => [...anteriores, { autor: 'usuario', texto: limpio }]);
    setPensando(true);
    try {
      const { respuesta, eventos } = await preguntarAsistente(limpio);
      setMensajes((anteriores) => [...anteriores, { autor: 'asistente', texto: respuesta, eventos }]);
    } catch (error) {
      const texto = error instanceof Error ? error.message : 'El asistente no está disponible.';
      setMensajes((anteriores) => [...anteriores, { autor: 'asistente', texto, error: true }]);
    } finally {
      setPensando(false);
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
                {m.eventos && m.eventos.length > 0 && (
                  <ul className="asistente-eventos">
                    {m.eventos.map((evento) => {
                      const { dia, mes } = partesFecha(evento.fecha);
                      return (
                        <li key={evento.id}>
                          <Link to={`/evento/${evento.id}`} className="asistente-evento">
                            <span className="asistente-fecha">
                              <b>{dia}</b>
                              {mes}
                            </span>
                            <span className="asistente-evento-info">
                              <b>{evento.nombre}</b>
                              <small>
                                {evento.hora} · {evento.lugar}
                              </small>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}

            {/* sugerencias solo al inicio */}
            {mensajes.length === 1 && (
              <div className="asistente-sugerencias">
                {SUGERENCIAS.map((s) => (
                  <button key={s} onClick={() => enviar(s)}>
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