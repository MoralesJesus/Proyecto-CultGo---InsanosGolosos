import React from 'react';

interface FiltroGeneroProps {
  generoSeleccionado: string;
  generos: string[];
  onCambio: (genero: string) => void;
}

const FiltroGenero: React.FC<FiltroGeneroProps> = ({ generoSeleccionado, generos, onCambio }) => {
  return (
    <select
      value={generoSeleccionado}
      onChange={(e) => onCambio(e.target.value)}
      style={{ padding: '8px', marginBottom: '16px' }}
    >
      {/* opcion para no filtrar por ningun genero */}
      <option value="">Todos los generos</option>

      {/* una opcion por cada genero disponible */}
      {generos.map((genero) => (
        <option key={genero} value={genero}>{genero}</option>
      ))}
    </select>
  );
};

export default FiltroGenero;