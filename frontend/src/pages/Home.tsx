import { useState } from 'react';
import TarjetaEvento from '../components/eventos/TarjetaEvento';
import Buscador from '../components/buscador/Buscador';
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

const Home = () => {
  const [busqueda, setBusqueda] = useState(''); // texto que escribe el usuario

  // filtro de busqueda: deja solo eventos que coincidan en nombre o artista
  const eventosFiltrados = eventosPrueba.filter((evento) =>
    evento.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    evento.artista.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ padding: '20px' }}>
      <h1>CultGo!</h1>
      <p>Encuentra eventos musicales en Oaxaca de Juarez</p>

      <Buscador valor={busqueda} onCambio={setBusqueda} />

      {/* dibuja una tarjeta por cada evento filtrado */}
      {eventosFiltrados.map((evento) => (
        <TarjetaEvento key={evento.id} evento={evento} />
      ))}
    </div>
  );
};

export default Home;