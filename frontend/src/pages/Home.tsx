import { useState } from 'react';
import { Link } from 'react-router-dom';
import TarjetaEvento from '../components/eventos/TarjetaEvento';
import Buscador from '../components/buscador/Buscador';
import FiltroGenero from '../components/filtros/FiltroGenero';
import type { Evento } from '../types';

// Datos de prueba, despues vendran del backend
const eventosPrueba: Evento[] = [
  {
    id: 1,
    nombre: 'Noche de Rock en el Centro',
    artista: 'Los Alebrijes',
    genero: 'Rock',
    fecha: '20/10/2026',
    hora: '8:00 PM',
    lugar: 'Casa de la Cultura Oaxaqueña',
    direccion: 'Av. Independencia 123',
    latitud: 17.0654,
    longitud: -96.7237,
    descripcion: 'Concierto en vivo con bandas locales de rock alternativo.'
  },
  {
    id: 2,
    nombre: 'Jazz Bajo las Estrellas',
    artista: 'Trio Nocturno',
    genero: 'Jazz',
    fecha: '25/10/2026',
    hora: '9:00 PM',
    lugar: 'Jardin Etnobotanico',
    direccion: 'Reforma 501',
    latitud: 17.0678,
    longitud: -96.7245,
    descripcion: 'Una velada intima de jazz en un espacio al aire libre.'
  },
  {
    id: 3,
    nombre: 'Fiesta Electronica Oaxaca',
    artista: 'DJ Sunu',
    genero: 'Electronica',
    fecha: '01/11/2026',
    hora: '10:00 PM',
    lugar: 'Foro Cultural',
    direccion: 'Calle Morelos 200',
    latitud: 17.0601,
    longitud: -96.7266,
    descripcion: 'Musica electronica con artistas locales y visuales en vivo.'
  }
];

// lista de generos disponibles, sacada de los eventos (sin repetidos)
const generosDisponibles = [...new Set(eventosPrueba.map((e) => e.genero))];

const Home = () => {
  const [busqueda, setBusqueda] = useState('');
  const [genero, setGenero] = useState('');

  // filtro combinado: coincide con el texto Y con el genero (si hay uno elegido)
  const eventosFiltrados = eventosPrueba.filter((evento) => {
    const coincideTexto =
      evento.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      evento.artista.toLowerCase().includes(busqueda.toLowerCase());

    const coincideGenero = genero === '' || evento.genero === genero;

    return coincideTexto && coincideGenero;
  });

    return (
    <div style={{ padding: '20px' }}>
      {/* barra superior con el boton de login a la derecha */}
            <div style={{ position: 'relative', textAlign: 'center' }}>
        <h1 className="titulo-animado">CultGo!</h1>
        <Link to="/login">
          <button style={{ position: 'absolute', top: '10px', right: '0', padding: '8px 16px', cursor: 'pointer' }}>
            Iniciar sesion
          </button>
        </Link>
      </div>
      <p>Encuentra eventos musicales en Oaxaca de Juarez</p>

      <Buscador valor={busqueda} onCambio={setBusqueda} />
      <FiltroGenero generoSeleccionado={genero} generos={generosDisponibles} onCambio={setGenero} />

      {eventosFiltrados.map((evento) => (
        <TarjetaEvento key={evento.id} evento={evento} />
      ))}
    </div>
  );
};

export default Home;