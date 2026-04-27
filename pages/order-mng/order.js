import { db } from "../../js/firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const orderTableBody = document.getElementById("orderTableBody");
const searchInput = document.querySelector(".search-small");
const addOrderBtn = document.querySelector(".add-order-btn");
const backBtn = document.querySelector(".back-btn");
const tabs = document.querySelectorAll(".tab");

// Missing variable declarations for search functionality
const searchBtn = document.querySelector(".search-btn");
const searchClearBtn = document.querySelector(".search-clear-btn");
const searchWrapper = document.querySelector(".search-wrapper");
let searchTimeout;

let orders = [];
let currentFilter = "All";

const tableOptions = ["TD-1", "TD-2", "TD-3", "TD-4", "TD-5", "TD-6", "TD-7", "TD-8", "TD-9", "TD-10"];
const orderTypeOptions = ["Dine in", "Takeaway", "Delivery"];

let itemsByCategory = {};
let itemPrices = {};
let allMenuItems = [];

async function loadMenuItems() {
  try {
    const querySnapshot = await getDocs(collection(db, "menuItems"));
    
    allMenuItems = [];
    itemsByCategory = {};
    itemPrices = {};

    querySnapshot.forEach((docSnap) => {
      const food = docSnap.data();

      // Only include available items
      if (food.status === "Available") {
        allMenuItems.push(food);

        // Build itemsByCategory
        if (!itemsByCategory[food.category]) {
          itemsByCategory[food.category] = [];
        }
        itemsByCategory[food.category].push(food.name);

        // Build itemPrices
        itemPrices[food.name] = food.price;
      }
    });

    console.log("Menu items loaded:", itemsByCategory);
  } catch (error) {
    console.error("Error loading menu items:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadMenuItems();
  await loadOrders();
  initializeEvents();
});

function validateSearchInput(input) {
  // Check if input is empty
  if (input.trim() === "") {
    return { valid: false, message: "Search field cannot be empty." };
  }

  // Check minimum length
  if (input.trim().length < 2) {
    return { valid: false, message: "Search term must be at least 2 characters." };
  }

  // Check maximum length
  if (input.length > 50) {
    return { valid: false, message: "Search term cannot exceed 50 characters." };
  }

  const searchTerm = input.trim();

  // Order ID specific validation
  if (searchTerm.includes("ORD-")) {
    const orderIdPattern = /^ORD-\d{8}-\d{3}$/;
    if (!orderIdPattern.test(searchTerm)) {
      return { 
        valid: false, 
        message: "Invalid Order ID format. Expected: ORD-YYYYMMDD-### (e.g., ORD-20260427-123)" 
      };
    }
  }

  // Table Number specific validation
  if (searchTerm.toUpperCase().includes("TD-")) {
    const tablePattern = /^TD-\d{1,2}$/i;
    if (!tablePattern.test(searchTerm)) {
      return { 
        valid: false, 
        message: "Invalid Table Number format. Expected: TD-# or TD-## (e.g., TD-1, TD-10)" 
      };
    }
  }

  // Price/Amount search validation (for numeric searches starting with numbers)
  if (/^\d+/.test(searchTerm) && !searchTerm.includes("ORD-") && !searchTerm.includes("TD-")) {
    // Check if it's a valid price/number
    const pricePattern = /^\d+(\.\d{1,2})?$/;
    if (!pricePattern.test(searchTerm)) {
      return { 
        valid: false, 
        message: "Invalid amount format. Enter a number (e.g., 500 or 500.50)" 
      };
    }
  }

  // Date search validation (DD/MM/YY format)
  if (searchTerm.includes("/")) {
    const datePattern = /^\d{2}\/\d{2}\/\d{2}$/;
    if (!datePattern.test(searchTerm)) {
      return { 
        valid: false, 
        message: "Invalid date format. Expected: DD/MM/YY (e.g., 27/04/26)" 
      };
    }
  }

  return { valid: true, message: "" };
}

function performSearch() {
  if (!searchInput) return;

  const searchTerm = searchInput.value.trim();
  const validation = validateSearchInput(searchTerm);

  if (!validation.valid) {
    showNotification(validation.message, "error");
    searchInput.focus();
    return;
  }

  if (searchWrapper) searchWrapper.classList.add("active");
  if (searchClearBtn) searchClearBtn.style.display = "inline-flex";
  renderOrders();
}

function clearSearch() {
  if (!searchInput) return;

  searchInput.value = "";
  if (searchWrapper) searchWrapper.classList.remove("active");
  if (searchClearBtn) searchClearBtn.style.display = "none";
  searchInput.focus();
  renderOrders();
  showNotification("Search cleared.", "success");
}

function initializeEvents() {
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.filter;
      renderOrders();
    });
  });

  if (searchInput) {
    // Real-time search with debouncing
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimeout);
      
      const searchTerm = this.value.trim();
      
      // Show/hide clear button
      if (searchTerm) {
        if (searchClearBtn) searchClearBtn.style.display = "inline-flex";
      } else {
        if (searchClearBtn) searchClearBtn.style.display = "none";
        if (searchWrapper) searchWrapper.classList.remove("active");
      }

      // Debounce the search
      searchTimeout = setTimeout(() => {
        if (searchTerm) {
          const validation = validateSearchInput(searchTerm);
          if (validation.valid) {
            if (searchWrapper) searchWrapper.classList.add("active");
            renderOrders();
          }
        } else {
          renderOrders();
        }
      }, 300);
    });

    // Handle Enter key
    searchInput.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        performSearch();
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", performSearch);
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener("click", clearSearch);
  }

  if (addOrderBtn) {
    addOrderBtn.addEventListener("click", () => openOrderModal("add"));
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "../../dashboard.html";
      }
    });
  }

  document.addEventListener("click", async (event) => {
    if (event.target.closest(".actions-toggle")) {
      const wrapper = event.target.closest(".actions");
      document.querySelectorAll(".dropdown").forEach(d => {
        if (d !== wrapper.querySelector(".dropdown")) d.classList.remove("show");
      });
      wrapper.querySelector(".dropdown").classList.toggle("show");
      return;
    }

    if (!event.target.closest(".actions")) {
      document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("show"));
    }

    const dropdownItem = event.target.closest(".dropdown-item");
    if (dropdownItem) {
      const action = dropdownItem.dataset.action;
      const orderId = dropdownItem.dataset.id;
      const order = orders.find(o => o.id === orderId);

      if (!order) return;

      if (action === "view") {
        showOrderDetails(order);
      } else if (action === "edit") {
        openOrderModal("edit", order);
      } else if (action === "delete") {
        const ok = confirm(`Delete order ${order.orderId}?`);
        if (!ok) return;
        await deleteDoc(doc(db, "orders", orderId));
        showNotification("Order deleted successfully!", "success");
        await loadOrders();
      }
    }
  });

  document.addEventListener("change", async (event) => {
    const statusSelect = event.target.closest(".status-select");
    if (statusSelect) {
      const orderId = statusSelect.dataset.id;
      const newStatus = statusSelect.value;
      try {
        await updateDoc(doc(db, "orders", orderId), {
          status: newStatus
        });
        showNotification("Order status updated!", "success");
        await loadOrders();
      } catch (error) {
        console.error("Status update failed:", error);
        showNotification("Failed to update status.", "error");
      }
    }
  });
}

async function loadOrders() {
  try {
    const snapshot = await getDocs(collection(db, "orders"));
    orders = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    renderOrders();
  } catch (error) {
    console.error("Error loading orders:", error);
    orderTableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding:24px;">Failed to load orders.</td>
      </tr>
    `;
  }
}

function renderOrders() {
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

  let filteredOrders = orders.filter(order => {
    const status = (order.status || "").toLowerCase();
    const customer = (order.customer || "").toLowerCase();
    const combinedText = `
      ${order.orderId || ""}
      ${order.tableNo || ""}
      ${order.customer || ""}
      ${order.orderType || ""}
      ${order.itemCategory || ""}
      ${order.specificItem || ""}
      ${order.date || ""}
      ${order.amount || ""}
      ${order.status || ""}
    `.toLowerCase();

    let statusMatch = true;

    if (currentFilter !== "All") {
      switch (currentFilter) {
        case "Pending":
          statusMatch = status === "pending";
          break;
        case "Confirmed":
          statusMatch = status === "confirmed";
          break;
        case "In Progress":
          statusMatch = status === "in-progress";
          break;
        case "Cancelled":
          statusMatch = status === "cancelled";
          break;
        case "Customer":
          statusMatch = customer !== "";
          break;
        default:
          statusMatch = true;
      }
    }

    const searchMatch = searchTerm === "" || combinedText.includes(searchTerm);
    return statusMatch && searchMatch;
  });

  if (filteredOrders.length === 0) {
    let message = "No orders found.";
    
    if (searchTerm) {
      message = `No orders match your search for "<strong>${searchTerm}</strong>". Try adjusting your search criteria or ${`<a href="javascript:void(0)" class="clear-search-link" onclick="clearSearch()">clear search</a>`}.`;
    } else if (currentFilter !== "All") {
      message = `No ${currentFilter.toLowerCase()} orders found.`;
    }
    
    orderTableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding:24px;">${message}</td>
      </tr>
    `;
    return;
  }

  orderTableBody.innerHTML = filteredOrders.map((order, index) => `
    <tr>
      <td>${String(index + 1).padStart(5, "0")}</td>
      <td>${order.orderId || ""}</td>
      <td>${order.tableNo || ""}</td>
      <td>${order.customer || ""}</td>
      <td>${order.orderType || ""}</td>
      <td>${order.date || ""}</td>
      <td>Rs ${order.amount || 0}</td>
      <td>
        <select class="status-select ${getStatusClass(order.status)}" data-id="${order.id}">
          <option value="pending" ${order.status === "pending" ? "selected" : ""}>Pending</option>
          <option value="confirmed" ${order.status === "confirmed" ? "selected" : ""}>Confirmed</option>
          <option value="in-progress" ${order.status === "in-progress" ? "selected" : ""}>In Progress</option>
          <option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
      </td>
      <td class="actions">
        <button class="actions-toggle" type="button">⋮</button>
        <div class="dropdown">
          <div class="dropdown-item" data-action="view" data-id="${order.id}">View</div>
          <div class="dropdown-item" data-action="edit" data-id="${order.id}">Edit</div>
          <div class="dropdown-item" data-action="delete" data-id="${order.id}">Delete</div>
        </div>
      </td>
    </tr>
  `).join("");
}

function getStatusClass(status) {
  switch (status) {
    case "pending":
      return "status-pending";
    case "confirmed":
      return "status-confirmed";
    case "in-progress":
      return "status-in-progress";
    case "cancelled":
      return "status-cancelled";
    default:
      return "status-pending";
  }
}

function formatDateOnly(date = new Date()) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
}

function buildOrderId() {
  const d = new Date();
  return `ORD-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-3)}`;
}

function showOrderDetails(order) {
  const modal = document.createElement("div");
  modal.className = "order-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Order Details - ${order.orderId}</h2>
        <span class="close-modal">&times;</span>
      </div>
      <div class="modal-body">
        <div class="detail-grid">
          <div class="detail-item"><label>Order ID:</label><span>${order.orderId}</span></div>
          <div class="detail-item"><label>Table No:</label><span>${order.tableNo}</span></div>
          <div class="detail-item"><label>Customer:</label><span>${order.customer}</span></div>
          <div class="detail-item"><label>Order Type:</label><span>${order.orderType}</span></div>
          <div class="detail-item"><label>Date:</label><span>${order.date}</span></div>
          <div class="detail-item"><label>Price:</label><span>Rs ${order.amount}</span></div>
          <div class="detail-item"><label>Status:</label><span>${order.status}</span></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = "block";

  modal.querySelector(".close-modal").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

function openOrderModal(mode = "add", order = null) {
  const modal = document.createElement("div");
  modal.className = "order-modal";

  const selectedCategory = order?.itemCategory || "";
  const itemOptions = selectedCategory ? (itemsByCategory[selectedCategory] || []) : [];
  const selectedSpecificItem = order?.specificItem || "";

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${mode === "add" ? "Add New Order" : "Edit Order"}</h2>
        <span class="close-modal">&times;</span>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group">
            <label>Table No</label>
            <select id="new-table">
              ${tableOptions.map(item => `<option value="${item}" ${order?.tableNo === item ? "selected" : ""}>${item}</option>`).join("")}
            </select>
          </div>

          <div class="form-group">
            <label>Customer</label>
            <input type="text" id="new-customer" placeholder="Customer Name" value="${order?.customer || ""}" />
          </div>

          <div class="form-group">
            <label>Item Category</label>
            <select id="new-itemcategory">
              <option value="">Select Category</option>
              ${Object.keys(itemsByCategory).map(cat => `<option value="${cat}" ${selectedCategory === cat ? "selected" : ""}>${cat}</option>`).join("")}
            </select>
          </div>

          <div class="form-group">
            <label>Specific Item</label>
            <select id="new-specificitem" ${!selectedCategory ? "disabled" : ""}>
              <option value="">Select Item</option>
              ${itemOptions.map(item => `<option value="${item}" ${selectedSpecificItem === item ? "selected" : ""}>${item}</option>`).join("")}
            </select>
          </div>

          <div class="form-group">
            <label>Order Type</label>
            <select id="new-ordertype">
              ${orderTypeOptions.map(item => `<option value="${item}" ${order?.orderType === item ? "selected" : ""}>${item}</option>`).join("")}
            </select>
          </div>

          <div class="form-group">
            <label>Price</label>
            <input type="number" id="new-amount" value="${order?.amount || ""}" min="0" step="0.01" placeholder="0.00" />
          </div>

          <div class="form-group">
            <label>Status</label>
            <select id="new-status">
              <option value="pending" ${order?.status === "pending" ? "selected" : ""}>Pending</option>
              <option value="confirmed" ${order?.status === "confirmed" ? "selected" : ""}>Confirmed</option>
              <option value="in-progress" ${order?.status === "in-progress" ? "selected" : ""}>In Progress</option>
              <option value="cancelled" ${order?.status === "cancelled" ? "selected" : ""}>Cancelled</option>
            </select>
          </div>
        </div>

        <div class="modal-actions">
          <button class="add-order-submit">${mode === "add" ? "Add Order" : "Update Order"}</button>
          <button class="cancel-order">Cancel</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = "block";

  const close = () => modal.remove();
  modal.querySelector(".close-modal").addEventListener("click", close);
  modal.querySelector(".cancel-order").addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  const categorySelect = modal.querySelector("#new-itemcategory");
  const specificItemSelect = modal.querySelector("#new-specificitem");
  const amountInput = modal.querySelector("#new-amount");

  categorySelect.addEventListener("change", function () {
    const category = this.value;
    specificItemSelect.innerHTML = '<option value="">Select Item</option>';
    specificItemSelect.disabled = !category;
    amountInput.value = "";

    if (itemsByCategory[category]) {
      itemsByCategory[category].forEach(item => {
        const option = document.createElement("option");
        option.value = item;
        option.textContent = item;
        specificItemSelect.appendChild(option);
      });
    }
  });

  specificItemSelect.addEventListener("change", function () {
    const selectedItem = this.value;
    if (selectedItem && itemPrices[selectedItem]) {
      const price = itemPrices[selectedItem];
      amountInput.value = price;
      amountInput.classList.remove("input-error");
    } else {
      amountInput.value = "";
    }
  });

  amountInput.addEventListener("input", function () {
    const value = parseFloat(this.value);
    if (this.value !== "" && (isNaN(value) || value < 0)) {
      this.classList.add("input-error");
    } else {
      this.classList.remove("input-error");
    }
  });

  amountInput.addEventListener("blur", function () {
    if (this.value !== "") {
      const value = parseFloat(this.value);
      if (value < 0) {
        this.value = "0";
        this.classList.add("input-error");
      } else if (isNaN(value)) {
        this.value = "";
        this.classList.add("input-error");
      }
    }
  });

  modal.querySelector(".add-order-submit").addEventListener("click", async () => {
    const tableNo = modal.querySelector("#new-table").value.trim();
    const customer = modal.querySelector("#new-customer").value.trim();
    const itemCategory = modal.querySelector("#new-itemcategory").value.trim();
    const specificItem = modal.querySelector("#new-specificitem").value.trim();
    const orderType = modal.querySelector("#new-ordertype").value.trim();
    const amount = parseFloat(modal.querySelector("#new-amount").value);
    const status = modal.querySelector("#new-status").value;

    // Validation checks
    if (!tableNo) {
      showNotification("Please select a table number.", "error");
      return;
    }

    if (!customer) {
      showNotification("Please enter customer name.", "error");
      return;
    }

    if (!itemCategory) {
      showNotification("Please select item category.", "error");
      return;
    }

    if (!specificItem) {
      showNotification("Please select a specific item.", "error");
      return;
    }

    if (!orderType) {
      showNotification("Please select order type.", "error");
      return;
    }

    if (isNaN(amount) || amount === "") {
      showNotification("Please enter a valid price.", "error");
      return;
    }

    if (amount < 0) {
      showNotification("Price cannot be negative.", "error");
      return;
    }

    if (amount === 0) {
      showNotification("Price must be greater than 0.", "error");
      return;
    }

    const payload = {
      tableNo,
      customer,
      orderType,
      itemCategory,
      specificItem,
      date: order?.date || formatDateOnly(),
      amount,
      status
    };

    try {
      if (mode === "add") {
        payload.orderId = buildOrderId();
        payload.createdAt = new Date().toISOString();
        await addDoc(collection(db, "orders"), payload);
        showNotification("Order added successfully!", "success");
      } else {
        await updateDoc(doc(db, "orders", order.id), payload);
        showNotification("Order updated successfully!", "success");
      }

      close();
      await loadOrders();
    } catch (error) {
      console.error("Order save failed:", error);
      showNotification("Failed to save order.", "error");
    }
  });
}

function showNotification(message, type = "success") {
  let notification = document.querySelector(".toast-notification");
  if (!notification) {
    notification = document.createElement("div");
    notification.className = "toast-notification";
    document.body.appendChild(notification);
  }

  notification.textContent = message;
  notification.className = `toast-notification ${type} show`;

  setTimeout(() => notification.classList.remove("show"), 2500);
  setTimeout(() => {
    if (notification.parentNode) notification.remove();
  }, 3000);
}