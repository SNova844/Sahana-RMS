// User Management Page JavaScript with Firebase integration

import { getAllUsers, deleteUser, deleteUsers, showNotification, toggleSidebar } from './user-crud-firebase.js';

document.addEventListener('DOMContentLoaded', function() {
  initializeUserManagementPage();
});

async function initializeUserManagementPage() {
  // Load and display users
  await loadUsers();

  // Initialize tab switching
  const tabItems = document.querySelectorAll('.tab-item');
  tabItems.forEach(tab => {
    tab.addEventListener('click', handleTabSwitch);
  });

  // Initialize search functionality
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }

  // Initialize filter buttons
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', handleFilter);
  });

  // Initialize action buttons
  const addNewUserBtn = document.getElementById('addNewUserBtn');
  if (addNewUserBtn) {
    addNewUserBtn.addEventListener('click', handleAddNewUser);
  }

  const deleteUserBtn = document.getElementById('deleteUserBtn');
  if (deleteUserBtn) {
    deleteUserBtn.addEventListener('click', handleDeleteUser);
  }

  // Initialize select all checkbox
  const selectAllCheckbox = document.getElementById('selectAll');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', handleSelectAll);
  }

  // Initialize sidebar menu toggle for mobile
  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', toggleSidebar);
  }

  // Initialize sidebar search
  const sidebarSearch = document.querySelector('.sidebar .search-box input');
  if (sidebarSearch) {
    sidebarSearch.addEventListener('input', handleSidebarSearch);
  }

  // Update user count
  updateUserCount();
}

/**
 * Load and display users from Firebase/localStorage
 */
async function loadUsers() {
  try {
    const users = await getAllUsers();
    renderUserTable(users);
    updateUserCount();
  } catch (error) {
    console.error('Error loading users:', error);
    showNotification('Failed to load users', 'error');
  }
}

/**
 * Render users table
 */
function renderUserTable(users) {
  const tbody = document.getElementById('usersTbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!users.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: #999;">
          <i class="fa-solid fa-users" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
          No users found. <a href="add-user.html" style="color: #a71d31;">Add a new user</a>
        </td>
      </tr>
    `;
    return;
  }

  users.forEach((user, index) => {
    const statusClass = user.status.toLowerCase().replace(' ', '-');
    const roleClass = user.role.toLowerCase().replace(' ', '-');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="row-checkbox" type="checkbox" value="${user.userId}" /></td>
      <td>
        <div class="user-info">
          <div class="user-avatar">${user.firstName.charAt(0)}${user.lastName.charAt(0)}</div>
          <div class="user-details">
            <div class="user-name">${user.firstName} ${user.lastName}</div>
            <div class="user-id">${user.userId}</div>
          </div>
        </div>
      </td>
      <td>${user.email}</td>
      <td><span class="role-badge role-${roleClass}">${user.role}</span></td>
      <td><span class="status-badge status-${statusClass}">${user.status}</span></td>
      <td>${user.lastActive}</td>
      <td>
        <div class="action-buttons">
          <a href="view-user.html?id=${encodeURIComponent(user.userId)}" class="action-btn view-btn" title="View">
            <i class="fa-solid fa-eye"></i>
          </a>
          <a href="edit-user.html?id=${encodeURIComponent(user.userId)}" class="action-btn edit-btn" title="Edit">
            <i class="fa-solid fa-pen"></i>
          </a>
          <button class="action-btn delete-btn" title="Delete" onclick="confirmDeleteSingle('${user.userId}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Re-attach event listeners for checkboxes
  const checkboxes = document.querySelectorAll('.row-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateDeleteButtonState);
  });
}

/**
 * Update user count display
 */
function updateUserCount() {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'Active').length;

  const countElement = document.getElementById('userCount');
  if (countElement) {
    countElement.textContent = `${totalUsers} users (${activeUsers} active)`;
  }
}

/**
 * Handle tab switching
 */
function handleTabSwitch(event) {
  const tabButton = event.currentTarget;
  const tabName = tabButton.getAttribute('data-tab');

  // Remove active class from all tabs and contents
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  // Add active class to clicked tab and corresponding content
  tabButton.classList.add('active');
  const tabContent = document.getElementById(`${tabName}-tab`);
  if (tabContent) {
    tabContent.classList.add('active');
  }

  console.log(`Switched to tab: ${tabName}`);
}

/**
 * Handle search functionality
 */
function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase();
  const tableRows = document.querySelectorAll('#usersTbody tr');

  tableRows.forEach(row => {
    if (row.querySelector('.user-info')) {
      const userName = row.querySelector('.user-name').textContent.toLowerCase();
      const userId = row.querySelector('.user-id').textContent.toLowerCase();
      const email = row.cells[2].textContent.toLowerCase();
      const role = row.cells[3].textContent.toLowerCase();
      const status = row.cells[4].textContent.toLowerCase();

      const matchesSearch =
        userName.includes(searchTerm) ||
        userId.includes(searchTerm) ||
        email.includes(searchTerm) ||
        role.includes(searchTerm) ||
        status.includes(searchTerm);

      row.style.display = matchesSearch ? '' : 'none';
    }
  });
}

/**
 * Handle filter functionality
 */
function handleFilter(event) {
  const filterButton = event.currentTarget;
  const filterType = filterButton.getAttribute('data-filter');

  // Update active filter button
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  filterButton.classList.add('active');

  // Filter table rows
  const tableRows = document.querySelectorAll('#usersTbody tr');

  tableRows.forEach(row => {
    if (row.querySelector('.user-info')) {
      const status = row.cells[4].textContent.trim();
      const role = row.cells[3].textContent.trim();

      let showRow = false;
      switch (filterType) {
        case 'all':
          showRow = true;
          break;
        case 'active':
          showRow = status === 'Active';
          break;
        case 'inactive':
          showRow = status === 'Inactive';
          break;
        case 'admin':
          showRow = role === 'Admin';
          break;
        case 'manager':
          showRow = role === 'Manager';
          break;
        case 'staff':
          showRow = role === 'Staff';
          break;
      }

      row.style.display = showRow ? '' : 'none';
    }
  });
}

/**
 * Handle select all checkbox
 */
function handleSelectAll(event) {
  const isChecked = event.target.checked;
  const checkboxes = document.querySelectorAll('.row-checkbox');

  checkboxes.forEach(checkbox => {
    checkbox.checked = isChecked;
  });

  updateDeleteButtonState();
}

/**
 * Update delete button state based on selection
 */
function updateDeleteButtonState() {
  const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
  const deleteBtn = document.getElementById('deleteUserBtn');

  if (deleteBtn) {
    deleteBtn.disabled = selectedCheckboxes.length === 0;
    deleteBtn.textContent = selectedCheckboxes.length > 0
      ? `Delete Selected (${selectedCheckboxes.length})`
      : 'Delete Selected';
  }
}

/**
 * Handle Adding New User
 */
function handleAddNewUser() {
  window.location.href = 'add-user.html';
}

/**
 * Handle Delete Multiple Users
 */
function handleDeleteUser() {
  const selectedUsers = getSelectedUsers();
  if (selectedUsers.length === 0) {
    showNotification('Please select users to delete', 'error');
    return;
  }

  const confirmed = confirm(`Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone.`);
  if (confirmed) {
    deleteSelectedUsers(selectedUsers);
  }
}

/**
 * Delete selected users
 */
async function deleteSelectedUsers(userIds) {
  try {
    const result = await deleteUsers(userIds);
    if (result.success) {
      showNotification(result.message, 'success');
      await loadUsers(); // Reload the table
    } else {
      showNotification(result.message, 'error');
    }
  } catch (error) {
    console.error('Error deleting users:', error);
    showNotification('Failed to delete users', 'error');
  }
}

/**
 * Confirm delete single user
 */
function confirmDeleteSingle(userId) {
  const confirmed = confirm(`Are you sure you want to delete user "${userId}"? This action cannot be undone.`);
  if (confirmed) {
    deleteSingleUser(userId);
  }
}

/**
 * Delete single user
 */
async function deleteSingleUser(userId) {
  try {
    const result = await deleteUser(userId);
    if (result.success) {
      showNotification(result.message, 'success');
      await loadUsers(); // Reload the table
    } else {
      showNotification(result.message, 'error');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    showNotification('Failed to delete user', 'error');
  }
}

/**
 * Get Selected Users
 */
function getSelectedUsers() {
  const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
  return Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
}

/**
 * Handle Sidebar Search
 */
function handleSidebarSearch(event) {
  const searchTerm = event.target.value.toLowerCase();
  const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');

  menuItems.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(searchTerm) ? '' : 'none';
  });
}

// Global function for external access
window.confirmDeleteSingle = confirmDeleteSingle;
