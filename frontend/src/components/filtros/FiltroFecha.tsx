import React from 'react';

interface FiltroFechaProps {
  fechaSeleccionada: string;
  onCambio: (fecha: string) => void;
}

const FiltroFecha: React.FC<FiltroFechaProps> = ({ fechaSeleccionada, onCambio }) => {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <input
        type="date"
        value={fechaSeleccionada}
        onChange={(e) => onCambio(e.target.value)}
        style={{
          padding: '6px 8px',
          fontSize: '14px',
          minWidth: '130px',
          minHeight: '30px',
          // si no hay fecha, esconde el texto vacio del navegador
          color: fechaSeleccionada ? 'white' : 'transparent'
        }}
      />
      {/* texto propio que se ve solo cuando no hay fecha elegida */}
      {!fechaSeleccionada && (
        <span
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            fontSize: '14px',
            color: 'white'
          }}
        >
          Elegir fecha
        </span>
      )}
    </div>
  );
};

export default FiltroFecha;