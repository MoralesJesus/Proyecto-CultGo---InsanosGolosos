export interface Evento {
  id: number;
  nombre: string;
  artista: string;
  genero: string;
  fecha: string;
  hora: string;
  lugar: string;
  direccion: string;
  latitud: number;
  longitud: number;
  descripcion: string;
  // links a la musica del artista ( no todos los artistas los tienen)
  enlaceSpotify?: string;
  enlaceYoutube?: string;
}