import type { Evento } from "../types";

// ruta en Google Maps desde donde esta el usuario hasta el evento.
// Con "dir" Google Maps abre directo el camino (en el celular, en la app de Maps);
// si el evento no tiene coordenadas se busca por nombre del lugar
export const enlaceRuta = (evento: Pick<Evento, "latitud" | "longitud" | "lugar" | "direccion">) =>
  Number.isFinite(evento.latitud) && Number.isFinite(evento.longitud)
    ? `https://www.google.com/maps/dir/?api=1&destination=${evento.latitud},${evento.longitud}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${evento.lugar}, ${evento.direccion ?? ""} Oaxaca de Juarez`
      )}`;
