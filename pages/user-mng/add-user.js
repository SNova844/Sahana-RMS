// Add/Edit User Page JavaScript with Firebase integration

import { addUser, getUserById, updateUser, validateUserData, showNotification, toggleSidebar } from './user-crud-firebase.js';

document.addEventListener('DOMContentLoaded', function() {
  initializeAddUserPage();

  // Initialize menu toggle for mobile
  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', toggleSidebar);
  }
});

async function initializeAddUserPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const editUserId = urlParams.get('edit');

  if (editUserId) {
    // Edit mode
    await loadUserForEdit(editUserId);
    updatePageForEditMode();
  } else {
    // Add mode
    updatePageForAddMode();
  }

  // Initialize form submission
  const form = document.getElementById('addUserForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // Auto-generate user ID when first/last name change
  const firstNameInput = document.getElementById('firstName');
  const lastNameInput = document.getElementById('lastName');

  if (firstNameInput && lastNameInput) {
    const generateUserId = () => {
      const firstName = firstNameInput.value.trim();
      const lastName = lastNameInput.value.trim();
      if (firstName && lastName) {
        const userId = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
        document.getElementById('userId').value = userId;
      }
    };

    firstNameInput.addEventListener('input', generateUserId);
    lastNameInput.addEventListener('input', generateUserId);
  }
}

function updatePageForAddMode() {
  document.querySelector('.form-header h2').textContent = 'Add New User';
  document.querySelector('.form-header p').textContent = 'Fill in the details to create a new user account.';
  document.querySelector('.breadcrumb .current').textContent = 'Add User';
  document.querySelector('.btn-primary').innerHTML = '<i class="fa-solid fa-check"></i>Add User';
}

function updatePageForEditMode() {
  document.querySelector('.form-header h2').textContent = 'Edit User';
  document.querySelector('.form-header p').textContent = 'Update the user account information.';
  document.querySelector('.breadcrumb .current').textContent = 'Edit User';
  document.querySelector('.btn-primary').innerHTML = '<i class="fa-solid fa-check"></i>Update User';
}

async function loadUserForEdit(userId) {
  try {
    const user = await getUserById(userId);
    if (user) {
      // Populate form fields
      document.getElementById('firstName').value = user.firstName || '';
      document.getElementById('lastName').value = user.lastName || '';
      document.getElementById('userId').value = user.userId || '';
      document.getElementById('email').value = user.email || '';
      document.getElementById('role').value = user.role || '';
      document.getElementById('status').value = user.status || '';

      // Set last active if available
      if (user.lastActive) {
        // Convert to datetime-local format if it's a readable string
        const lastActiveInput = document.getElementById('lastActive');
        if (lastActiveInput && user.lastActive !== 'Now') {
          // For demo purposes, set current time if it's a relative time
          const now = new Date();
          lastActiveInput.value = now.toISOString().slice(0, 16);
        }
      }
    } else {
      showNotification('User not found', 'error');
      setTimeout(() => {
        window.location.href = 'user.html';
      }, 1500);
    }
  } catch (error) {
    console.error('Error loading user:', error);
    showNotification('Failed to load user data', 'error');
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const userData = {
    firstName: formData.get('firstName').trim(),
    lastName: formData.get('lastName').trim(),
    userId: formData.get('userId').trim(),
    email: formData.get('email').trim(),
    role: formData.get('role'),
    status: formData.get('status'),
    lastActive: formData.get('lastActive') || 'Now'
  };

  // Validate data
  const validation = validateUserData(userData);
  if (!validation.valid) {
    showNotification(validation.message, 'error');
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const editUserId = urlParams.get('edit');

  try {
    let result;
    if (editUserId) {
      // Update existing user
      result = await updateUser(editUserId, userData);
    } else {
      // Add new user
      result = await addUser(userData);
    }

    if (result.success) {
      showNotification(result.message, 'success');

      // Redirect after success
      setTimeout(() => {
        window.location.href = 'user.html';
      }, 1500);
    } else {
      showNotification(result.message, 'error');
    }
  } catch (error) {
    console.error('Error saving user:', error);
    showNotification('An unexpected error occurred', 'error');
  }
}

// Utility function to format user ID
function formatUserId(firstName, lastName) {
  if (!firstName || !lastName) return '';
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
}