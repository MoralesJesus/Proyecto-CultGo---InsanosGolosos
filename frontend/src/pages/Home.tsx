import TarjetaEvento from '../components/eventos/TarjetaEvento';
import type { Evento } from '../types';

const eventoPrueba: Evento = {
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
};

const Home = () => {
  return (
    <div>
      <h1>CultGo!</h1>
      <p>Encuentra eventos musicales en Oaxaca de Juarez</p>
      <TarjetaEvento evento={eventoPrueba} />
    </div>
  );
};

export default Home;