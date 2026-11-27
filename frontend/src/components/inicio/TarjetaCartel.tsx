import { Link } from 'react-router-dom';
import type { Evento } from '../../types';
import { fondoImagen } from '../../utils/imagenes';

interface Props {
  evento: Evento;
  etiqueta?: string;
  // distancia en km si el usuario compartio su ubicacion
  distanciaKm?: number;
  // para que las tarjetas entren una tras otra
  orden?: number;
}

// colores de respaldo cuando el evento no tiene foto
const COLORES = ['#8f1d38', '#1f5a3a', '#2c3280', '#8a4f0f', '#5b2a86', '#155e75'];
const colorDe = (texto: string) =>
  COLORES[[...texto].reduce((suma, letra) => suma + letra.charCodeAt(0), 0) % COLORES.length];

const formatoKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

// tarjeta vertical tipo cartel de concierto (seccion "Esta semana")
const TarjetaCartel = ({ evento, etiqueta, distanciaKm, orden = 0 }: Props) => {
  const imagen = fondoImagen(evento.imagen);

  return (
    <Link
      to={`/evento/${evento.id}`}
      className="cartel"
      style={{ animationDelay: `${orden * 0.08}s` }}
    >
      <div
        className="cartel-fondo"
        style={
          imagen
            ? { backgroundImage: imagen }
            : { background: `radial-gradient(circle at 30% 20%, ${colorDe(evento.genero)}, #0b0c18 75%)` }
        }
      />
      <span className="cartel-genero-gigante" aria-hidden="true">
        {evento.genero}
      </span>
      <div className="cartel-sombra" />
      {etiqueta && <span className="cartel-etiqueta">{etiqueta}</span>}
      <div className="cartel-info">
        <small>
          {evento.genero} · {evento.hora}
        </small>
        <h3>{evento.nombre}</h3>
        <span className="cartel-lugar">
          {evento.lugar}
          {distanciaKm !== undefined && ` · a ${formatoKm(distanciaKm)}`}
        </span>
      </div>
    </Link>
  );
};

export default TarjetaCartel;
