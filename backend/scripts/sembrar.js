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
    imagen: '/eventos/rock.jpg',
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
    imagen: '/eventos/jazz.jpg',
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
    imagen: '/eventos/electronica.jpg',
  },
];

// musica de referencia para el reproductor del detalle: los artistas de ejemplo son
// inventados, asi que cada uno lleva un video y una cancion/playlist reales de ese genero
const MUSICA = {
  'Marimbas en el Zócalo': {
    youtube: 'https://www.youtube.com/watch?v=a_OchuoxlFs', // Marimba del Estado de Oaxaca en el Zócalo
    spotify: 'https://open.spotify.com/track/16dCeXPB6aFgTOuFC2fDLc', // La Marimba del Estado de Oaxaca
  },
  'Rock en la Plaza de la Danza': {
    youtube: 'https://www.youtube.com/watch?v=Av4qdVd-BpI', // Enjambre en vivo en Oaxaca
    spotify: 'https://open.spotify.com/track/5hzC6inZc0Wv2g5ByF1CcY', // Enjambre, Somos Ajenos
  },
  'Sones para los Fieles Difuntos': {
    youtube: 'https://www.youtube.com/watch?v=5iyMimj2SA0', // Trío Xhavizende, Juchitán
    spotify: 'https://open.spotify.com/album/06SdrXSpXH6b7VuaAg3TRY', // Trío Montealbán, Sones Istmeños
  },
  'Noche de Sones Istmeños': {
    youtube: 'https://www.youtube.com/watch?v=qYhuj5XFJlI', // La Llorona y La Sandunga, Guelaguetza
    spotify: 'https://open.spotify.com/playlist/2oiczhTX0Ami0a8W1zhd2e', // playlist de sones istmeños
  },
  'Festival Guelaguetza Sonora': {
    youtube: 'https://www.youtube.com/watch?v=2Ns8IhXWqdk', // Banda Filarmónica de Tlahuitoltepec
    spotify: 'https://open.spotify.com/track/3sz9Yl23A7MSLJjSb7V6PD', // Banda del CECAM, Sones Mixes de Tlahuitoltepec
  },
  'Jazz entre Muros de Cantera': {
    youtube: 'https://www.youtube.com/watch?v=wgn_drJazbQ', // Festival de Jazz de Mazunte
    spotify: 'https://open.spotify.com/playlist/3gr8sawtph59rJSp4SPMZo', // playlist Jazz en México
  },
  'Canciones del Valle': {
    youtube: 'https://www.youtube.com/watch?v=aedtzI1AHyg', // Lila Downs, La Llorona en vivo
    spotify: 'https://open.spotify.com/track/7pidjElpO3qLdYtKA7T021', // Lila Downs, La Llorona
  },
  'Calenda Electrónica': {
    youtube: 'https://www.youtube.com/watch?v=ywNV8SStTSg', // live set en Santa María Xadani
    spotify: 'https://open.spotify.com/playlist/37i9dQZF1DX11Ia2xt6mrG', // playlist mint MX, electrónica mexicana
  },
};

(async () => {
  let insertados = 0;
  let conFoto = 0;
  let conMusica = 0;
  try {
    for (const { dias, ...evento } of eventos) {
      const { rowCount } = await pool.query(
        `INSERT INTO eventos_cultgo (nombre, artista, genero, fecha, hora, lugar, direccion, latitud, longitud, descripcion, imagen, enlace_youtube, enlace_spotify)
         SELECT $1::varchar, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
         WHERE NOT EXISTS (SELECT 1 FROM eventos_cultgo WHERE nombre = $1::varchar);`,
        [evento.nombre, evento.artista, evento.genero, enDias(dias), evento.hora, evento.lugar,
          evento.direccion, evento.latitud, evento.longitud, evento.descripcion, evento.imagen ?? null,
          MUSICA[evento.nombre]?.youtube ?? null, MUSICA[evento.nombre]?.spotify ?? null]
      );
      insertados += rowCount;

      // si el evento ya existia sin foto (se sembro con la version anterior), se le pone
      if (evento.imagen) {
        const actualizado = await pool.query(
          `UPDATE eventos_cultgo SET imagen = $2 WHERE nombre = $1::varchar AND (imagen IS NULL OR imagen = '');`,
          [evento.nombre, evento.imagen]
        );
        conFoto += actualizado.rowCount;
      }

      // igual con la musica: solo se llena lo que este vacio, sin pisar lo que puso el admin
      const musica = MUSICA[evento.nombre];
      if (musica) {
        const actualizado = await pool.query(
          `UPDATE eventos_cultgo
           SET enlace_youtube = COALESCE(NULLIF(enlace_youtube, ''), $2),
               enlace_spotify = COALESCE(NULLIF(enlace_spotify, ''), $3)
           WHERE nombre = $1::varchar
             AND (COALESCE(enlace_youtube, '') = '' OR COALESCE(enlace_spotify, '') = '');`,
          [evento.nombre, musica.youtube, musica.spotify]
        );
        conMusica += actualizado.rowCount;
      }
    }
    console.log(`Eventos de ejemplo insertados: ${insertados} (ya existian: ${eventos.length - insertados})`);
    if (conFoto) console.log(`Eventos existentes a los que se les agrego foto: ${conFoto}`);
    if (conMusica) console.log(`Eventos existentes a los que se les agrego video o Spotify: ${conMusica}`);
  } catch (error) {
    console.error('Error cargando eventos de ejemplo:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();