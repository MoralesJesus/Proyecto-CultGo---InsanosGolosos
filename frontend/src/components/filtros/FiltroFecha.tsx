import React from 'react';

interface FiltroFechaProps {
  fechaSeleccionada: string;
  onCambio: (fecha: string) => void;
}

const FiltroFecha: React.FC<FiltroFechaProps> = ({ fechaSeleccionada, onCambio }) => {
  return (
    <input
      type="date"
      value={fechaSeleccionada}
      onChange={(e) => onCambio(e.target.value)}
      style={{ padding: '8px', marginBottom: '16px', marginLeft: '8px' }}
    />
  );
};

export default FiltroFecha;