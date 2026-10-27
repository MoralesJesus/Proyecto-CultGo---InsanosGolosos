import React from 'react';
import type { Evento } from '../../types';

interface TarjetaEventoProps {
  evento: Evento;
}

const TarjetaEvento: React.FC<TarjetaEventoProps> = ({ evento }) => {
  return (
    <div className="tarjeta-evento">
      {/* foto de fondo, solo si el evento tiene imagen */}
      {evento.imagen && (
        <div
          className="tarjeta-fondo"
          style={{ backgroundImage: `url(${evento.imagen})` }}
        />
      )}

      {/* el texto va en otra capa para que no se desenfoque */}
      <div className="tarjeta-contenido">
        <h3>{evento.nombre}</h3>
        <p><strong>Artista:</strong> {evento.artista}</p>
        <p><strong>Genero:</strong> {evento.genero}</p>
        <p><strong>Fecha:</strong> {evento.fecha} - {evento.hora}</p>
        <p><strong>Lugar:</strong> {evento.lugar}</p>
        <p>{evento.descripcion}</p>
      </div>
    </div>
  );
};

export default TarjetaEvento;