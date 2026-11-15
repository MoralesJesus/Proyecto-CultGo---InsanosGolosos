import { createContext } from "react";
import type { Evento } from "../types";

export interface EventosContextType {
  eventos: Evento[];
  cargando: boolean;
  // mensaje si no se pudieron cargar los eventos (por ejemplo, backend apagado)
  error: string;
  agregar: (datos: Omit<Evento, "id">) => Promise<void>;
  editar: (evento: Evento) => Promise<void>;
  borrar: (id: number) => Promise<void>;
}

export const EventosContext = createContext<EventosContextType>({
  eventos: [],
  cargando: true,
  error: "",
  agregar: async () => {},
  editar: async () => {},
  borrar: async () => {},
});
