import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBKc2Lvs49M5xBeHBcLQgpbJE9fb7Fl1DA",
    authDomain: "shareclean-93d48.firebaseapp.com",
    projectId: "shareclean-93d48",
    storageBucket: "shareclean-93d48.firebasestorage.app",
    messagingSenderId: "92248281836",
    appId: "1:92248281836:web:f1355b293e5fa5854c4bc9",
    measurementId: "G-T081PMME69"
  };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);