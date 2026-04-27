import { db } from "../../js/firebase-config.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const supplierId = params.get("id");

function getInitial(name) {
  if (!name) return "S";
  return name.trim().charAt(0).toUpperCase();
}

async function loadSupplierDetails() {
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

    const companyName = supplier.companyName || "-";
    const contactPerson = supplier.contactPersonName || "-";
    const email = supplier.email || "-";
    const phone = supplier.phone || "-";
    const items = supplier.itemSupplied || "-";
    const joined = supplier.joined || "-";
    const status = supplier.status || "-";
    const address = supplier.address || "-";
    const notes = supplier.notes || "-";

    document.getElementById("viewCompanyName").textContent = companyName;
    document.getElementById("viewEmail").textContent = email;
    document.getElementById("viewPhone").textContent = phone;
    document.getElementById("viewJoined").textContent = joined;
    document.getElementById("viewStatus").textContent = status;
    document.getElementById("viewAddress").textContent = address;
    document.getElementById("viewContactPerson").textContent = contactPerson;
    document.getElementById("viewItems").textContent = items;
    document.getElementById("viewNotes").textContent = notes;

    document.getElementById("supplierAvatar").textContent = getInitial(companyName);

    const statusPill = document.getElementById("statusPill");
    if (status === "Inactive") {
      statusPill.classList.add("inactive");
    } else {
      statusPill.classList.remove("inactive");
    }

    document.getElementById("editSupplierBtnTop").href = `edit-supplier.html?id=${supplierId}`;
    document.getElementById("editSupplierBtnBottom").href = `edit-supplier.html?id=${supplierId}`;

  } catch (error) {
    console.error("Error loading supplier details:", error);
    alert("Failed to load supplier details.");
  }
}

loadSupplierDetails();