import { db } from "../../js/firebase-config.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const latestOrderId = localStorage.getItem("latestOrderId");
const trackingDetails = document.getElementById("trackingDetails");
const cancelOrderBtn = document.getElementById("cancelOrderBtn");
const printReceiptBtn = document.getElementById("printReceiptBtn");

let currentOrder = null;

function normalizeStatus(status) {
  if (!status) return "Pending";

  const value = status.toLowerCase();

  if (value === "pending") return "Pending";
  if (value === "confirmed") return "Confirmed";
  if (value === "in progress" || value === "in-progress") return "In Progress";
  if (value === "completed" || value === "complete") return "Completed";
  if (value === "cancelled" || value === "canceled") return "Cancelled";

  return status;
}

function loadOrderTracking() {
  if (!latestOrderId) {
    trackingDetails.innerHTML = `
      <p>No recent order found.</p>
      <a href="menu.html" class="red-btn">Order Now</a>
    `;
    return;
  }

  const q = query(
    collection(db, "orders"),
    where("orderId", "==", latestOrderId)
  );

  onSnapshot(q, (querySnapshot) => {
    if (querySnapshot.empty) {
      trackingDetails.innerHTML = `<p>Order not found.</p>`;
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const order = docSnap.data();
      const status = normalizeStatus(order.status);

      currentOrder = {
        ...order,
        status
      };

      trackingDetails.innerHTML = `
        <div class="tracking-info">
          <p><strong>Order ID:</strong> ${order.orderId}</p>
          <p><strong>Customer:</strong> ${order.customer}</p>
          <p><strong>Order Type:</strong> ${order.orderType}</p>
          <p><strong>Payment:</strong> ${order.paymentMethod}</p>
          <p><strong>Total:</strong> Rs. ${order.amount}</p>
          <p><strong>Status:</strong> ${status}</p>
        </div>
      `;

      updateTrackingSteps(status);
    });
  });
}

function updateTrackingSteps(status) {
  const stepPending = document.getElementById("stepPending");
  const stepConfirmed = document.getElementById("stepConfirmed");
  const stepInProgress = document.getElementById("stepInProgress");
  const stepCompleted = document.getElementById("stepCompleted");

  const steps = [stepPending, stepConfirmed, stepInProgress, stepCompleted];

  steps.forEach(step => step.classList.remove("active-step"));

  if (status === "Pending") stepPending.classList.add("active-step");

  if (status === "Confirmed") {
    stepPending.classList.add("active-step");
    stepConfirmed.classList.add("active-step");
  }

  if (status === "In Progress") {
    stepPending.classList.add("active-step");
    stepConfirmed.classList.add("active-step");
    stepInProgress.classList.add("active-step");
  }

  if (status === "Completed") {
    steps.forEach(step => step.classList.add("active-step"));
  }
}

/* PRINT RECEIPT */

printReceiptBtn.addEventListener("click", () => {
  if (!currentOrder) {
    alert("No order details found.");
    return;
  }

  const itemsHtml = (currentOrder.items || []).map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>Rs. ${item.price}</td>
      <td>Rs. ${item.price * item.quantity}</td>
    </tr>
  `).join("");

  const logoPath = new URL("../../images/logo.png", window.location.href).href;

  const receiptHtml = `
    <div class="receipt-print-area">
      <div class="receipt-header">
        <img src="${logoPath}" alt="Sahana Urban Logo">
        <h1>Sahana Urban</h1>
        <h2>Order Receipt</h2>
      </div>

      <div class="receipt-info-grid">
        <p><strong>Order ID:</strong> ${currentOrder.orderId}</p>
        <p><strong>Date:</strong> ${new Date(currentOrder.createdAt).toLocaleString()}</p>
        <p><strong>Customer:</strong> ${currentOrder.customer}</p>
        <p><strong>Phone:</strong> ${currentOrder.phone || "N/A"}</p>
        <p><strong>Order Type:</strong> ${currentOrder.orderType}</p>
        <p><strong>Payment:</strong> ${currentOrder.paymentMethod}</p>
        <p><strong>Status:</strong> ${currentOrder.status}</p>
        <p><strong>Amount:</strong> Rs. ${currentOrder.amount}</p>
      </div>

      <table class="receipt-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="receipt-total">
        Total: Rs. ${currentOrder.amount}
      </div>

      <p class="receipt-thanks">
        Thank you for ordering from Sahana Urban.
      </p>
    </div>
  `;

  const printFrame = document.createElement("iframe");
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";

  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentWindow.document;

  frameDoc.open();
  frameDoc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt</title>
      <style>
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 30px;
          font-family: Arial, sans-serif;
          background: white;
          color: #111;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .receipt-print-area {
          width: 760px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border: 1px solid #ddd;
          border-radius: 14px;
        }

        .receipt-header {
          text-align: center;
          border-bottom: 2px solid #ed1c24;
          padding-bottom: 18px;
          margin-bottom: 25px;
        }

        .receipt-header img {
          width: 110px;
          height: auto;
          margin-bottom: 10px;
        }

        .receipt-header h1 {
          margin: 0;
          color: #ed1c24;
          font-size: 34px;
        }

        .receipt-header h2 {
          margin: 8px 0 0;
          color: #111;
          font-size: 22px;
        }

        .receipt-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 30px;
          margin-bottom: 25px;
          font-size: 15px;
        }

        .receipt-info-grid p {
          margin: 5px 0;
        }

        .receipt-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 18px;
        }

        .receipt-table th {
          background: #ed1c24;
          color: white;
          padding: 12px;
          text-align: left;
          font-size: 15px;
        }

        .receipt-table td {
          border: 1px solid #ddd;
          padding: 12px;
          font-size: 15px;
        }

        .receipt-total {
          text-align: right;
          font-size: 24px;
          font-weight: bold;
          margin-top: 25px;
          color: #111;
        }

        .receipt-thanks {
          text-align: center;
          color: #555;
          margin-top: 30px;
          font-size: 15px;
        }

        @page {
          size: A4;
          margin: 15mm;
        }
      </style>
    </head>
    <body>
      ${receiptHtml}
    </body>
    </html>
  `);
  frameDoc.close();

  printFrame.onload = function () {
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();

    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
  };
});

/* CANCEL ORDER */
cancelOrderBtn.addEventListener("click", async () => {
  const latestOrderId = localStorage.getItem("latestOrderId");

  if (!latestOrderId) {
    alert("No order found.");
    return;
  }

  const confirmCancel = confirm("Are you sure you want to cancel this order?");
  if (!confirmCancel) return;

  try {
    const q = query(
      collection(db, "orders"),
      where("orderId", "==", latestOrderId)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      alert("Order not found in database.");
      return;
    }

    let deleted = false;

    for (const documentItem of querySnapshot.docs) {
      const orderData = documentItem.data();
      const status = orderData.status?.toLowerCase();

      if (status !== "pending") {
        alert("Order cannot be cancelled after confirmation.");
        return;
      }

      await deleteDoc(doc(db, "orders", documentItem.id));
      deleted = true;
    }

    if (deleted) {
      localStorage.removeItem("latestOrderId");
      alert("Order cancelled successfully!");
      window.location.href = "menu.html";
    }

  } catch (error) {
    console.error("Cancel order error:", error);
    alert("Failed to cancel order.");
  }
});

loadOrderTracking();