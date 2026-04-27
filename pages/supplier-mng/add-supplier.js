import { db } from "../../js/firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const supplierForm = document.getElementById("supplierForm");

// Format Date
function formatDateTime() {
  const now = new Date();
  return now.toLocaleString();
}

// Email validation
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Phone validation: only numbers, exactly 10 digits
function isValidPhone(phone) {
  return /^[0-9]{10}$/.test(phone);
}

// Check duplicate company name
async function isDuplicateCompany(companyName) {
  const q = query(
    collection(db, "suppliers"),
    where("companyName", "==", companyName)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// Check duplicate email
async function isDuplicateEmail(email) {
  const q = query(
    collection(db, "suppliers"),
    where("email", "==", email)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

supplierForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const companyName = document.getElementById("companyName").value.trim();
  const contactPersonName = document.getElementById("contactPersonName").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const phone = document.getElementById("phone").value.trim();
  const itemSupplied = document.getElementById("itemSupplied").value.trim();
  const address = document.getElementById("address").value.trim();
  const notes = document.getElementById("notes").value.trim();

  // Required field validations
  if (!companyName) {
    alert("Company name is required.");
    return;
  }

  if (!contactPersonName) {
    alert("Contact person name is required.");
    return;
  }

  if (!email) {
    alert("Email is required.");
    return;
  }

  if (!phone) {
    alert("Phone number is required.");
    return;
  }

  if (!itemSupplied) {
    alert("Item supplied is required.");
    return;
  }

  if (!address) {
    alert("Address is required.");
    return;
  }

  // Email format validation
  if (!isValidEmail(email)) {
    alert("Please enter a valid email address. Example: name@gmail.com");
    return;
  }

  // Phone validation
  if (!isValidPhone(phone)) {
    alert("Phone number must contain only numbers and must be exactly 10 digits.");
    return;
  }

  try {
    // Duplicate validations
    if (await isDuplicateCompany(companyName)) {
      alert("This company name already exists.");
      return;
    }

    if (await isDuplicateEmail(email)) {
      alert("This email address is already used by another supplier.");
      return;
    }

    await addDoc(collection(db, "suppliers"), {
      companyName,
      contactPersonName,
      email,
      phone,
      itemSupplied,
      address,
      notes,
      status: "Active",
      joined: formatDateTime()
    });

    alert("Supplier saved successfully!");
    supplierForm.reset();
    window.location.href = "supplier.html";

  } catch (error) {
    console.error("Error adding supplier:", error);
    alert("Failed to save supplier.");
  }
});