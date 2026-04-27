// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// config
const firebaseConfig = {
  apiKey: "AIzaSyCiF0f8I4S3nnTKK1ZsbfbtG1S5_g9nbRQ",
  authDomain: "sahana-rms.firebaseapp.com",
  projectId: "sahana-rms",
  storageBucket: "sahana-rms.firebasestorage.app",
  messagingSenderId: "26055402359",
  appId: "1:26055402359:web:75fa6e3f7f51cd4468f772"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore DB
const db = getFirestore(app);

// Export it so other files can use it
export { db };