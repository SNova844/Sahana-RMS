function loadCart() {
  const cartContainer = document.getElementById("cartItemsContainer");
  const itemCount = document.getElementById("itemCount");
  const cartSubtotal = document.getElementById("cartSubtotal");
  const extraCharge = document.getElementById("extraCharge");
  const chargeLabel = document.getElementById("chargeLabel");
  const cartTotal = document.getElementById("cartTotal");

  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let orderType = localStorage.getItem("orderType") || "Dine-in";

  if (!cartContainer) return;

  cartContainer.innerHTML = "";

  let subtotal = 0;
  let totalItems = 0;

  if (cart.length === 0) {
    cartContainer.innerHTML = `<p class="empty-cart-text">Your cart is empty.</p>`;
    itemCount.textContent = "0";
    cartSubtotal.textContent = "Rs. 0";
    extraCharge.textContent = "Rs. 0";
    cartTotal.textContent = "Rs. 0";
    return;
  }

  cart.forEach((item, index) => {
    const itemSubtotal = item.price * item.quantity;
    subtotal += itemSubtotal;
    totalItems += item.quantity;

    cartContainer.innerHTML += `
      <div class="cart-item-card">
        <div class="cart-product-info">
          <img src="${item.image}" alt="${item.name}">
          <div>
            <h3>${item.name}</h3>
            <button class="remove-text" onclick="removeFromCart(${index})">Remove</button>
          </div>
        </div>

        <div class="cart-price">Rs. ${item.price}</div>

        <div class="quantity-controls">
          <button onclick="updateQuantity(${index}, -1)">-</button>
          <span>${item.quantity}</span>
          <button onclick="updateQuantity(${index}, 1)">+</button>
        </div>

        <div class="cart-subtotal">Rs. ${itemSubtotal}</div>
      </div>
    `;
  });

  let charge = 0;

  if (orderType === "Dine-in") {
    chargeLabel.textContent = "Service Charge";
    charge = 500;
  } else if (orderType === "Takeaway") {
    chargeLabel.textContent = "Takeaway Charge";
    charge = 0;
  } else if (orderType === "Delivery") {
    chargeLabel.textContent = "Delivery Charge";
    charge = 300;
  }

  const finalTotal = subtotal + charge;

  itemCount.textContent = totalItems;
  cartSubtotal.textContent = `Rs. ${subtotal}`;
  extraCharge.textContent = `Rs. ${charge}`;
  cartTotal.textContent = `Rs. ${finalTotal}`;

  localStorage.setItem("cartSubtotal", subtotal);
  localStorage.setItem("extraCharge", charge);
  localStorage.setItem("cartTotal", finalTotal);
}

function updateQuantity(index, change) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  cart[index].quantity += change;

  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  loadCart();
}

function removeFromCart(index) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  cart.splice(index, 1);

  localStorage.setItem("cart", JSON.stringify(cart));
  loadCart();
}

loadCart();