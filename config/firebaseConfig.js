import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA2l7LBuJEk6AdQllkARm-foP34VREdFjk",
  authDomain: "lami-82e90.firebaseapp.com",
  projectId: "lami-82e90",
  storageBucket: "lami-82e90.firebasestorage.app",
  messagingSenderId: "206325254337",
  appId: "1:206325254337:web:3bed6d8f5e05bcf52eac40"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta las instancias que necesitan registro.js y login.js
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;