import React from 'react';
import type { Evento } from '../../types';
import { partesFecha } from '../../utils/formato';
import { urlImagen } from '../../utils/imagenes';

interface TarjetaEventoProps {
  evento: Evento;
  // "destacada" = es esta semana; "terminada" = ya paso o se cancelo
  variante?: 'destacada' | 'terminada';
  // aviso corto en la esquina: "¡Hoy!", "En 3 días", "Finalizado"...
  etiqueta?: string;
}

// la tarjeta parece un boleto: el talon con la fecha a la izquierda y la info a la derecha
const TarjetaEvento: React.FC<TarjetaEventoProps> = ({ evento, variante, etiqueta }) => {
  const { dia, mes, semana } = partesFecha(evento.fecha);

  return (
    <article className={`tarjeta-evento${variante ? ` ${variante}` : ''}`}>
      <div className="talon" aria-hidden="true">
        <span className="talon-semana">{semana}</span>
        <span className="talon-dia">{dia}</span>
        <span className="talon-mes">{mes}</span>
      </div>

      <div className="tarjeta-cuerpo">
        {/* foto de fondo, solo si el evento tiene imagen */}
        {evento.imagen && (
          <div
            className="tarjeta-fondo"
            style={{ backgroundImage: `url(${urlImagen(evento.imagen)})` }}
          />
        )}

        {/* el texto va en otra capa para que no se desenfoque */}
        <div className="tarjeta-contenido">
          <div className="tarjeta-etiquetas">
            <span className="etiqueta-genero">{evento.genero}</span>
            {etiqueta && <span className="etiqueta-cuando">{etiqueta}</span>}
          </div>
          <h3>{evento.nombre}</h3>
          <p className="tarjeta-artista">{evento.artista}</p>
          <p className="tarjeta-datos">
            <span>{evento.fecha} - {evento.hora}</span>
            <span>{evento.lugar}</span>
          </p>
          <p className="tarjeta-descripcion">{evento.descripcion}</p>
        </div>
      </div>
    </article>
  );
};

export default TarjetaEvento;
