import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

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