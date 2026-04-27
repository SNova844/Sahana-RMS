// Delivery Management Page JavaScript

const SAMPLE_DELIVERIES = [
  {
    orderID: '#ORD001',
    customerName: 'Naduni Perera',
    riderName: 'Kavindu Silva',
    phone: '+94 701 234567',
    address: '123 Main St, Colombo',
    status: 'Pending',
    date: '2026-03-24',
    createdDate: '2026-03-23 10:00 AM',
    updatedDate: '2026-03-23 10:00 AM'
  },
  {
    orderID: '#ORD002',
    customerName: 'Kavindu Jayawardena',
    riderName: 'Ashen Silva',
    phone: '+94 702 345678',
    address: '456 Park Ave, Kandy',
    status: 'Assigned',
    date: '2026-03-24',
    createdDate: '2026-03-23 09:30 AM',
    updatedDate: '2026-03-23 09:30 AM'
  },
  {
    orderID: '#ORD003',
    customerName: 'Ashen Wijesooriya',
    riderName: 'Sachith Kumar',
    phone: '+94 703 456789',
    address: '789 Oak Ln, Galle',
    status: 'In Transit',
    date: '2026-03-23',
    createdDate: '2026-03-22 02:00 PM',
    updatedDate: '2026-03-23 08:15 AM'
  }
];

document.addEventListener('DOMContentLoaded', function() {
  initializeDeliveryPage();
});

function initializeDeliveryPage() {
  // Load sample data on first visit
  initializeSampleData();

  // Load and display deliveries
  loadDeliveries();

  // Initialize search functionality
  const searchBox = document.querySelector('.search-box input');
  if (searchBox) {
    searchBox.addEventListener('input', handleSearch);
  }

  // Initialize menu toggle for mobile
  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', toggleSidebar);
  }
}

function initializeSampleData() {
  const existingData = localStorage.getItem('deliveries');
  if (!existingData) {
    localStorage.setItem('deliveries', JSON.stringify(SAMPLE_DELIVERIES));
  }
}

function loadDeliveries() {
  const deliveries = JSON.parse(localStorage.getItem('deliveries')) || [];
  const tableBody = document.getElementById('deliveryTableBody');
  
  if (!tableBody) return;

  tableBody.innerHTML = '';

  if (deliveries.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #999;">
          <i class="fa-solid fa-inbox" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
          No deliveries found. <a href="add-delivery.html" style="color: #a71d31;">Add a new delivery</a>
        </td>
      </tr>
    `;
    return;
  }

  deliveries.forEach((delivery, index) => {
    const row = document.createElement('tr');
    const statusClass = delivery.status.toLowerCase().replace(' ', '-');

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${delivery.orderID}</td>
      <td>${delivery.customerName}</td>
      <td>${delivery.riderName}</td>
      <td>${delivery.address}</td>
      <td>${delivery.phone}</td>
      <td><span class="status ${statusClass}">${delivery.status}</span></td>
      <td>
        <a href="edit-delivery.html?id=${delivery.orderID}" class="action-btn edit-btn" title="Edit">
          <i class="fa-solid fa-edit"></i>
        </a>
        <button class="action-btn delete-btn" title="Delete" onclick="handleQuickDelete('${delivery.orderID}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

function handleQuickDelete(orderId) {
  const deliveries = JSON.parse(localStorage.getItem('deliveries')) || [];
  const delivery = deliveries.find(d => d.orderID === orderId);

  if (delivery) {
    const confirmed = confirm(`Are you sure you want to delete delivery for ${delivery.customerName} (${orderId})? This action cannot be undone.`);
    if (confirmed) {
      deleteDeliveryFromStorage(orderId);
      loadDeliveries();
      showNotification(`Delivery ${orderId} deleted successfully!`, 'success');
    }
  }
}

function deleteDeliveryFromStorage(orderId) {
  let deliveries = JSON.parse(localStorage.getItem('deliveries')) || [];
  deliveries = deliveries.filter(d => d.orderID !== orderId);
  localStorage.setItem('deliveries', JSON.stringify(deliveries));
}

// Search Functionality
function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase();
  const tableRows = document.querySelectorAll('.delivery-table tbody tr');

  tableRows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? '' : 'none';
  });
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('active');
  }
}

// Filter deliveries by status
function filterByStatus(status) {
  const tableRows = document.querySelectorAll('.delivery-table tbody tr');

  tableRows.forEach(row => {
    const rowStatus = row.querySelector('.status').textContent.trim().toLowerCase();
    const statusMatch = status === 'all' || rowStatus === status.toLowerCase();
    row.style.display = statusMatch ? '' : 'none';
  });
}

// Export delivery data 
function exportDeliveries() {
  const deliveries = JSON.parse(localStorage.getItem('deliveries')) || [];
  
  if (deliveries.length === 0) {
    showNotification('No deliveries to export', 'info');
    return;
  }

  // Create CSV content
  const headers = ['Order ID', 'Customer', 'Rider', 'Phone', 'Address', 'Status', 'Date'];
  const csvContent = [
    headers.join(','),
    ...deliveries.map(d => [
      d.orderID,
      d.customerName,
      d.riderName,
      d.phone,
      d.address,
      d.status,
      d.date
    ].map(field => `"${field}"`).join(','))
  ].join('\n');

  // Download CSV
  const link = document.createElement('a');
  link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
  link.download = `deliveries_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();

  showNotification('Deliveries exported successfully!', 'success');
}

// Print delivery list
function printDeliveries() {
  window.print();
}

// Notification Function
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

// Notification Function
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fa-solid fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
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

// Search Functionality
function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase();
  const tableRows = document.querySelectorAll('.delivery-table tbody tr');

  tableRows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? '' : 'none';
  });
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('active');
  }
}

// Filter deliveries by status
function filterByStatus(status) {
  const tableRows = document.querySelectorAll('.delivery-table tbody tr');

  tableRows.forEach(row => {
    const rowStatus = row.querySelector('.status').textContent.trim().toLowerCase();
    const statusMatch = status === 'all' || rowStatus === status.toLowerCase();
    row.style.display = statusMatch ? '' : 'none';
  });
}

// Export delivery data (placeholder)
function exportDeliveries() {
  console.log('Export deliveries functionality');
  alert('Export functionality - to be implemented');
}

// Print delivery list (placeholder)
function printDeliveries() {
  window.print();
}

function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase();
  const tableRows = document.querySelectorAll('.delivery-table tbody tr');

  tableRows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? '' : 'none';
  });
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('active');
  }
}

// Filter deliveries by status
function filterByStatus(status) {
  const tableRows = document.querySelectorAll('.delivery-table tbody tr');

  tableRows.forEach(row => {
    const rowStatus = row.querySelector('.status').textContent.trim().toLowerCase();
    const statusMatch = status === 'all' || rowStatus === status.toLowerCase();
    row.style.display = statusMatch ? '' : 'none';
  });
}

// Export delivery data (placeholder)
function exportDeliveries() {
  console.log('Export deliveries functionality');
  alert('Export functionality - to be implemented');
}

// Print delivery list (placeholder)
function printDeliveries() {
  window.print();
}
