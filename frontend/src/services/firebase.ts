import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCMwib5uWibmec000N5HOSTomnwWMAssjo",
  authDomain: "cultgo.firebaseapp.com",
  projectId: "cultgo",
  storageBucket: "cultgo.firebasestorage.app",
  messagingSenderId: "635309301187",
  appId: "1:635309301187:web:ac341598892e8f39083176"
};

const app = initializeApp(firebaseConfig);

// esto es lo que vamos a usar para manejar el login/logout
export const auth = getAuth(app);

// proveedor para que la gente inicie sesion con su cuenta de Google
export const googleProvider = new GoogleAuthProvider();

// abre la ventana de Google para iniciar sesión
export const loginConGoogle = () => signInWithPopup(auth, googleProvider);

// cierra la sesión actual
export const cerrarSesion = () => signOut(auth);

// crea una cuenta nueva con correo y contraseña, y le asigna un nombre
export const registrarConCorreo = async (
  correo: string,
  contrasena: string,
  nombre: string
) => {
  const credencial = await createUserWithEmailAndPassword(auth, correo, contrasena);
  await updateProfile(credencial.user, { displayName: nombre });
  return credencial;
};

// inicia sesión con una cuenta ya existente
export const loginConCorreo = (correo: string, contrasena: string) =>
  signInWithEmailAndPassword(auth, correo, contrasena);