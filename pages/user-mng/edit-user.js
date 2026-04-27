// Edit User Page JavaScript with Firebase integration

import { getUserById, updateUser, showNotification, toggleSidebar } from './user-crud-firebase.js';

document.addEventListener('DOMContentLoaded', function() {
  initializeEditUserPage();

  // Initialize menu toggle for mobile
  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', toggleSidebar);
  }
});

async function initializeEditUserPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');

  if (!userId) {
    showNotification('No user specified for editing', 'error');
    setTimeout(() => {
      window.location.href = 'user.html';
    }, 1500);
    return;
  }

  // Load user data and populate form
  await loadUserForEditing(userId);

  // Set up form submission
  setupFormSubmission(userId);
}

async function loadUserForEditing(userId) {
  try {
    const user = await getUserById(userId);

    if (user) {
      // Populate form fields
      document.getElementById('userId').value = userId;
      document.getElementById('firstName').value = user.firstName || '';
      document.getElementById('lastName').value = user.lastName || '';
      document.getElementById('email').value = user.email || '';
      document.getElementById('role').value = user.role || '';
      document.getElementById('status').value = user.status || 'Active';
    } else {
      showNotification('User not found', 'error');
      setTimeout(() => {
        window.location.href = 'user.html';
      }, 1500);
    }
  } catch (error) {
    console.error('Error loading user for editing:', error);
    showNotification('Failed to load user data', 'error');
    setTimeout(() => {
      window.location.href = 'user.html';
    }, 1500);
  }
}

function setupFormSubmission(userId) {
  const form = document.getElementById('editUserForm');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const formData = new FormData(form);
    const userData = {
      firstName: formData.get('firstName').trim(),
      lastName: formData.get('lastName').trim(),
      email: formData.get('email').trim(),
      role: formData.get('role'),
      status: formData.get('status'),
      updatedDate: new Date().toISOString()
    };

    try {
      await updateUser(userId, userData);
      showNotification('User updated successfully!', 'success');
      setTimeout(() => {
        window.location.href = 'user.html';
      }, 1500);
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification('Failed to update user', 'error');
    }
  });
}

function validateForm() {
  let isValid = true;

  // Clear previous errors
  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

  // Validate first name
  const firstName = document.getElementById('firstName').value.trim();
  if (!firstName) {
    document.getElementById('firstNameError').textContent = 'First name is required';
    isValid = false;
  }

  // Validate last name
  const lastName = document.getElementById('lastName').value.trim();
  if (!lastName) {
    document.getElementById('lastNameError').textContent = 'Last name is required';
    isValid = false;
  }

  // Validate email
  const email = document.getElementById('email').value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    document.getElementById('emailError').textContent = 'Email is required';
    isValid = false;
  } else if (!emailRegex.test(email)) {
    document.getElementById('emailError').textContent = 'Please enter a valid email address';
    isValid = false;
  }

  // Validate role
  const role = document.getElementById('role').value;
  if (!role) {
    document.getElementById('roleError').textContent = 'Role is required';
    isValid = false;
  }

  return isValid;
}