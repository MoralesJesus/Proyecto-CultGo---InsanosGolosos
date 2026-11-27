import { useContext } from "react";
import { AuthContext } from "./authContexto";

export const useAuth = () => useContext(AuthContext);
