import React from 'react';

interface BuscadorProps {
  valor: string;
  onCambio: (texto: string) => void;
}

const Buscador: React.FC<BuscadorProps> = ({ valor, onCambio }) => {
  return (
    <label className="buscador">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        type="search"
        placeholder="Buscar evento o artista..."
        aria-label="Buscar evento o artista"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
      />
    </label>
  );
};

export default Buscador;
