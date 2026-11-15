import React from 'react';

interface FiltroFechaProps {
  fechaSeleccionada: string;
  onCambio: (fecha: string) => void;
}

const FiltroFecha: React.FC<FiltroFechaProps> = ({ fechaSeleccionada, onCambio }) => {
  return (
    <div className={fechaSeleccionada ? 'filtro-fecha con-fecha' : 'filtro-fecha'}>
      <input
        type="date"
        aria-label="Filtrar por fecha"
        value={fechaSeleccionada}
        onChange={(e) => onCambio(e.target.value)}
      />
      {/* texto propio que se ve solo cuando no hay fecha elegida */}
      {!fechaSeleccionada && <span className="texto-fecha">Elegir fecha</span>}
    </div>
  );
};

export default FiltroFecha;
