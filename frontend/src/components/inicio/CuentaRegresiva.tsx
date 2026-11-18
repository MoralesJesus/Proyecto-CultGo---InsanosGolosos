import { useEffect, useState } from 'react';

interface Props {
  // momento en que empieza el evento
  meta: Date;
}

const dos = (n: number) => String(n).padStart(2, '0');

// cuadritos de dias / horas / minutos / segundos que bajan cada segundo
const CuentaRegresiva = ({ meta }: Props) => {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);

  const resta = Math.floor((meta.getTime() - ahora) / 1000);

  // ya empezo (y sigue siendo el mismo dia): se avisa en lugar de mostrar ceros
  if (resta <= 0) {
    return (
      <p className="cuenta-empezo">
        <span className="punto-en-vivo" aria-hidden="true" /> ¡Ya empezó! Todavía alcanzas a llegar.
      </p>
    );
  }

  const partes = [
    { valor: Math.floor(resta / 86400), unidad: 'Días' },
    { valor: Math.floor((resta % 86400) / 3600), unidad: 'Horas' },
    { valor: Math.floor((resta % 3600) / 60), unidad: 'Min' },
    { valor: resta % 60, unidad: 'Seg' },
  ];

  return (
    <div className="cuenta-regresiva" role="timer" aria-label="Tiempo para que empiece el evento">
      {partes.map((p) => (
        <div key={p.unidad} className="cuenta-cuadro">
          <b>{dos(p.valor)}</b>
          <small>{p.unidad}</small>
        </div>
      ))}
    </div>
  );
};

export default CuentaRegresiva;
