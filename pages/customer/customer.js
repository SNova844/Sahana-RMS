// ORDER TYPE SELECTION

function selectOrderType(type) {
  localStorage.setItem("orderType", type);

  window.location.href = "menu.html";
}

// ADD TO CART--------------------------------------------------------------------------------------------------

function addToCart(name, price, image) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  const existingItem = cart.find(item => item.name === name);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      name,
      price,
      image,
      quantity: 1
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  alert(name + " added to cart!");
}

// LOAD MENU ITEMS IN THE PAGE. FETCH DATA FROM FIREBASE--------------------------------------------------------------------
import { db } from "../../js/firebase-config.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

/* ORDER TYPE SELECTION*/
window.selectOrderType = function (type) {
  localStorage.setItem("orderType", type);
  window.location.href = "menu.html";
};

/* CART*/
window.addToCart = function (name, price, image) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  const existingItem = cart.find(item => item.name === name);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      name,
      price,
      image,
      quantity: 1
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  alert(name + " added to cart!");
};

// MENU FETCHING
let allMenuItems = [];

async function loadMenuItems() {
  const menuContainer = document.getElementById("menuItemsContainer");

  if (!menuContainer) return;

  menuContainer.innerHTML = "";

  try {
    const querySnapshot = await getDocs(collection(db, "menuItems"));

    allMenuItems = [];

    querySnapshot.forEach((docSnap) => {
      const food = docSnap.data();

      // Only show available items
      if (food.status === "Available") {
        allMenuItems.push(food);
      }
    });

    renderMenuItems(allMenuItems);

  } catch (error) {
    console.error("Error loading menu items:", error);
  }
}

//  RENDER MENU ITEMS
function renderMenuItems(items) {
  const menuContainer = document.getElementById("menuItemsContainer");

  if (!menuContainer) return;

  menuContainer.innerHTML = "";

  if (items.length === 0) {
    menuContainer.innerHTML = `<p>No food items available.</p>`;
    return;
  }

  items.forEach((food) => {
    const card = `
      <div class="customer-food-card">
        <img src="${food.imageUrl}" alt="${food.name}">

        <div class="customer-food-content">
          <h3>${food.name}</h3>
          <p>${food.description}</p>

          <div class="food-bottom">
            <span>Rs. ${food.price}</span>

            <button onclick="addToCart(
              '${food.name}',
              ${food.price},
              '${food.imageUrl}'
            )">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;

    menuContainer.innerHTML += card;
  });
}

// FILTER MENU
window.filterMenu = function (category) {
  if (category === "All") {
    renderMenuItems(allMenuItems);
    return;
  }

  const filteredItems = allMenuItems.filter(
    item => item.category === category
  );

  renderMenuItems(filteredItems);
};

// INITIAL LOAD
loadMenuItems();



