// CRUD Operations JavaScript for Delivery Management

document.addEventListener('DOMContentLoaded', function() {
  initializeCRUDPage();
});

function initializeCRUDPage() {
  const currentPage = window.location.pathname.split('/').pop();

  // Initialize based on current page
  switch (currentPage) {
    case 'add-delivery.html':
      initializeAddPage();
      break;
    case 'edit-delivery.html':
      initializeEditPage();
      break;
  }

  // Initialize menu toggle for mobile
  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', toggleSidebar);
  }
}

// ==================== ADD PAGE ====================
function initializeAddPage() {
  const form = document.getElementById('addDeliveryForm');

  if (form) {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    form.addEventListener('submit', handleAddDeliverySubmit);
  }
}

function handleAddDeliverySubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const newDelivery = {
    orderID: formData.get('orderID'),
    customerName: formData.get('customerName'),
    riderName: formData.get('riderName'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    status: formData.get('status'),
    date: formData.get('date')
  };

  // Validate form data
  if (!validateDeliveryData(newDelivery)) {
    showNotification('Please fill in all required fields correctly', 'error');
    return;
  }

  // Store in localStorage (for demo purposes)
  saveDeliveryToStorage(newDelivery);

  // Show success notification
  showNotification(`Delivery for ${newDelivery.customerName} added successfully!`, 'success');

  // Reset form
  event.target.reset();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;

  // Redirect to list after 1.5 seconds
  setTimeout(() => {
    window.location.href = 'delivery.html';
  }, 1500);
}

// ==================== EDIT PAGE ====================
function initializeEditPage() {
  const form = document.getElementById('editDeliveryForm');
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  if (form && orderId) {
    // Load delivery data
    loadDeliveryForEdit(orderId);

    form.addEventListener('submit', function(event) {
      event.preventDefault();
      handleEditDeliverySubmit(orderId);
    });
  }
}

function loadDeliveryForEdit(orderId) {
  // Load from localStorage (for demo purposes)
  const deliveries = JSON.parse(localStorage.getItem('deliveries')) || [];
  const delivery = deliveries.find(d => d.orderID === orderId);

  if (delivery) {
    document.getElementById('orderID').value = delivery.orderID;
    document.getElementById('customerName').value = delivery.customerName;
    document.getElementById('riderName').value = delivery.riderName;
    document.getElementById('phone').value = delivery.phone;
    document.getElementById('address').value = delivery.address;
    document.getElementById('status').value = delivery.status;
    document.getElementById('date').value = delivery.date;
  } else {
    showNotification('Delivery not found', 'error');
    setTimeout(() => {
      window.location.href = 'delivery.html';
    }, 1500);
  }
}

function handleEditDeliverySubmit(orderId) {
  const formData = new FormData(document.getElementById('editDeliveryForm'));
  const updatedDelivery = {
    orderID: formData.get('orderID'),
    customerName: formData.get('customerName'),
    riderName: formData.get('riderName'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    status: formData.get('status'),
    date: formData.get('date')
  };

  // Validate form data
  if (!validateDeliveryData(updatedDelivery)) {
    showNotification('Please fill in all required fields correctly', 'error');
    return;
  }

  // Update in localStorage
  updateDeliveryInStorage(orderId, updatedDelivery);

  // Show success notification
  showNotification('Delivery updated successfully!', 'success');

  // Redirect to list after 1.5 seconds
  setTimeout(() => {
    window.location.href = 'delivery.html';
  }, 1500);
}

// ==================== STORAGE FUNCTIONS ====================
function saveDeliveryToStorage(delivery) {
  let deliveries = JSON.parse(localStorage.getItem('deliveries')) || [];

  const now = new Date().toLocaleString();
  delivery.id = delivery.orderID; // Use orderID as unique ID
  delivery.createdDate = now;
  delivery.updatedDate = now;

  deliveries.push(delivery);
  localStorage.setItem('deliveries', JSON.stringify(deliveries));
}

function updateDeliveryInStorage(orderId, updatedDelivery) {
  let deliveries = JSON.parse(localStorage.getItem('deliveries')) || [];

  const index = deliveries.findIndex(d => d.orderID === orderId);
  if (index !== -1) {
    const now = new Date().toLocaleString();
    deliveries[index] = {
      ...deliveries[index],
      ...updatedDelivery,
      updatedDate: now
    };
    localStorage.setItem('deliveries', JSON.stringify(deliveries));
  }
}

function deleteDeliveryFromStorage(orderId) {
  let deliveries = JSON.parse(localStorage.getItem('deliveries')) || [];
  deliveries = deliveries.filter(d => d.orderID !== orderId);
  localStorage.setItem('deliveries', JSON.stringify(deliveries));
}

// ==================== UTILITY FUNCTIONS ====================
function validateDeliveryData(delivery) {
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
  
  if (!delivery.orderID || !delivery.customerName || !delivery.riderName || 
      !delivery.phone || !delivery.address || !delivery.status || !delivery.date) {
    return false;
  }

  if (!phoneRegex.test(delivery.phone)) {
    return false;
  }

  return true;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fa-solid fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('active');
  }
}
