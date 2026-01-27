// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBBX8wZ9vq87MLCPXJd-_7YZnTkBugKdno",
  authDomain: "fortunetorch-38aef.firebaseapp.com",
  projectId: "fortunetorch-38aef",
  storageBucket: "fortunetorch-38aef.firebasestorage.app",
  messagingSenderId: "481802562149",
  appId: "1:481802562149:web:6ab56a001c30cbe2b2348c",
  measurementId: "G-3EF77WXMD3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };
