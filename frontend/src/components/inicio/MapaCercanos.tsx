import { Link } from 'react-router-dom';
import type { EventoEnAgenda } from '../../utils/agenda';
import { calcularDistancia } from '../../utils/distancia';
import { enlaceRuta } from '../../utils/mapas';

interface Props {
  // solo eventos que aun no pasan (esta semana y proximos)
  eventos: EventoEnAgenda[];
  ubicacion: { lat: number; lon: number } | null;
  cargandoUbicacion: boolean;
  onPedirUbicacion: () => void;
}

const RADIO_CERCA_KM = 3;
// si el usuario esta muy lejos (otra ciudad), no se dibuja su punto: el mapa quedaria diminuto
const MAXIMO_PARA_DIBUJAR_KM = 25;

const colorPin = (item: EventoEnAgenda) =>
  item.dias === 0 ? 'var(--grana)' : item.grupo === 'semana' ? 'var(--cempasuchil)' : 'var(--cantera)';

// mapa ilustrado: coloca cada evento segun su latitud y longitud dentro del recuadro
const MapaCercanos = ({ eventos, ubicacion, cargandoUbicacion, onPedirUbicacion }: Props) => {
  const conCoordenadas = eventos.filter(
    ({ evento }) => Number.isFinite(evento.latitud) && Number.isFinite(evento.longitud)
  );
  if (conCoordenadas.length === 0) return null;

  const distanciaDe = (item: EventoEnAgenda) =>
    ubicacion ? calcularDistancia(ubicacion.lat, ubicacion.lon, item.evento.latitud, item.evento.longitud) : Infinity;

  const masCercano = ubicacion
    ? conCoordenadas.reduce((mejor, item) => (distanciaDe(item) < distanciaDe(mejor) ? item : mejor))
    : null;
  const dibujarUsuario = !!masCercano && distanciaDe(masCercano) <= MAXIMO_PARA_DIBUJAR_KM;

  // limites del recuadro (con el usuario incluido si esta cerca)
  const lats = conCoordenadas.map((i) => i.evento.latitud);
  const lons = conCoordenadas.map((i) => i.evento.longitud);
  if (dibujarUsuario && ubicacion) {
    lats.push(ubicacion.lat);
    lons.push(ubicacion.lon);
  }
  const centroLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centroLon = (Math.min(...lons) + Math.max(...lons)) / 2;
  // tamaño minimo para que un solo evento no quede en una esquina
  const altoLat = Math.max(Math.max(...lats) - Math.min(...lats), 0.008);
  const anchoLon = Math.max(Math.max(...lons) - Math.min(...lons), 0.012);

  // de coordenadas a porcentaje dentro del recuadro; abajo se deja libre para el texto y el boton
  const posicion = (lat: number, lon: number) => ({
    left: `${50 + ((lon - centroLon) / anchoLon) * 80}%`,
    top: `${38 - ((lat - centroLat) / altoLat) * 46}%`,
  });

  const cerca = ubicacion
    ? conCoordenadas.filter((i) => distanciaDe(i) <= RADIO_CERCA_KM).length
    : 0;

  const titulo = !ubicacion
    ? `${conCoordenadas.length} ${conCoordenadas.length === 1 ? 'evento' : 'eventos'} en el mapa`
    : cerca > 0
      ? `${cerca} ${cerca === 1 ? 'evento' : 'eventos'} cerca de ti`
      : 'No hay eventos a menos de 3 km';

  return (
    <section id="mapa" className="mapa-cercanos" aria-label="Mapa de eventos">
      <div className="mapa-lienzo">
        {/* calles decorativas */}
        <span className="mapa-calle mapa-calle-h" aria-hidden="true" />
        <span className="mapa-calle mapa-calle-v" aria-hidden="true" />

        {conCoordenadas.map((item, i) => (
          <Link
            key={item.evento.id}
            to={`/evento/${item.evento.id}`}
            className="mapa-pin"
            style={{
              ...posicion(item.evento.latitud, item.evento.longitud),
              ['--color-pin' as string]: colorPin(item),
              animationDelay: `${(i % 5) * 0.35}s`,
            }}
            aria-label={`${item.evento.nombre} en ${item.evento.lugar}`}
          >
            <span className="mapa-gota" aria-hidden="true" />
            <span className="mapa-nombre">{item.evento.nombre}</span>
          </Link>
        ))}

        {dibujarUsuario && ubicacion && (
          <span className="mapa-yo" style={posicion(ubicacion.lat, ubicacion.lon)} title="Tú estás aquí">
            <span className="mapa-yo-onda" aria-hidden="true" />
          </span>
        )}

        <div className="mapa-pie">
          <div>
            <b>{titulo}</b>
            <small className="mapa-leyenda">
              <span style={{ background: 'var(--grana)' }} /> Hoy
              <span style={{ background: 'var(--cempasuchil)' }} /> Esta semana
              <span style={{ background: 'var(--cantera)' }} /> Más adelante
            </small>
          </div>
          {masCercano ? (
            <a href={enlaceRuta(masCercano.evento)} target="_blank" rel="noopener noreferrer" className="mapa-boton">
              Cómo llegar al más cercano
            </a>
          ) : (
            <button type="button" onClick={onPedirUbicacion} disabled={cargandoUbicacion} className="mapa-boton">
              {cargandoUbicacion ? 'Buscando...' : 'Usar mi ubicación'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default MapaCercanos;
