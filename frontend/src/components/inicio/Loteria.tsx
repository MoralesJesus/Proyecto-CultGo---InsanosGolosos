import { useEffect, useRef, useState } from 'react';
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

// lo que "canta" el gritón de la loteria al sacar la carta
const GRITOS = [
  '¡Corre y vuela, que ya empieza!',
  '¡Arréglate, que nos vamos!',
  '¡Con este no te aburres!',
  '¡Ya te tocó, no hay pretexto!',
  '¡Agarra tu chamarra y vámonos!',
  '¡Aquí se armó la fiesta!',
];

const al = <T,>(lista: T[]) => lista[Math.floor(Math.random() * lista.length)];

type Estado = 'tapada' | 'barajando' | 'volteada';

// "¿no sabes a donde ir?": se saca una carta y sale un evento al azar
const Loteria = ({ eventos }: Props) => {
  const [estado, setEstado] = useState<Estado>('tapada');
  const [carta, setCarta] = useState<Evento | null>(null);
  const [grito, setGrito] = useState('');
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  if (eventos.length === 0) return null;

  const sacar = () => {
    if (estado === 'barajando') return;
    // que no salga la misma carta dos veces seguidas (si hay de donde escoger)
    const opciones = eventos.length > 1 ? eventos.filter((e) => e.id !== carta?.id) : eventos;
    const siguiente = al(opciones);
    setEstado('barajando');
    temporizador.current = setTimeout(() => {
      setCarta(siguiente);
      setGrito(al(GRITOS));
      setEstado('volteada');
    }, 900);
  };

  const nombreCarta = carta ? `${articulo(carta.genero)} ${carta.genero}` : '';
  const fecha = carta ? partesFecha(carta.fecha) : null;

  return (
    <section id="loteria" className="inicio-seccion loteria" aria-label="Lotería de eventos">
      <div className="seccion-cabeza">
        <h2>¿No sabes a dónde ir?</h2>
        <span>Saca una carta de la lotería y te decimos qué hay</span>
      </div>

      <div className="loteria-mesa">
        <div className={`loteria-carta ${estado}`}>
          <div className="loteria-cara loteria-reverso" aria-hidden={estado === 'volteada'}>
            <span className="loteria-logo">CultGo!</span>
            <span className="loteria-reverso-texto">Lotería de eventos</span>
          </div>

          <div className="loteria-cara loteria-frente" aria-hidden={estado !== 'volteada'}>
            {carta && (
              <>
                <span className="loteria-numero">{carta.id}</span>
                <div
                  className={`loteria-dibujo${carta.imagen ? ' con-foto' : ''}`}
                  style={carta.imagen ? { backgroundImage: fondoImagen(carta.imagen) } : undefined}
                >
                  {!carta.imagen && <span aria-hidden="true">{dibujoDe(carta.genero)}</span>}
                </div>
                <span className="loteria-nombre">{nombreCarta}</span>
              </>
            )}
          </div>
        </div>

        <div className="loteria-panel" aria-live="polite">
          {estado === 'volteada' && carta && fecha ? (
            <div className="loteria-resultado" key={carta.id}>
              <p className="loteria-grito">{grito}</p>
              <h3>{carta.nombre}</h3>
              <p className="loteria-artista">{carta.artista}</p>
              <p className="loteria-datos">
                {fecha.semana} {fecha.dia} {fecha.mes}
                {carta.hora && ` · ${carta.hora}`}
                <br />
                {carta.lugar}
              </p>
              <div className="loteria-botones">
                <Link to={`/evento/${carta.id}`} className="loteria-boton">
                  Ver evento →
                </Link>
                <button type="button" className="loteria-boton-sec" onClick={sacar}>
                  Sacar otra
                </button>
              </div>
            </div>
          ) : (
            <div className="loteria-resultado">
              <p className="loteria-grito">{estado === 'barajando' ? 'Barajando...' : '¡Se va y se corre!'}</p>
              <p className="loteria-datos">
                Hay {eventos.length} {eventos.length === 1 ? 'carta' : 'cartas'} en el mazo, una por cada evento que viene.
              </p>
              <div className="loteria-botones">
                <button type="button" className="loteria-boton" onClick={sacar} disabled={estado === 'barajando'}>
                  {estado === 'barajando' ? 'Barajando...' : '¡Saca una carta!'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Loteria;
