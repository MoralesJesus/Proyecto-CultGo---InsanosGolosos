interface ConfirmacionProps {
  titulo: string;
  texto: string;
  textoBoton: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export default function Confirmacion({
  titulo,
  texto,
  textoBoton,
  onConfirmar,
  onCancelar,
}: ConfirmacionProps) {
  return (
    <div className="admin-modal-fondo" onClick={onCancelar}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{titulo}</h3>
        <p>{texto}</p>
        <div className="admin-modal-botones">
          <button className="admin-boton-sec" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="admin-boton-peligro" onClick={onConfirmar}>
            {textoBoton}
          </button>
        </div>
      </div>
    </div>
  );
}
