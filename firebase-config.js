// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAIec0Y5kNM-DwUy71Ou-4s667PqC8ZA9c",
  authDomain: "thaddeusxdei.firebaseapp.com",
  projectId: "thaddeusxdei",
  storageBucket: "thaddeusxdei.firebasestorage.app",
  messagingSenderId: "961547120951",
  appId: "1:961547120951:web:2847d9fa13b9f58ab8eab2",
  measurementId: "G-2KW4VESYMV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
