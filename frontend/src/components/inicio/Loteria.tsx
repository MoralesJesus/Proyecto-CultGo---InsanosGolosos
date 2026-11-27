import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Evento } from '../../types';
import { fondoImagen } from '../../utils/imagenes';
import { articulo } from '../../utils/generos';
import { partesFecha } from '../../utils/formato';
import '../../styles/loteria.css';

interface Props {
  // solo eventos que aun no pasan
  eventos: Evento[];
}

// cuantas cartas boca abajo se ponen en la mesa
const CARTAS_EN_MESA = 5;

// dibujo de la carta cuando el evento no tiene foto
const DIBUJOS: [RegExp, string][] = [
  [/rock|metal|punk/, '🎸'],
  [/jazz|blues/, '🎷'],
  [/banda|viento|filarm/, '🎺'],
  [/marimba/, '🎼'],
  [/son|chilena|danz/, '💃'],
  [/electr|techno|house/, '🎧'],
  [/trova|canci|cantautor/, '🎤'],
];
const dibujoDe = (genero: string) => DIBUJOS.find(([re]) => re.test(genero.toLowerCase()))?.[1] ?? '🎵';

// lo que "canta" el griton de la loteria al voltear la carta
const GRITOS = [
  '¡Corre y vuela, que ya empieza!',
  '¡Arréglate, que nos vamos!',
  '¡Con este no te aburres!',
  '¡Ya te tocó, no hay pretexto!',
  '¡Agarra tu chamarra y vámonos!',
  '¡Aquí se armó la fiesta!',
];

const al = <T,>(lista: T[]) => lista[Math.floor(Math.random() * lista.length)];

// revuelve una copia de la lista (Fisher-Yates)
const barajar = <T,>(lista: T[]) => {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};

// "¿no sabes a donde ir?": cartas boca abajo, el usuario escoge una y se voltea.
// Si pide otra, la que ya salio se aparta del mazo (por algo no le gusto)
const Loteria = ({ eventos }: Props) => {
  const [descartadas, setDescartadas] = useState<number[]>([]);
  const [mesa, setMesa] = useState<Evento[]>(() => barajar(eventos).slice(0, CARTAS_EN_MESA));
  const [elegida, setElegida] = useState<Evento | null>(null);
  const [volteada, setVolteada] = useState(false);
  const [grito, setGrito] = useState('');
  // cambia en cada reparto para que las cartas vuelvan a entrar con animacion
  const [reparto, setReparto] = useState(0);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  if (eventos.length === 0) return null;

  const restantes = eventos.filter((e) => !descartadas.includes(e.id));

  const repartir = (sinEstas: number[]) => {
    const disponibles = eventos.filter((e) => !sinEstas.includes(e.id));
    setMesa(barajar(disponibles).slice(0, CARTAS_EN_MESA));
    setElegida(null);
    setVolteada(false);
    setReparto((r) => r + 1);
  };

  const escoger = (evento: Evento) => {
    setElegida(evento);
    setGrito(al(GRITOS));
    setVolteada(false);
    // un instante boca abajo y luego se voltea
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setVolteada(true), 60);
  };

  // "otra carta": la que salio ya no vuelve a salir en esta ronda
  const otra = () => {
    if (!elegida) return;
    const nuevas = [...descartadas, elegida.id];
    setDescartadas(nuevas);
    repartir(nuevas);
  };

  const deNuevo = () => {
    setDescartadas([]);
    repartir([]);
  };

  // ---------- ya escogio: la carta grande volteada y sus datos ----------
  if (elegida) {
    const fecha = partesFecha(elegida.fecha);
    const quedan = restantes.length - 1;
    return (
      <section id="loteria" className="inicio-seccion loteria" aria-label="Lotería de eventos">
        <Cabeza />
        <div className="loteria-mesa loteria-resultado-mesa">
          <div className={`loteria-carta${volteada ? ' volteada' : ''}`}>
            <div className="loteria-cara loteria-reverso" aria-hidden="true">
              <span className="loteria-logo">CultGo!</span>
            </div>
            <div className="loteria-cara loteria-frente">
              <span className="loteria-numero">{elegida.id}</span>
              <div
                className={`loteria-dibujo${elegida.imagen ? ' con-foto' : ''}`}
                style={elegida.imagen ? { backgroundImage: fondoImagen(elegida.imagen) } : undefined}
              >
                {!elegida.imagen && <span aria-hidden="true">{dibujoDe(elegida.genero)}</span>}
              </div>
              <span className="loteria-nombre">
                {articulo(elegida.genero)} {elegida.genero}
              </span>
            </div>
          </div>

          <div className="loteria-panel" aria-live="polite">
            <div className="loteria-resultado" key={elegida.id}>
              <p className="loteria-grito">{grito}</p>
              <h3>{elegida.nombre}</h3>
              <p className="loteria-artista">{elegida.artista}</p>
              <p className="loteria-datos">
                {fecha.semana} {fecha.dia} {fecha.mes}
                {elegida.hora && ` · ${elegida.hora}`}
                <br />
                {elegida.lugar}
              </p>
              <div className="loteria-botones">
                <Link to={`/evento/${elegida.id}`} className="loteria-boton">
                  Ver evento →
                </Link>
                {quedan > 0 ? (
                  <button type="button" className="loteria-boton-sec" onClick={otra}>
                    Otra carta ({quedan} {quedan === 1 ? 'queda' : 'quedan'})
                  </button>
                ) : (
                  <button type="button" className="loteria-boton-sec" onClick={deNuevo}>
                    Barajar de nuevo
                  </button>
                )}
              </div>
              {quedan === 0 && (
                <p className="loteria-aviso">Era la última carta del mazo. Si barajas de nuevo, vuelven a salir todas.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ---------- la mesa: cartas boca abajo para escoger ----------
  return (
    <section id="loteria" className="inicio-seccion loteria" aria-label="Lotería de eventos">
      <Cabeza />
      <div className="loteria-mesa loteria-mesa-cartas">
        <p className="loteria-grito">
          {descartadas.length ? '¡Otra vez! Escoge una carta' : '¡Se va y se corre! Escoge una carta'}
        </p>
        <div className="loteria-abanico" key={reparto}>
          {mesa.map((evento, i) => {
            // abanico: las de las orillas un poco giradas y mas abajo
            const centro = (mesa.length - 1) / 2;
            const estilo = {
              '--giro': `${(i - centro) * 6}deg`,
              '--baja': `${Math.abs(i - centro) * 8}px`,
              animationDelay: `${i * 0.07}s`,
            } as CSSProperties;
            return (
              <button
                key={evento.id}
                type="button"
                className="loteria-carta-mesa"
                style={estilo}
                onClick={() => escoger(evento)}
                aria-label={`Carta ${i + 1} de ${mesa.length}, boca abajo`}
              >
                <span className="loteria-logo">CultGo!</span>
              </button>
            );
          })}
        </div>
        <p className="loteria-datos">
          {restantes.length} {restantes.length === 1 ? 'carta queda' : 'cartas quedan'} en el mazo
          {descartadas.length > 0 && ` (apartaste ${descartadas.length})`}.
        </p>
      </div>
    </section>
  );
};

const Cabeza = () => (
  <div className="seccion-cabeza">
    <h2>¿No sabes a dónde ir?</h2>
    <span>Escoge una carta de la lotería y te decimos qué hay</span>
  </div>
);

export default Loteria;
