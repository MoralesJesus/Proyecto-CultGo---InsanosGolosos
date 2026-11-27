// convierte el link que pega el admin en la direccion que se puede incrustar en la pagina.
// Si el link no se reconoce regresa null y en el detalle solo queda el boton de siempre.

// youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID
export const embedYoutube = (enlace?: string): string | null => {
  if (!enlace) return null;
  try {
    const url = new URL(enlace.trim());
    const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = url.pathname.slice(1);
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      id = url.searchParams.get('v') ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ?? null;
    }
    // los id de YouTube son de 11 caracteres
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    // la version "nocookie" no guarda cookies de seguimiento hasta que se le da play
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
  } catch {
    return null;
  }
};

// open.spotify.com/track|album|artist|playlist|episode|show/ID (tambien con /intl-es/ en medio)
export const embedSpotify = (enlace?: string): string | null => {
  if (!enlace) return null;
  try {
    const url = new URL(enlace.trim());
    if (url.hostname !== 'open.spotify.com') return null;
    const m = url.pathname.match(/\/(track|album|artist|playlist|episode|show)\/([A-Za-z0-9]+)/);
    return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
  } catch {
    return null;
  }
};
