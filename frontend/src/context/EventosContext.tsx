import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Evento } from "../types";
import { EventosContext } from "./eventosContexto";
import {
  obtenerEventos,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
  restablecerEventos,
} from "../services/eventosService";

export function EventosProvider({ children }: { children: ReactNode }) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerEventos().then((lista) => {
      setEventos(lista);
      setCargando(false);
    });
  }, []);

  const agregar = async (datos: Omit<Evento, "id">) => {
    await crearEvento(datos);
    setEventos(await obtenerEventos());
  };

  const editar = async (evento: Evento) => {
    await actualizarEvento(evento);
    setEventos(await obtenerEventos());
  };

  const borrar = async (id: number) => {
    await eliminarEvento(id);
    setEventos(await obtenerEventos());
  };

  const restablecer = async () => {
    setEventos(await restablecerEventos());
  };

  return (
    <EventosContext.Provider
      value={{ eventos, cargando, agregar, editar, borrar, restablecer }}
    >
      {children}
    </EventosContext.Provider>
  );
}
