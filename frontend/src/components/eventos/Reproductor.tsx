import type { Evento } from '../../types';
import { embedSpotify, embedYoutube } from '../../utils/reproductor';
import { conArticulo } from '../../utils/generos';

interface Props {
  evento: Pick<Evento, 'nombre' | 'genero' | 'enlaceSpotify' | 'enlaceYoutube'>;
}

// "escucha antes de ir": el video o la cancion se reproduce aqui mismo, sin salir de la pagina
const Reproductor = ({ evento }: Props) => {
  const youtube = embedYoutube(evento.enlaceYoutube);
  const spotify = embedSpotify(evento.enlaceSpotify);
  if (!youtube && !spotify) return null;

  return (
    <section className="reproductor" aria-label="Escuchar antes de ir">
      <h2 className="reproductor-titulo">
        <span aria-hidden="true">🎧</span> Escucha antes de ir
      </h2>
      <p className="reproductor-nota">Dale play para darte una idea de cómo suena {evento.genero ? conArticulo(evento.genero) : 'este evento'}.</p>

      {youtube && (
        <div className="reproductor-video">
          <iframe
            src={youtube}
            title={`Video de ${evento.nombre}`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}

      {spotify && (
        <iframe
          className="reproductor-spotify"
          src={spotify}
          title={`Música de ${evento.nombre} en Spotify`}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      )}
    </section>
  );
};

export default Reproductor;
