import { db } from "../../js/firebase-config.js";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const supplierTableBody = document.getElementById("supplierTableBody");
const supplierSearchInput = document.getElementById("supplierSearchInput");
const statusFilter = document.getElementById("statusFilter");
const sortFilter = document.getElementById("sortFilter");
const exportReportBtn = document.getElementById("exportReportBtn");
const clearFiltersBtn = document.getElementById("clearFiltersBtn"); // NEW

const totalSuppliersCount = document.getElementById("totalSuppliersCount");
const activeSuppliersCount = document.getElementById("activeSuppliersCount");
const inactiveSuppliersCount = document.getElementById("inactiveSuppliersCount");

const supplierToast = document.getElementById("supplierToast");

let allSuppliers = [];

// ================= TOAST =================
function showToast(message, type = "success") {
  if (!supplierToast) return;

  supplierToast.textContent = message;
  supplierToast.className = "supplier-toast show";

  if (type === "error") {
    supplierToast.classList.add("error");
  }

  setTimeout(() => {
    supplierToast.classList.remove("show");
    supplierToast.classList.remove("error");
  }, 2500);
}

// ================= DATE PARSER =================
function parseJoinedDate(dateString) {
  if (!dateString) return new Date(0);

  const parsed = new Date(dateString);
  if (!isNaN(parsed)) return parsed;

  return new Date(0);
}

// ================= SUMMARY CARDS =================
function updateSummaryCards(suppliers) {
  const total = suppliers.length;
  const active = suppliers.filter(
    (s) => (s.status || "Active") === "Active"
  ).length;

  const inactive = suppliers.filter(
    (s) => (s.status || "Active") === "Inactive"
  ).length;

  if (totalSuppliersCount) totalSuppliersCount.textContent = total;
  if (activeSuppliersCount) activeSuppliersCount.textContent = active;
  if (inactiveSuppliersCount) inactiveSuppliersCount.textContent = inactive;
}

// ================= FILTER + SEARCH + SORT =================
function getProcessedSuppliers() {
  let filteredSuppliers = [...allSuppliers];

  const searchValue =
    supplierSearchInput?.value.trim().toLowerCase() || "";

  const selectedStatus =
    statusFilter?.value || "All";

  const selectedSort =
    sortFilter?.value || "Newest";

  // Search
  if (searchValue) {
    filteredSuppliers = filteredSuppliers.filter((supplier) => {
      const searchableText = `
        ${supplier.companyName || ""}
        ${supplier.contactPersonName || ""}
        ${supplier.email || ""}
        ${supplier.phone || ""}
        ${supplier.itemSupplied || ""}
        ${supplier.address || ""}
        ${supplier.status || ""}
      `.toLowerCase();

      return searchableText.includes(searchValue);
    });
  }

  // Filter by status
  if (selectedStatus !== "All") {
    filteredSuppliers = filteredSuppliers.filter(
      (supplier) =>
        (supplier.status || "Active") === selectedStatus
    );
  }

  // Sort
  if (selectedSort === "Newest") {
    filteredSuppliers.sort(
      (a, b) =>
        parseJoinedDate(b.joined) -
        parseJoinedDate(a.joined)
    );
  } else if (selectedSort === "Oldest") {
    filteredSuppliers.sort(
      (a, b) =>
        parseJoinedDate(a.joined) -
        parseJoinedDate(b.joined)
    );
  } else if (selectedSort === "AZ") {
    filteredSuppliers.sort((a, b) =>
      (a.companyName || "").localeCompare(
        b.companyName || ""
      )
    );
  }

  return filteredSuppliers;
}

// ================= EXPORT CSV =================
function exportSuppliersToCSV() {
  if (!allSuppliers.length) {
    showToast("No supplier data to export.", "error");
    return;
  }

  const headers = [
    "Company Name",
    "Contact Person",
    "Email",
    "Phone",
    "Items Supplied",
    "Address",
    "Status",
    "Joined",
    "Notes"
  ];

  const rows = allSuppliers.map((supplier) => [
    supplier.companyName || "",
    supplier.contactPersonName || "",
    supplier.email || "",
    supplier.phone || "",
    supplier.itemSupplied || "",
    supplier.address || "",
    supplier.status || "",
    supplier.joined || "",
    supplier.notes || ""
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((value) =>
          `"${String(value).replace(/"/g, '""')}"`
        )
        .join(",")
    )
  ].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "suppliers_report.csv";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);

  showToast("Supplier report exported successfully!");
}

// ================= RENDER TABLE =================
function renderSuppliers() {
  supplierTableBody.innerHTML = "";

  const processedSuppliers = getProcessedSuppliers();

  updateSummaryCards(allSuppliers);

  if (processedSuppliers.length === 0) {
    supplierTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-row">
          No suppliers found.
        </td>
      </tr>
    `;
    return;
  }

  let count = 1;

  processedSuppliers.forEach((supplier) => {
    const currentStatus =
      supplier.status || "Active";

    const isActive =
      currentStatus === "Active";

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${String(count).padStart(3, "0")}</td>
      <td>${supplier.companyName || ""}</td>
      <td>${supplier.contactPersonName || ""}</td>
      <td>${supplier.email || ""}</td>
      <td>${supplier.phone || ""}</td>
      <td>${supplier.joined || supplier.createdAt || ""}</td>

      <td>
        <div class="status-toggle-wrapper">
          <span class="status-text ${
            isActive ? "active-text" : "inactive-text"
          }">
            <span class="status-dot"></span>
            ${currentStatus}
          </span>

          <button 
            class="status-toggle ${
              isActive ? "active" : "inactive"
            }"
            data-id="${supplier.id}"
            data-status="${currentStatus}"
          >
            <span class="toggle-ball"></span>
          </button>
        </div>
      </td>

      <td>
        <div class="action-buttons">

          <button class="icon-btn view-btn" data-id="${supplier.id}">
            <i class="fa-solid fa-eye"></i>
          </button>

          <button class="icon-btn edit-btn" data-id="${supplier.id}">
            <i class="fa-solid fa-pen"></i>
          </button>

          <button class="icon-btn delete" data-id="${supplier.id}">
            <i class="fa-solid fa-trash"></i>
          </button>

        </div>
      </td>
    `;

    supplierTableBody.appendChild(row);
    count++;
  });

  attachActionEvents();
}

// ================= ACTION EVENTS =================
function attachActionEvents() {
  const deleteButtons =
    document.querySelectorAll(".delete");

  deleteButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const id =
        button.getAttribute("data-id");

      const confirmDelete = confirm(
        "Are you sure you want to delete this supplier?"
      );

      if (!confirmDelete) return;

      try {
        await deleteDoc(doc(db, "suppliers", id));
        showToast("Supplier deleted successfully!");
        await loadSuppliers();
      } catch (error) {
        console.error(error);
        showToast("Failed to delete supplier.", "error");
      }
    });
  });

  const toggleButtons =
    document.querySelectorAll(".status-toggle");

  toggleButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const id =
        button.getAttribute("data-id");

      const currentStatus =
        button.getAttribute("data-status");

      const newStatus =
        currentStatus === "Active"
          ? "Inactive"
          : "Active";

      try {
        await updateDoc(doc(db, "suppliers", id), {
          status: newStatus
        });

        showToast(
          `Supplier status changed to ${newStatus}.`
        );

        await loadSuppliers();
      } catch (error) {
        console.error(error);
        showToast(
          "Failed to update supplier status.",
          "error"
        );
      }
    });
  });

  const editButtons =
    document.querySelectorAll(".edit-btn");

  editButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const id =
        button.getAttribute("data-id");

      window.location.href =
        `edit-supplier.html?id=${id}`;
    });
  });

  const viewButtons =
    document.querySelectorAll(".view-btn");

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const id =
        button.getAttribute("data-id");

      window.location.href =
        `view-supplier.html?id=${id}`;
    });
  });
}

// ================= LOAD FROM FIREBASE =================
async function loadSuppliers() {
  supplierTableBody.innerHTML = `
    <tr>
      <td colspan="8" class="empty-row">
        Loading suppliers...
      </td>
    </tr>
  `;

  try {
    const querySnapshot = await getDocs(
      collection(db, "suppliers")
    );

    allSuppliers = querySnapshot.docs.map(
      (docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      })
    );

    renderSuppliers();
  } catch (error) {
    console.error(error);

    supplierTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-row">
          Failed to load supplier data.
        </td>
      </tr>
    `;

    showToast(
      "Failed to load supplier data.",
      "error"
    );
  }
}

// ================= CONTROL EVENTS =================
if (supplierSearchInput) {
  supplierSearchInput.addEventListener(
    "input",
    renderSuppliers
  );
}

if (statusFilter) {
  statusFilter.addEventListener(
    "change",
    renderSuppliers
  );
}

if (sortFilter) {
  sortFilter.addEventListener(
    "change",
    renderSuppliers
  );
}

if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener("click", () => {
    supplierSearchInput.value = "";
    statusFilter.value = "All";
    sortFilter.value = "Newest";

    renderSuppliers();

    showToast("Filters cleared successfully!");
  });
}

if (exportReportBtn) {
  exportReportBtn.addEventListener("click", () => {
    window.location.href =
      "supplier-report.html";
  });
}

// ================= INIT =================
loadSuppliers();