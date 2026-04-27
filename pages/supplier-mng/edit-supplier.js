import { db } from "../../js/firebase-config.js";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const editSupplierForm = document.getElementById("editSupplierForm");

const params = new URLSearchParams(window.location.search);
const supplierId = params.get("id");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[0-9]{10}$/.test(phone);
}

async function isDuplicateCompany(companyName) {
  const q = query(
    collection(db, "suppliers"),
    where("companyName", "==", companyName)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.some(docItem => docItem.id !== supplierId);
}

async function isDuplicateEmail(email) {
  const q = query(
    collection(db, "suppliers"),
    where("email", "==", email)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.some(docItem => docItem.id !== supplierId);
}

async function loadSupplierData() {
  if (!supplierId) {
    alert("Supplier ID not found.");
    window.location.href = "supplier.html";
    return;
  }

  try {
    const supplierRef = doc(db, "suppliers", supplierId);
    const supplierSnap = await getDoc(supplierRef);

    if (!supplierSnap.exists()) {
      alert("Supplier not found.");
      window.location.href = "supplier.html";
      return;
    }

    const supplier = supplierSnap.data();

    document.getElementById("companyName").value = supplier.companyName || "";
    document.getElementById("contactPersonName").value = supplier.contactPersonName || "";
    document.getElementById("email").value = supplier.email || "";
    document.getElementById("phone").value = supplier.phone || "";
    document.getElementById("itemSupplied").value = supplier.itemSupplied || "";
    document.getElementById("address").value = supplier.address || "";
    document.getElementById("notes").value = supplier.notes || "";

  } catch (error) {
    console.error("Error loading supplier:", error);
    alert("Failed to load supplier data.");
  }
}

editSupplierForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!supplierId) return;

  const companyName = document.getElementById("companyName").value.trim();
  const contactPersonName = document.getElementById("contactPersonName").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const phone = document.getElementById("phone").value.trim();
  const itemSupplied = document.getElementById("itemSupplied").value.trim();
  const address = document.getElementById("address").value.trim();
  const notes = document.getElementById("notes").value.trim();

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

  if (!isValidEmail(email)) {
    alert("Please enter a valid email address. Example: name@gmail.com");
    return;
  }

  if (!isValidPhone(phone)) {
    alert("Phone number must contain only numbers and must be exactly 10 digits.");
    return;
  }

  try {
    if (await isDuplicateCompany(companyName)) {
      alert("This company name already exists.");
      return;
    }

    if (await isDuplicateEmail(email)) {
      alert("This email address is already used by another supplier.");
      return;
    }

    await updateDoc(doc(db, "suppliers", supplierId), {
      companyName,
      contactPersonName,
      email,
      phone,
      itemSupplied,
      address,
      notes
    });

    alert("Supplier updated successfully!");
    window.location.href = "supplier.html";

  } catch (error) {
    console.error("Error updating supplier:", error);
    alert("Failed to update supplier.");
  }
});

loadSupplierData();