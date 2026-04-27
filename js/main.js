console.log("main.js loaded");

import { db } from "./firebase-config.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

async function testFirebase() {
  try {
    await addDoc(collection(db, "test"), {
      name: "Nudara",
      message: "Firebase connected successfully!"
    });

    console.log("✅ Firebase Working!");
    alert("Firebase Connected Successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    alert("Firebase Error! Check console.");
  }
}

// testFirebase();