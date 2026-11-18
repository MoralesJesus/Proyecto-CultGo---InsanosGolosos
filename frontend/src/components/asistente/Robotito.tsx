import { useEffect, useRef } from 'react';

// robotito del asistente: SVG dibujado a mano + animaciones en asistente.css
// estados:
//   reposo   -> flota, parpadea y la antena brilla
//   pensando -> mira de lado a lado y la antena parpadea rapido
//   feliz    -> ojitos de "^ ^" (cuando acaba de responder)
export type EstadoRobot = 'reposo' | 'pensando' | 'feliz';

interface Props {
  estado?: EstadoRobot;
  // si es true, los ojos siguen al puntero del mouse
  sigueMouse?: boolean;
  className?: string;
}

const Robotito = ({ estado = 'reposo', sigueMouse = false, className = '' }: Props) => {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!sigueMouse || !svg) return;
    // respetar a quien pidio menos animaciones en su sistema
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cuadro = 0;
    const alMover = (e: PointerEvent) => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        const r = svg.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const largo = Math.hypot(dx, dy) || 1;
        // los ojos se mueven maximo 3 unidades hacia donde esta el mouse
        const fuerza = Math.min(largo / 120, 1) * 3;
        svg.style.setProperty('--mx', `${((dx / largo) * fuerza).toFixed(2)}px`);
        svg.style.setProperty('--my', `${((dy / largo) * fuerza).toFixed(2)}px`);
      });
    };
    window.addEventListener('pointermove', alMover);
    return () => {
      cancelAnimationFrame(cuadro);
      window.removeEventListener('pointermove', alMover);
      svg.style.removeProperty('--mx');
      svg.style.removeProperty('--my');
    };
  }, [sigueMouse]);

  return (
    <svg
      ref={ref}
      viewBox="0 0 64 64"
      className={`robotito robotito-${estado} ${className}`}
      aria-hidden="true"
    >
      <g className="robot-cuerpo">
        {/* antena */}
        <line x1="32" y1="15" x2="32" y2="8" className="robot-palito" />
        <circle cx="32" cy="6" r="3.6" className="robot-foco" />

        {/* orejitas */}
        <rect x="5" y="26" width="6" height="12" rx="3" className="robot-oreja" />
        <rect x="53" y="26" width="6" height="12" rx="3" className="robot-oreja" />

        {/* cabeza y pantalla */}
        <rect x="9" y="14" width="46" height="36" rx="13" className="robot-cabeza" />
        <rect x="15" y="20.5" width="34" height="23" rx="9" className="robot-pantalla" />

        <g className="robot-mirada">
          {/* ojos normales (parpadean) */}
          <g className="robot-ojos">
            <ellipse cx="25" cy="30" rx="3.4" ry="4.4" />
            <ellipse cx="39" cy="30" rx="3.4" ry="4.4" />
          </g>
          {/* ojos felices ^ ^ */}
          <g className="robot-ojos-felices">
            <path d="M21.5 31.5 Q25 26 28.5 31.5" />
            <path d="M35.5 31.5 Q39 26 42.5 31.5" />
          </g>
          {/* boca: sonrisa o rayita cuando piensa */}
          <path d="M28 37 Q32 40.5 36 37" className="robot-sonrisa" />
          <path d="M29 38.5 H35" className="robot-boca-seria" />
        </g>

        {/* cachetitos */}
        <circle cx="19.5" cy="38" r="2" className="robot-cachete" />
        <circle cx="44.5" cy="38" r="2" className="robot-cachete" />
      </g>
    </svg>
  );
};

export default Robotito;
