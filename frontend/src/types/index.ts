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
    // foto del evento (opcional)
  imagen?: string;
  // estado del evento (lo guarda el backend; si no viene se toma como "activo")
  estado?: EstadoEvento;
}

export type EstadoEvento = 'activo' | 'reprogramado' | 'cancelado' | 'finalizado';