import { db } from "../../js/firebase-config.js";
import {
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// LOAD SUMMARY
function loadCheckoutSummary() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const orderType = localStorage.getItem("orderType") || "Dine-in";

  const items = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = Number(localStorage.getItem("cartSubtotal")) || 0;
  const extraCharge = Number(localStorage.getItem("extraCharge")) || 0;
  const total = Number(localStorage.getItem("cartTotal")) || 0;

  document.getElementById("summaryItems").textContent = items;
  document.getElementById("summarySubtotal").textContent = `Rs. ${subtotal}`;
  document.getElementById("summaryCharge").textContent = `Rs. ${extraCharge}`;
  document.getElementById("summaryTotal").textContent = `Rs. ${total}`;

  const chargeLabel = document.getElementById("summaryChargeLabel");

  if (orderType === "Dine-in") chargeLabel.textContent = "Service Charge";
  if (orderType === "Takeaway") chargeLabel.textContent = "Takeaway Charge";
  if (orderType === "Delivery") chargeLabel.textContent = "Delivery Charge";
}

// DYNAMIC FIELDS
function loadDynamicFields() {
  const orderType = localStorage.getItem("orderType") || "Dine-in";
  const dynamicFields = document.getElementById("dynamicFields");

  if (orderType === "Dine-in") {
    dynamicFields.innerHTML = `
      <div class="form-group">
        <label>Table Number</label>
        <input type="text" id="tableNumber" required>
      </div>
    `;
  }

  if (orderType === "Takeaway") {
    dynamicFields.innerHTML = `
      <div class="form-group">
        <label>Pickup Time</label>
        <input type="time" id="pickupTime">
      </div>
    `;
  }

  if (orderType === "Delivery") {
    dynamicFields.innerHTML = `
      <div class="form-group">
        <label>Delivery Address</label>
        <textarea id="deliveryAddress" required></textarea>
      </div>

      <div class="form-group">
        <label>Area / Distance</label>
        <input type="text" id="deliveryArea" required>
      </div>
    `;
  }
}

// GENERATE ORDER ID
function generateOrderId() {
  const random = Math.floor(Math.random() * 10000);
  return `ORD-${Date.now()}-${random}`;
}

// SUBMIT ORDER
const checkoutForm = document.getElementById("checkoutForm");

checkoutForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const orderType = localStorage.getItem("orderType") || "Dine-in";

  const customerName = document.getElementById("customerName").value.trim();
  const customerPhone = document.getElementById("customerPhone").value.trim();
  const additionalNote = document.getElementById("additionalNote").value.trim();
  const paymentMethod = document.getElementById("paymentMethod").value;

  let tableNumber = "";
  let pickupTime = "";
  let deliveryAddress = "";
  let deliveryArea = "";

  if (document.getElementById("tableNumber")) {
    tableNumber = document.getElementById("tableNumber").value.trim();
  }

  if (document.getElementById("pickupTime")) {
    pickupTime = document.getElementById("pickupTime").value;
  }

  if (document.getElementById("deliveryAddress")) {
    deliveryAddress = document.getElementById("deliveryAddress").value.trim();
  }

  if (document.getElementById("deliveryArea")) {
    deliveryArea = document.getElementById("deliveryArea").value.trim();
  }

  // FRONTEND VALIDATIONS
  if (cart.length === 0) {
    alert("Your cart is empty. Please add items before placing an order.");
    return;
  }

  if (customerName.length < 3) {
    alert("Customer name must be at least 3 characters.");
    return;
  }

  if (!/^\d{10}$/.test(customerPhone)) {
    alert("Phone number must be exactly 10 digits.");
    return;
  }

  if (orderType === "Dine-in" && tableNumber === "") {
    alert("Please enter your table number.");
    return;
  }

  if (orderType === "Delivery" && deliveryAddress === "") {
    alert("Please enter your delivery address.");
    return;
  }

  if (orderType === "Delivery" && deliveryArea === "") {
    alert("Please enter your delivery area or distance.");
    return;
  }

  if (paymentMethod === "") {
    alert("Please select a payment method.");
    return;
  }

  try {
  const newOrderId = generateOrderId();

  const orderData = {
    orderId: newOrderId,
    customer: customerName,
    phone: customerPhone,
    orderType,
    tableNo: tableNumber,
    pickupTime,
    deliveryAddress,
    deliveryArea,
    note: additionalNote,
    paymentMethod,
    items: cart,
    amount: Number(localStorage.getItem("cartTotal")) || 0,
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  // CASH PAYMENT
  if (paymentMethod === "Cash") {
    await addDoc(collection(db, "orders"), orderData);

    localStorage.setItem("latestOrderId", newOrderId);

    alert("Order placed successfully!");

    localStorage.removeItem("cart");
    localStorage.removeItem("cartSubtotal");
    localStorage.removeItem("extraCharge");
    localStorage.removeItem("cartTotal");

    window.location.href = "order-tracking.html";
    return;
  }

    // ONLINE PAYMENT
    localStorage.setItem(
        "pendingOrder",
        JSON.stringify(orderData)
    );

    window.location.href = "payment.html";

    } catch (error) {
    console.error(error);
    alert("Failed to process order.");
    }
});

// INITIAL LOAD
loadCheckoutSummary();
loadDynamicFields();