import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDoQiWDUo8MCJicGKyhXRd4O1yeK62LsEw",
  authDomain: "myexpensetracker-48baa.firebaseapp.com",
  projectId: "myexpensetracker-48baa",
//   storageBucket: "myexpensetracker-48baa.firebasestorage.app",
//   messagingSenderId: "752842419087",
  appId: "1:752842419087:web:e423f3427b8818ffe0b9fa",
//   measurementId: "G-HRKTM788JS"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
