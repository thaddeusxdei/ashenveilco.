import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAIec0Y5kNM-DwUy71Ou-4s667PqC8ZA9c",
  authDomain: "thaddeusxdei.firebaseapp.com",
  projectId: "thaddeusxdei",
  storageBucket: "thaddeusxdei.firebasestorage.app",
  messagingSenderId: "961547120951",
  appId: "1:961547120951:web:2847d9fa13b9f58ab8eab2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
