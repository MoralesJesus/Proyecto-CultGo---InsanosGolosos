import React from 'react';
import type { Evento } from '../../types';
import { partesFecha } from '../../utils/formato';

interface TarjetaEventoProps {
  evento: Evento;
}

// la tarjeta parece un boleto: el talon con la fecha a la izquierda y la info a la derecha
const TarjetaEvento: React.FC<TarjetaEventoProps> = ({ evento }) => {
  const { dia, mes, semana } = partesFecha(evento.fecha);

  return (
    <article className="tarjeta-evento">
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
            style={{ backgroundImage: `url(${evento.imagen})` }}
          />
        )}

        {/* el texto va en otra capa para que no se desenfoque */}
        <div className="tarjeta-contenido">
          <span className="etiqueta-genero">{evento.genero}</span>
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
