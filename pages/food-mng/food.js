import { db } from "../../js/firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const foodForm = document.getElementById("foodForm");
const foodTableBody = document.getElementById("foodTableBody");

const totalFood = document.getElementById("totalFood");
const availableFood = document.getElementById("availableFood");
const unavailableFood = document.getElementById("unavailableFood");

const foodModal = document.getElementById("foodModal");

let editingFoodId = null;

/* =========================
   OPEN / CLOSE MODAL
========================= */
window.openFoodModal = function () {
  foodModal.style.display = "flex";
};

window.closeFoodModal = function () {
  foodModal.style.display = "none";
  foodForm.reset();
  editingFoodId = null;
};

/* =========================
   ADD / UPDATE FOOD
========================= */
foodForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("foodName").value.trim();
  const category = document.getElementById("foodCategory").value;
  const price = Number(document.getElementById("foodPrice").value);
  const description = document.getElementById("foodDescription").value.trim();
  const imageUrl = document.getElementById("foodImage").value.trim();
  const status = document.getElementById("foodStatus").value;

  if (!name || !category || !price || !description || !imageUrl) {
    alert("Please fill all fields.");
    return;
  }

  try {
    if (editingFoodId) {
      // UPDATE existing food item
      await updateDoc(doc(db, "menuItems", editingFoodId), {
        name,
        category,
        price,
        description,
        imageUrl,
        status
      });

      alert("Food item updated successfully!");
    } else {
      // Firebase automatically creates the "menuItems" collection
      await addDoc(collection(db, "menuItems"), {
        name,
        category,
        price,
        description,
        imageUrl,
        status,
        createdAt: new Date().toISOString()
      });

      alert("Food item added successfully!");
    }

    closeFoodModal();
    loadFoodItems();

  } catch (error) {
    console.error("Error saving food item:", error);
    alert("Failed to save food item.");
  }
});

/* =========================
   LOAD FOOD ITEMS
========================= */
async function loadFoodItems() {
  foodTableBody.innerHTML = "";

  let total = 0;
  let available = 0;
  let unavailable = 0;

  try {
    const querySnapshot = await getDocs(collection(db, "menuItems"));

    let index = 1;

    querySnapshot.forEach((docSnap) => { 
      const food = docSnap.data();
      const foodId = docSnap.id;

      total++;

      if (food.status === "Available") {
        available++;
      } else {
        unavailable++;
      }

      const row = `
        <tr>
          <td>${index}</td>
          <td>
            <img src="${food.imageUrl}" class="food-img" alt="${food.name}">
          </td>
          <td>${food.name}</td>
          <td>${food.category}</td>
          <td>Rs. ${food.price}</td>
          <td>${food.status}</td>
          <td>
            <div class="action-buttons">
              <button onclick="editFood('${foodId}')">✏️</button>
              <button onclick="deleteFood('${foodId}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;

      foodTableBody.innerHTML += row;
      index++;
    });

    // Update stats
    totalFood.textContent = total;
    availableFood.textContent = available;
    unavailableFood.textContent = unavailable;

  } catch (error) {
    console.error("Error loading food items:", error);
  }
}

/* =========================
   DELETE FOOD
========================= */
window.deleteFood = async function (foodId) {
  const confirmDelete = confirm("Are you sure you want to delete this food item?");

  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "menuItems", foodId));

    alert("Food item deleted successfully!");
    loadFoodItems();

  } catch (error) {
    console.error("Error deleting food item:", error);
    alert("Failed to delete food item.");
  }
};

/* =========================
   EDIT FOOD
========================= */
window.editFood = async function (foodId) {
  try {
    const foodRef = doc(db, "menuItems", foodId);
    const foodSnap = await getDoc(foodRef);

    if (foodSnap.exists()) {
      const food = foodSnap.data();

      document.getElementById("foodName").value = food.name;
      document.getElementById("foodCategory").value = food.category;
      document.getElementById("foodPrice").value = food.price;
      document.getElementById("foodDescription").value = food.description;
      document.getElementById("foodImage").value = food.imageUrl;
      document.getElementById("foodStatus").value = food.status;

      editingFoodId = foodId;

      document.getElementById("modalTitle").textContent = "Edit Food Item";

      openFoodModal();
    }

  } catch (error) {
    console.error("Error fetching food item:", error);
  }
};

/* =========================
   INITIAL LOAD
========================= */
loadFoodItems();