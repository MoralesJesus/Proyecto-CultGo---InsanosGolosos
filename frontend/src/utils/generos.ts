// "la marimba", "el jazz", "la banda de viento", "el son istmeño"...
// regla sencilla del español: si la primera palabra termina en "a" es femenina
const FEMENINOS_SIN_A = ['canción', 'cancion'];
const MASCULINOS_CON_A = ['ska'];

export const articulo = (genero: string): 'el' | 'la' => {
  const primera = genero.trim().toLowerCase().split(/\s+/)[0] ?? '';
  if (FEMENINOS_SIN_A.includes(primera)) return 'la';
  if (MASCULINOS_CON_A.includes(primera)) return 'el';
  return primera.endsWith('a') ? 'la' : 'el';
};

// "la trova", "el rock"
export const conArticulo = (genero: string) => `${articulo(genero)} ${genero.trim().toLowerCase()}`;
