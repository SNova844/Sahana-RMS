// Delete Users Page JavaScript with Firebase integration

import { getAllUsers, deleteUsers, showNotification, toggleSidebar } from './user-crud-firebase.js';

document.addEventListener('DOMContentLoaded', function() {
  initializeDeleteUsersPage();

  // Initialize menu toggle for mobile
  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', toggleSidebar);
  }
});

async function initializeDeleteUsersPage() {
  // Load and display users
  await loadUsersForDeletion();

  // Initialize select all checkbox
  const selectAllCheckbox = document.getElementById('selectAll');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', handleSelectAll);
  }

  // Initialize bulk delete button
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', handleBulkDelete);
  }

  // Update delete button state
  updateBulkDeleteButtonState();
}

/**
 * Load and display users for deletion
 */
async function loadUsersForDeletion() {
  try {
    const users = await getAllUsers();
    renderDeleteUsersTable(users);
  } catch (error) {
    console.error('Error loading users:', error);
    showNotification('Failed to load users', 'error');
  }
}

/**
 * Render users table for deletion
 */
function renderDeleteUsersTable(users) {
  const tbody = document.getElementById('deleteUsersTbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!users.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #999;">
          <i class="fa-solid fa-users" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
          No users available for deletion
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
      <td>
        <div class="action-buttons">
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
    checkbox.addEventListener('change', updateBulkDeleteButtonState);
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

  updateBulkDeleteButtonState();
}

/**
 * Update bulk delete button state based on selection
 */
function updateBulkDeleteButtonState() {
  const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

  if (bulkDeleteBtn) {
    bulkDeleteBtn.disabled = selectedCheckboxes.length === 0;
    bulkDeleteBtn.textContent = selectedCheckboxes.length > 0
      ? `Delete Selected (${selectedCheckboxes.length})`
      : 'Delete Selected';
  }
}

/**
 * Handle bulk delete
 */
async function handleBulkDelete() {
  const selectedUsers = getSelectedUsers();
  if (selectedUsers.length === 0) {
    showNotification('Please select users to delete', 'error');
    return;
  }

  const confirmed = confirm(`Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone.`);
  if (confirmed) {
    await performBulkDelete(selectedUsers);
  }
}

/**
 * Perform bulk delete operation
 */
async function performBulkDelete(userIds) {
  try {
    const result = await deleteUsers(userIds);
    if (result.success) {
      showNotification(result.message, 'success');

      // Reload the page to show updated list
      setTimeout(() => {
        window.location.reload();
      }, 1500);
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
    performSingleDelete(userId);
  }
}

/**
 * Perform single delete operation
 */
async function performSingleDelete(userId) {
  try {
    const result = await deleteUsers([userId]);
    if (result.success) {
      showNotification(result.message, 'success');

      // Reload the page to show updated list
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showNotification(result.message, 'error');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    showNotification('Failed to delete user', 'error');
  }
}

/**
 * Get selected users
 */
function getSelectedUsers() {
  const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
  return Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
}

// Global function for external access
window.confirmDeleteSingle = confirmDeleteSingle;