import { db } from "../../js/firebase-config.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const reorderTableBody = document.getElementById("reorderTableBody");

let suppliers = [];

// Load suppliers
async function loadSuppliers() {
  const supplierSnapshot = await getDocs(collection(db, "suppliers"));

  suppliers = supplierSnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

// Find matching supplier by company name
function findSupplier(stockSupplierName) {
  return suppliers.find(
    (supplier) =>
      supplier.companyName?.toLowerCase().trim() ===
      stockSupplierName?.toLowerCase().trim()
  );
}

// Create email link
function createEmailLink(stockItem, supplier) {
  const subject = `Purchase Request - ${stockItem.name}`;

  const suggestedOrder =
    Number(stockItem.reorderLevel || 0) * 2 -
    Number(stockItem.qtyOnHand || 0);

  const body = `
Dear ${supplier.companyName},

We would like to request a restock for the following item:

Item: ${stockItem.name}
Current Stock: ${stockItem.qtyOnHand} ${stockItem.unit}
Reorder Level: ${stockItem.reorderLevel} ${stockItem.unit}
Suggested Order Quantity: ${suggestedOrder} ${stockItem.unit}

Please confirm availability and delivery details.

Thank you,
Sahana Urban Restaurant
  `;

  return `mailto:${supplier.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Load low stock items
async function loadLowStockItems() {
  reorderTableBody.innerHTML = `
    <tr>
      <td colspan="7">Loading reorder requests...</td>
    </tr>
  `;

  try {
    await loadSuppliers();

    const stockSnapshot = await getDocs(collection(db, "stock_items"));

    const stockItems = stockSnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    const lowStockItems = stockItems.filter((item) => {
      return Number(item.qtyOnHand) <= Number(item.reorderLevel);
    });

    if (lowStockItems.length === 0) {
      reorderTableBody.innerHTML = `
        <tr>
          <td colspan="7">No low stock items found.</td>
        </tr>
      `;
      return;
    }

    reorderTableBody.innerHTML = "";

    lowStockItems.forEach((item) => {
      const supplier = findSupplier(item.supplier);

      const suggestedOrder =
        Number(item.reorderLevel || 0) * 2 -
        Number(item.qtyOnHand || 0);

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>
          <strong>${item.name || "-"}</strong><br>
          <small>${item.category || ""}</small>
        </td>

        <td>${item.qtyOnHand || 0} ${item.unit || ""}</td>

        <td>${item.reorderLevel || 0} ${item.unit || ""}</td>

        <td>${suggestedOrder} ${item.unit || ""}</td>

        <td>${supplier ? supplier.companyName : item.supplier || "Not matched"}</td>

        <td>${supplier ? supplier.email : "No email found"}</td>

        <td>
          ${
            supplier && supplier.email
              ? `<a class="send-email-btn" href="${createEmailLink(item, supplier)}">
                   <i class="fa-solid fa-envelope"></i>
                   Send Email
                 </a>`
              : `<button class="disabled-email-btn" disabled>No Supplier Email</button>`
          }
        </td>
      `;

      reorderTableBody.appendChild(row);
    });

  } catch (error) {
    console.error("Error loading reorder requests:", error);

    reorderTableBody.innerHTML = `
      <tr>
        <td colspan="7">Failed to load reorder requests.</td>
      </tr>
    `;
  }
}

loadLowStockItems();