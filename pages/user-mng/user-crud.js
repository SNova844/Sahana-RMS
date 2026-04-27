// User Management CRUD utility (localStorage backed)

const USER_STORAGE_KEY = 'sahana_users_v1';

const DEFAULT_USERS = [
  { userId: 'naduni.perera', firstName: 'Naduni', lastName: 'Perera', email: 'naduni@example.com', role: 'Staff', status: 'Active', lastActive: 'Now' },
  { userId: 'kavindu.silva', firstName: 'Kavindu', lastName: 'Silva', email: 'kavindu@example.com', role: 'Staff', status: 'Active', lastActive: '5 min' },
  { userId: 'ashen.jayawardena', firstName: 'Ashen', lastName: 'Jayawardena', email: 'ashen@example.com', role: 'Manager', status: 'Inactive', lastActive: '2 hours ago' },
  { userId: 'tharinda.wijesooriya', firstName: 'Tharinda', lastName: 'Wijesooriya', email: 'tharinda@example.com', role: 'Admin', status: 'Active', lastActive: '1 min' },
  { userId: 'sachith.kumar', firstName: 'Sachith', lastName: 'Kumar', email: 'sachith@example.com', role: 'Staff', status: 'Inactive', lastActive: '1 day ago' },
  { userId: 'samantha.wijesooriya', firstName: 'Samantha', lastName: 'Wijesooriya', email: 'samantha@example.com', role: 'Manager', status: 'Active', lastActive: '3 min' },
  { userId: 'rajesh.kumar', firstName: 'Rajesh', lastName: 'Kumar', email: 'rajesh@example.com', role: 'Staff', status: 'Inactive', lastActive: '3 days ago' },
  { userId: 'priya.jayawardena', firstName: 'Priya', lastName: 'Jayawardena', email: 'priya@example.com', role: 'Staff', status: 'Active', lastActive: '2 min' }
];

function getUsers() {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    return [...DEFAULT_USERS];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    throw new Error('Invalid stored users format');
  } catch (err) {
    console.error('Error reading users from storage:', err);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    return [...DEFAULT_USERS];
  }
}

function setUsers(users) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
}

function addUser(user) {
  const users = getUsers();
  const exists = users.some(u => u.userId === user.userId || u.email.toLowerCase() === user.email.toLowerCase());
  if (exists) {
    return false;
  }

  users.unshift(user);
  setUsers(users);
  return true;
}

function getUserById(userId) {
  const users = getUsers();
  return users.find(u => u.userId === userId) || null;
}

function updateUser(originalUserId, updatedUser) {
  let users = getUsers();
  const index = users.findIndex(u => u.userId === originalUserId);
  if (index === -1) return false;

  const conflict = users.some((u, idx) => idx !== index && (u.userId === updatedUser.userId || u.email.toLowerCase() === updatedUser.email.toLowerCase()));
  if (conflict) return false;

  users[index] = updatedUser;
  setUsers(users);
  return true;
}

function deleteUser(userId) {
  const users = getUsers().filter(u => u.userId !== userId);
  setUsers(users);
}

function deleteUsers(userIds) {
  const remaining = getUsers().filter(u => !userIds.includes(u.userId));
  setUsers(remaining);
}

function renderUserTable(tableBodyId = 'usersTbody') {
  const users = getUsers();
  const tbody = document.getElementById(tableBodyId);
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px;">No users found.</td></tr>';
    return;
  }

  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="row-checkbox" type="checkbox" value="${user.userId}" /></td>
      <td>${user.userId}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>${user.status}</td>
      <td>
        <button class="action-btn edit-btn" type="button" title="Edit" onclick="window.location.href='add-user.html?edit=${encodeURIComponent(user.userId)}'"> <i class="fa-solid fa-pen"></i></button>
        <button class="action-btn delete-btn" type="button" title="Delete" onclick="confirmDeleteSingle('${encodeURIComponent(user.userId)}')"> <i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function confirmDeleteSingle(userIdEncoded) {
  const userId = decodeURIComponent(userIdEncoded);
  const users = getUsers();
  const user = users.find(u => u.userId === userId);
  if (!user) {
    alert('User not found');
    return;
  }

  const confirmed = confirm(`Delete user ${user.userId} (${user.email})? This cannot be undone.`);
  if (!confirmed) return;

  deleteUser(user.userId);
  renderUserTable('usersTbody');
  renderUserTable('deleteUsersTbody');
  alert(`User ${user.userId} deleted`);
}

function handleAddUserFormSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const firstName = form.firstName.value.trim();
  const lastName = form.lastName.value.trim();
  const email = form.email.value.trim();
  const role = form.role.value;
  const status = form.status.value;
  const lastActive = form.lastActive.value ? new Date(form.lastActive.value).toLocaleString() : 'Now';

  if (!firstName || !lastName || !email || !role || !status) {
    alert('Please fill in all required fields');
    return;
  }

  const userId = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  const editedUserId = new URLSearchParams(window.location.search).get('edit');

  if (editedUserId) {
    const updatedUser = { userId, firstName, lastName, email, role, status, lastActive };
    if (!updateUser(editedUserId, updatedUser)) {
      alert('Could not update user. Check for duplicate userId or email.');
      return;
    }
    alert(`User ${updatedUser.userId} updated successfully`);
    setTimeout(() => { window.location.href = 'user.html'; }, 600);
    return;
  }

  const user = { userId, firstName, lastName, email, role, status, lastActive };
  if (!addUser(user)) {
    alert('A user with the same ID or email already exists.');
    return;
  }

  alert(`User ${user.userId} added successfully`);
  setTimeout(() => { window.location.href = 'user.html'; }, 600);
}

function initializeUserCrudPage() {
  const page = window.location.pathname.split('/').pop();

  if (page === 'user.html') {
    renderUserTable('usersTbody');
    const deleteToggle = document.getElementById('selectAll');
    if (deleteToggle) {
      deleteToggle.addEventListener('change', () => {
        document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = deleteToggle.checked);
      });
    }
  }

  if (page === 'delete-user.html') {
    renderUserTable('deleteUsersTbody');

    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
      selectAll.addEventListener('change', () => {
        document.querySelectorAll('#deleteUsersTbody .row-checkbox').forEach(cb => cb.checked = selectAll.checked);
      });
    }

    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener('click', () => {
        const selected = Array.from(document.querySelectorAll('#deleteUsersTbody .row-checkbox:checked')).map(el => el.value);
        if (!selected.length) {
          alert('Please select users to delete');
          return;
        }

        const confirmMsg = `Delete ${selected.length} user(s)? This action cannot be undone.`;
        if (!confirm(confirmMsg)) return;

        deleteUsers(selected);
        renderUserTable('deleteUsersTbody');
        renderUserTable('usersTbody');
        alert(`Deleted ${selected.length} user(s)`);
      });
    }
  }

  if (page === 'add-user.html') {
    const form = document.getElementById('addUserForm');
    if (form) {
      const editModeUserId = new URLSearchParams(window.location.search).get('edit');
      if (editModeUserId) {
        const user = getUserById(editModeUserId);
        if (user) {
          form.firstName.value = user.firstName;
          form.lastName.value = user.lastName;
          form.email.value = user.email;
          form.role.value = user.role;
          form.status.value = user.status;
          if (user.lastActive && user.lastActive !== 'Now') {
            try {
              const d = new Date(user.lastActive);
              form.lastActive.value = d.toISOString().slice(0, 16);
            } catch {
              form.lastActive.value = '';
            }
          }
          document.querySelector('.form-header h2').textContent = 'Edit User';
          document.querySelector('.form-header p').textContent = 'Update user account details.';
          form.querySelector('button[type="submit"]').innerHTML = '<i class="fa-solid fa-check"></i>Update User';
        }
      }

      form.addEventListener('submit', handleAddUserFormSubmit);
    }
  }
}

window.addEventListener('DOMContentLoaded', initializeUserCrudPage);
