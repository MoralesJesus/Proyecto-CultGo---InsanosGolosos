import React from 'react';
import type { Evento } from '../../types';

interface TarjetaEventoProps {
  evento: Evento;
}

const TarjetaEvento: React.FC<TarjetaEventoProps> = ({ evento }) => {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
      <h3>{evento.nombre}</h3>
      <p><strong>Artista:</strong> {evento.artista}</p>
      <p><strong>Genero:</strong> {evento.genero}</p>
      <p><strong>Fecha:</strong> {evento.fecha} - {evento.hora}</p>
      <p><strong>Lugar:</strong> {evento.lugar}</p>
      <p>{evento.descripcion}</p>
    </div>
  );
};

export default TarjetaEvento;