import { useContext } from "react";
import { EventosContext } from "./eventosContexto";

export const useEventos = () => useContext(EventosContext);
