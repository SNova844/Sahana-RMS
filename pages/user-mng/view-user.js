// View User Page JavaScript with Firebase integration

import { getUserById, showNotification, toggleSidebar } from './user-crud-firebase.js';

document.addEventListener('DOMContentLoaded', function() {
  initializeViewUserPage();

  // Initialize menu toggle for mobile
  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', toggleSidebar);
  }
});

async function initializeViewUserPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');

  if (!userId) {
    showNotification('No user specified', 'error');
    setTimeout(() => {
      window.location.href = 'user.html';
    }, 1500);
    return;
  }

  // Load and display user details
  await loadUserDetails(userId);

  // Set up action button links
  setupActionButtons(userId);
}

async function loadUserDetails(userId) {
  try {
    const user = await getUserById(userId);

    if (user) {
      // Populate the view with user details
      document.getElementById('viewUserId').textContent = user.userId || '-';
      document.getElementById('viewFullName').textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || '-';
      document.getElementById('viewEmail').textContent = user.email || '-';

      // Role badge
      const roleElement = document.getElementById('viewRole');
      roleElement.textContent = user.role || '-';
      roleElement.className = `role-badge role-${(user.role || '').toLowerCase().replace(' ', '-')}`;

      // Status badge
      const statusElement = document.getElementById('viewStatus');
      statusElement.textContent = user.status || '-';
      statusElement.className = `status-badge status-${(user.status || '').toLowerCase().replace(' ', '-')}`;

      document.getElementById('viewLastActive').textContent = user.lastActive || '-';

      // Format dates
      document.getElementById('viewCreatedDate').textContent = formatDate(user.createdDate) || '-';
      document.getElementById('viewUpdatedDate').textContent = formatDate(user.updatedDate) || '-';
    } else {
      showNotification('User not found', 'error');
      setTimeout(() => {
        window.location.href = 'user.html';
      }, 1500);
    }
  } catch (error) {
    console.error('Error loading user details:', error);
    showNotification('Failed to load user details', 'error');
    setTimeout(() => {
      window.location.href = 'user.html';
    }, 1500);
  }
}

function setupActionButtons(userId) {
  const editBtn = document.getElementById('editBtn');
  const deleteBtn = document.getElementById('deleteBtn');

  if (editBtn) {
    editBtn.href = `edit-user.html?id=${encodeURIComponent(userId)}`;
  }

  if (deleteBtn) {
    deleteBtn.href = `delete-user.html?id=${encodeURIComponent(userId)}`;
  }
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
}