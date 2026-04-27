// User Management CRUD Operations with Firebase sync

import { db } from '../../js/firebase-config.js';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

const DEFAULT_USERS = [
  {
    userId: 'naduni.perera',
    firstName: 'Naduni',
    lastName: 'Perera',
    email: 'naduni@example.com',
    role: 'Staff',
    status: 'Active',
    lastActive: 'Now',
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString()
  },
  {
    userId: 'kavindu.silva',
    firstName: 'Kavindu',
    lastName: 'Silva',
    email: 'kavindu@example.com',
    role: 'Staff',
    status: 'Active',
    lastActive: '5 min',
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString()
  },
  {
    userId: 'ashen.jayawardena',
    firstName: 'Ashen',
    lastName: 'Jayawardena',
    email: 'ashen@example.com',
    role: 'Manager',
    status: 'Inactive',
    lastActive: '2 hours ago',
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString()
  },
  {
    userId: 'tharinda.wijesooriya',
    firstName: 'Tharinda',
    lastName: 'Wijesooriya',
    email: 'tharinda@example.com',
    role: 'Admin',
    status: 'Active',
    lastActive: '1 min',
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString()
  },
  {
    userId: 'sachith.kumar',
    firstName: 'Sachith',
    lastName: 'Kumar',
    email: 'sachith@example.com',
    role: 'Staff',
    status: 'Inactive',
    lastActive: '1 day ago',
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString()
  },
  {
    userId: 'samantha.wijesooriya',
    firstName: 'Samantha',
    lastName: 'Wijesooriya',
    email: 'samantha@example.com',
    role: 'Manager',
    status: 'Active',
    lastActive: '3 min',
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString()
  },
  {
    userId: 'rajesh.kumar',
    firstName: 'Rajesh',
    lastName: 'Kumar',
    email: 'rajesh@example.com',
    role: 'Staff',
    status: 'Inactive',
    lastActive: '3 days ago',
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString()
  },
  {
    userId: 'priya.jayawardena',
    firstName: 'Priya',
    lastName: 'Jayawardena',
    email: 'priya@example.com',
    role: 'Staff',
    status: 'Active',
    lastActive: '2 min',
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString()
  }
];

// ==================== FIREBASE FUNCTIONS ====================
async function loadUsersFromFirebase() {
  try {
    const q = query(collection(db, 'users'), orderBy('createdDate', 'desc'));
    const querySnapshot = await getDocs(q);

    const users = querySnapshot.docs.map(docSnap => ({
      ...docSnap.data(),
      id: docSnap.id
    }));

    if (users.length > 0) {
      localStorage.setItem('users', JSON.stringify(users));
    }

    return users;
  } catch (error) {
    console.warn('Firebase load failed, falling back to localStorage:', error);
    return [];
  }
}

function getFirestoreDocId(userId) {
  return encodeURIComponent(userId);
}

async function saveUserToFirebase(user) {
  try {
    const docId = getFirestoreDocId(user.userId);
    await setDoc(doc(db, 'users', docId), {
      ...user,
      updatedDate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Firebase save error:', error);
  }
}

async function updateUserInFirebase(userId, user) {
  try {
    const docId = getFirestoreDocId(userId);
    await setDoc(doc(db, 'users', docId), {
      ...user,
      updatedDate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Firebase update error:', error);
  }
}

async function deleteUserFromFirebase(userId) {
  try {
    const docId = getFirestoreDocId(userId);
    await deleteDoc(doc(db, 'users', docId));
  } catch (error) {
    console.error('Firebase delete error:', error);
  }
}

// ==================== LOCALSTORAGE FUNCTIONS ====================
function getUsers() {
  const raw = localStorage.getItem('users');
  if (!raw) {
    localStorage.setItem('users', JSON.stringify(DEFAULT_USERS));
    return [...DEFAULT_USERS];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    throw new Error('Invalid stored users format');
  } catch (err) {
    console.error('Error reading users from storage:', err);
    localStorage.setItem('users', JSON.stringify(DEFAULT_USERS));
    return [...DEFAULT_USERS];
  }
}

function setUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

// ==================== CRUD OPERATIONS ====================
export async function addUser(user) {
  try {
    const users = getUsers();

    // Check for duplicates
    const exists = users.some(u =>
      u.userId === user.userId ||
      u.email.toLowerCase() === user.email.toLowerCase()
    );

    if (exists) {
      return { success: false, message: 'User ID or email already exists' };
    }

    // Add timestamps
    const newUser = {
      ...user,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString()
    };

    users.unshift(newUser);
    setUsers(users);

    // Save to Firebase
    await saveUserToFirebase(newUser);

    return { success: true, message: 'User added successfully' };
  } catch (error) {
    console.error('Error adding user:', error);
    return { success: false, message: 'Failed to add user' };
  }
}

export async function getUserById(userId) {
  try {
    const users = getUsers();
    return users.find(u => u.userId === userId) || null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function updateUser(originalUserId, updatedUser) {
  try {
    let users = getUsers();
    const index = users.findIndex(u => u.userId === originalUserId);

    if (index === -1) {
      return { success: false, message: 'User not found' };
    }

    // Check for conflicts
    const conflict = users.some((u, idx) =>
      idx !== index && (
        u.userId === updatedUser.userId ||
        u.email.toLowerCase() === updatedUser.email.toLowerCase()
      )
    );

    if (conflict) {
      return { success: false, message: 'User ID or email already exists' };
    }

    // Update user
    const updatedUserWithTimestamp = {
      ...updatedUser,
      updatedDate: new Date().toISOString()
    };

    users[index] = updatedUserWithTimestamp;
    setUsers(users);

    // Update in Firebase
    await updateUserInFirebase(originalUserId, updatedUserWithTimestamp);

    return { success: true, message: 'User updated successfully' };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, message: 'Failed to update user' };
  }
}

export async function deleteUser(userId) {
  try {
    let users = getUsers();
    users = users.filter(u => u.userId !== userId);
    setUsers(users);

    // Delete from Firebase
    await deleteUserFromFirebase(userId);

    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, message: 'Failed to delete user' };
  }
}

export async function deleteUsers(userIds) {
  try {
    let users = getUsers();
    users = users.filter(u => !userIds.includes(u.userId));
    setUsers(users);

    // Delete from Firebase
    for (const userId of userIds) {
      await deleteUserFromFirebase(userId);
    }

    return { success: true, message: `${userIds.length} users deleted successfully` };
  } catch (error) {
    console.error('Error deleting users:', error);
    return { success: false, message: 'Failed to delete users' };
  }
}

export async function getAllUsers() {
  try {
    // Try to load from Firebase first
    const firebaseUsers = await loadUsersFromFirebase();
    if (firebaseUsers.length > 0) {
      return firebaseUsers;
    }

    // Fallback to localStorage
    return getUsers();
  } catch (error) {
    console.error('Error getting all users:', error);
    return getUsers();
  }
}

// ==================== UTILITY FUNCTIONS ====================
export function validateUserData(user) {
  // Check for empty required fields
  const requiredFields = ['userId', 'firstName', 'lastName', 'email', 'role', 'status'];
  const emptyFields = requiredFields.filter(field => !user[field] || user[field].trim() === '');

  if (emptyFields.length > 0) {
    if (emptyFields.length === requiredFields.length) {
      // All fields are empty - user hasn't started filling the form
      return { valid: false, message: 'Please fill in the required fields to add a user' };
    } else {
      // Some fields are empty
      return { valid: false, message: `Please fill in: ${emptyFields.join(', ')}` };
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(user.email)) {
    return { valid: false, message: 'Please enter a valid email address' };
  }

  const userIdRegex = /^[a-zA-Z0-9._]+$/;
  if (!userIdRegex.test(user.userId)) {
    return { valid: false, message: 'User ID can only contain letters, numbers, dots, and underscores' };
  }

  return { valid: true };
}

export function showNotification(message, type = 'info') {
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

export function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('active');
  }
}
