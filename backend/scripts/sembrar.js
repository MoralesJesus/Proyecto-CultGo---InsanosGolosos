// Carga eventos de ejemplo en Oaxaca para poder probar la app en una base nueva.
// Las fechas se calculan a partir de hoy: 3 eventos ya pasaron (para probar
// el filtro de expirados) y 5 son proximos. Si un evento con el mismo nombre
// ya existe, no se vuelve a insertar, asi que se puede correr varias veces.
// Uso: npm run sembrar
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = require('../db');

// fecha "DD/MM/YYYY" sumando dias a hoy (negativo = en el pasado)
const enDias = (dias) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${fecha.getFullYear()}`;
};

const eventos = [
  // ya pasaron
  {
    dias: -50, nombre: 'Marimbas en el Zócalo', artista: 'Marimba Orquesta Flor de Guiechachi', genero: 'Marimba',
    hora: '6:00 PM', lugar: 'Zócalo de Oaxaca', direccion: 'Plaza de la Constitución s/n, Centro, Oaxaca de Juárez',
    latitud: 17.0606, longitud: -96.7253, descripcion: 'Tarde de marimba y danzón frente al Palacio de Gobierno.',
  },
  {
    dias: -28, nombre: 'Rock en la Plaza de la Danza', artista: 'Los Alebrijes Eléctricos', genero: 'Rock',
    hora: '8:00 PM', lugar: 'Plaza de la Danza', direccion: 'Av. Independencia s/n, junto a la Basílica de la Soledad, Centro, Oaxaca de Juárez',
    latitud: 17.0618, longitud: -96.73, descripcion: 'Bandas oaxaqueñas de rock alternativo en un escenario al aire libre.',
  },
  {
    dias: -12, nombre: 'Sones para los Fieles Difuntos', artista: 'Ensamble Xquenda', genero: 'Son istmeño',
    hora: '9:00 PM', lugar: 'Panteón General de San Miguel', direccion: 'Calle Panteón General s/n, Centro, Oaxaca de Juárez',
    latitud: 17.0573, longitud: -96.714, descripcion: 'Concierto nocturno de sones y chilenas durante las celebraciones de Día de Muertos.',
  },
  // proximos
  {
    dias: 7, nombre: 'Noche de Sones Istmeños', artista: 'Ensamble Viento del Istmo', genero: 'Son istmeño',
    hora: '7:30 PM', lugar: 'Teatro Macedonio Alcalá', direccion: 'Av. Independencia 900, Centro, Oaxaca de Juárez',
    latitud: 17.0627, longitud: -96.724, descripcion: 'Concierto de sones tradicionales del Istmo de Tehuantepec con marimba y jarana.',
  },
  {
    dias: 14, nombre: 'Festival Guelaguetza Sonora', artista: 'Banda Filarmónica Mixe Tlahui', genero: 'Banda de viento',
    hora: '5:00 PM', lugar: 'Auditorio Guelaguetza', direccion: 'Cerro del Fortín s/n, Oaxaca de Juárez',
    latitud: 17.07, longitud: -96.733, descripcion: 'Muestra de bandas filarmónicas de la Sierra Mixe al aire libre.',
  },
  {
    dias: 20, nombre: 'Jazz entre Muros de Cantera', artista: 'Cuarteto Mezcal Azul', genero: 'Jazz',
    hora: '8:00 PM', lugar: 'Centro Cultural San Pablo', direccion: 'M. Hidalgo 907, Centro, Oaxaca de Juárez',
    latitud: 17.0604, longitud: -96.7243, descripcion: 'Jazz contemporáneo con fusiones de música oaxaqueña en el patio del ex convento.',
  },
  {
    dias: 22, nombre: 'Canciones del Valle', artista: 'Lila Guendaliza', genero: 'Trova',
    hora: '6:30 PM', lugar: 'Centro Cultural Santo Domingo', direccion: 'Macedonio Alcalá s/n esq. Gurrión, Centro, Oaxaca de Juárez',
    latitud: 17.0659, longitud: -96.7228, descripcion: 'Trova en zapoteco y español inspirada en los Valles Centrales.',
  },
  {
    dias: 29, nombre: 'Calenda Electrónica', artista: 'Colectivo Tlayuda Beat', genero: 'Electrónica',
    hora: '9:00 PM', lugar: 'Jardín El Llano (Paseo Juárez)', direccion: 'Paseo Juárez s/n, Centro, Oaxaca de Juárez',
    latitud: 17.0682, longitud: -96.7206, descripcion: 'Sesión electrónica con samples de chilenas y música de calenda.',
  },
];

(async () => {
  let insertados = 0;
  try {
    for (const { dias, ...evento } of eventos) {
      const { rowCount } = await pool.query(
        `INSERT INTO eventos_cultgo (nombre, artista, genero, fecha, hora, lugar, direccion, latitud, longitud, descripcion)
         SELECT $1::varchar, $2, $3, $4, $5, $6, $7, $8, $9, $10
         WHERE NOT EXISTS (SELECT 1 FROM eventos_cultgo WHERE nombre = $1::varchar);`,
        [evento.nombre, evento.artista, evento.genero, enDias(dias), evento.hora, evento.lugar,
          evento.direccion, evento.latitud, evento.longitud, evento.descripcion]
      );
      insertados += rowCount;
    }
    console.log(`Eventos de ejemplo insertados: ${insertados} (ya existian: ${eventos.length - insertados})`);
  } catch (error) {
    console.error('Error cargando eventos de ejemplo:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
