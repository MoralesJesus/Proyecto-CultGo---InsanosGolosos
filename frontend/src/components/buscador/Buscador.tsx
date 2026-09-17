import React from 'react';

interface BuscadorProps {
  valor: string;
  onCambio: (texto: string) => void;
}

const Buscador: React.FC<BuscadorProps> = ({ valor, onCambio }) => {
  return (
    <input
      type="text"
      placeholder="Buscar evento o artista..."
      value={valor}
      onChange={(e) => onCambio(e.target.value)}
      style={{ padding: '8px', width: '100%', marginBottom: '16px' }}
    />
  );
};

export default Buscador;