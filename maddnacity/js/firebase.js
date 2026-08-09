// Configuración e Inicialización de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxlmzjYjOEAwc_DVtFpt9DnN7XnuRkbKw",
  authDomain: "silenos-fc5e5.firebaseapp.com",
  databaseURL: "https://silenos-fc5e5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "silenos-fc5e5",
  storageBucket: "silenos-fc5e5.firebasestorage.app",
  messagingSenderId: "314671855826",
  appId: "1:314671855826:web:ea0af5cd962baa1fd6150b",
  measurementId: "G-V636CRYZ8X"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);