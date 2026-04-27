import { db } from "../../js/firebase-config.js";
import {
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// LOAD PAYMENT TOTAL
function loadPaymentTotal() {
  const total =
    Number(localStorage.getItem("cartTotal")) || 0;

  document.getElementById("paymentTotal").textContent =
    `Rs. ${total}`;
}

//  PAYMENT FORM
const paymentForm = document.getElementById("paymentForm");

paymentForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const cardName =
    document.getElementById("cardName").value.trim();

  const cardNumber =
    document.getElementById("cardNumber").value.trim();

  const expiryDate =
    document.getElementById("expiryDate").value.trim();

  const cvv =
    document.getElementById("cvv").value.trim();

  const pendingOrder =
    JSON.parse(localStorage.getItem("pendingOrder"));

  /* VALIDATIONS */

  if (cardName.length < 3) {
    alert("Cardholder name must be at least 3 characters.");
    return;
  }

  if (!/^\d{16}$/.test(cardNumber)) {
    alert("Card number must be exactly 16 digits.");
    return;
  }

  if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
    alert("Expiry date must be in MM/YY format.");
    return;
  }

  if (!/^\d{3}$/.test(cvv)) {
    alert("CVV must be exactly 3 digits.");
    return;
  }

  if (!pendingOrder) {
    alert("No pending order found.");
    return;
  }

  try {
    await addDoc(collection(db, "orders"), pendingOrder);

    localStorage.setItem(
      "latestOrderId",
      pendingOrder.orderId
    );

    localStorage.removeItem("pendingOrder");
    localStorage.removeItem("cart");
    localStorage.removeItem("cartSubtotal");
    localStorage.removeItem("extraCharge");
    localStorage.removeItem("cartTotal");

    alert("Payment successful! Order placed.");

    window.location.href = "order-tracking.html";

  } catch (error) {
    console.error(error);
    alert("Payment failed.");
  }
});


loadPaymentTotal();