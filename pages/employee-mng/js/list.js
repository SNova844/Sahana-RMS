import { EmployeeManagement } from './employee-mng.js';
import { setEmployeeToDelete, initDeleteModal } from './delete.js';
import { manager } from './employee-manager.js';
import { EmployeeAnalytics } from './analytics.js';
let employees = [];
let filteredEmployees = [];
let currentPage = 1;
let itemsPerPage = 12;
let pendingDeleteId = null;
let searchTimeout;
let analytics=null;

function filterEmployees() {
  let filtered = [...employees];
  
  // Search filter
  const searchTerm = document.getElementById('searchEmployee')?.value?.trim().toLowerCase() || '';
  if (searchTerm) {
    filtered = filtered.filter((emp) =>
      emp.name?.toLowerCase().includes(searchTerm) ||
      emp.email?.toLowerCase().includes(searchTerm) ||
      emp.id?.toLowerCase().includes(searchTerm) ||
      emp.role?.toLowerCase().includes(searchTerm) ||
      emp.department?.toLowerCase().includes(searchTerm)
    );
  }
  
  // Status filter
  const statusFilter = document.getElementById('statusFilter')?.value || 'all';
  if (statusFilter !== 'all') {
    filtered = filtered.filter(emp => emp.status === statusFilter);
  }
  
  // Department filter
  const deptFilter = document.getElementById('departmentFilter')?.value || 'all';
  if (deptFilter !== 'all') {
    filtered = filtered.filter(emp => emp.department === deptFilter);
  }
  
  // Role filter
  const roleFilter = document.getElementById('roleFilter')?.value || 'all';
  if (roleFilter !== 'all') {
    filtered = filtered.filter(emp => emp.role === roleFilter);
  }
  
  // Sort
  const sortBy = document.getElementById('sortFilter')?.value || 'newest';
  if (sortBy === 'newest') {
    filtered.sort((a, b) => new Date(b.dateOfJoining) - new Date(a.dateOfJoining));
  } else if (sortBy === 'oldest') {
    filtered.sort((a, b) => new Date(a.dateOfJoining) - new Date(b.dateOfJoining));
  } else if (sortBy === 'nameAZ') {
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (sortBy === 'nameZA') {
    filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
  }
  
  filteredEmployees = filtered;
  currentPage = 1;
  renderTable();
}

function updatePagination() {
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage));
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const pageNumbers = document.getElementById('pageNumbers');
  const paginationInfo = document.getElementById('paginationInfo');
  const exportReportBtn = document.getElementById('exportReportBtn');

  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn) nextBtn.disabled = currentPage === totalPages;

  if (pageNumbers) {
    pageNumbers.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = `page-number ${i === currentPage ? 'active' : ''}`;
      btn.textContent = i;
      btn.addEventListener('click', () => {
        currentPage = i;
        renderTable();
      });
      pageNumbers.appendChild(btn);
    }
  }

  if (paginationInfo) {
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, filteredEmployees.length);
    paginationInfo.textContent = `Showing ${startIndex} to ${endIndex} of ${filteredEmployees.length} entries`;
  }
}

// ================= SUMMARY CARDS =================
function updateSummaryCards(employeesList) {
  const total = employeesList.length;
  const active = employeesList.filter(e => e.status === 'active').length;
  const inactive = employeesList.filter(e => e.status === 'inactive' || e.status === 'on-leave').length;

  const totalEl = document.getElementById('totalEmployeesCount');
  const activeEl = document.getElementById('activeEmployeesCount');
  const inactiveEl = document.getElementById('inactiveEmployeesCount');

  if (totalEl) totalEl.textContent = total;
  if (activeEl) activeEl.textContent = active;
  if (inactiveEl) inactiveEl.textContent = inactive;
}

 

  

function renderTable() {
  const tableBody = document.getElementById('tableBody');
  if (!tableBody) return;

  updateSummaryCards(employees);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  tableBody.innerHTML = '';

  if (pageEmployees.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#999;">No employees found</td></tr>';
    updatePagination();
    return;
  }

  pageEmployees.forEach((emp, index) => {
    const rowNumber = startIndex + index + 1;
    const statusBadge = `<span class="status-badge ${emp.status || 'inactive'}">${emp.status || 'inactive'}</span>`;
    const contactNumber = emp.contact || emp.phone || '-';
    const employeeName = emp.name || emp.fullName || '-';
    const employeeId = emp.id || emp.employeeId;
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rowNumber}</td>
      <td>${employeeName}</td>
      <td>${emp.role || '-'}</td>
      <td>${emp.department || '-'}</td>
      <td>${contactNumber}</td>
      <td>${statusBadge}</td>
      <td>
        <div class="action-icons">
          <button class="action-btn view" title="View Profile" data-id="${employeeId}"><i class="fa-solid fa-eye"></i></button>
          <button class="action-btn edit" title="Edit" data-id="${employeeId}"><i class="fa-solid fa-pen"></i></button>
          <button class="action-btn delete" title="Delete" data-id="${employeeId}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });

  attachActionListeners();
  updatePagination();
}
    

function attachActionListeners() {
  document.querySelectorAll('.action-btn.view').forEach((button) => {
    button.addEventListener('click', () => {
      const empId = button.dataset.id;
      window.location.href = `profile.html?id=${empId}`;
    });
  });

  document.querySelectorAll('.action-btn.edit').forEach((button) => {
    button.addEventListener('click', () => {
      const empId = button.dataset.id;
      window.location.href = `edit.html?id=${empId}&edit=true`;
    });
  });

  document.querySelectorAll('.action-btn.delete').forEach((button) => {
    button.addEventListener('click', () => {
      pendingDeleteId = button.dataset.id;
      console.log('Delete button clicked for employee:', pendingDeleteId);
      setEmployeeToDelete(pendingDeleteId);
      const employee = employees.find((emp) => emp.id === pendingDeleteId);
      const deleteMessage = document.getElementById('deleteMessage');
      if (deleteMessage) {
        deleteMessage.textContent = `Are you sure you want to delete ${employee?.name || 'this employee'}? This action cannot be undone.`;
      }
      manager.showModal('deleteModal');
    });
  });
}

function setupPageEvents() {


  document.getElementById('btnAddEmployee')?.addEventListener('click', () => {
    window.location.href = 'add.html';
  });

 
  const entriesSelect = document.getElementById('entriesSelect');
  entriesSelect?.addEventListener('change', (e) => {
    itemsPerPage = Number(e.target.value);
    currentPage = 1;
    renderTable();
  });

  const searchInput = document.getElementById('searchEmployee');
  searchInput?.addEventListener('input', (e) => {
    filterEmployees(e.target.value);
  });

    // Filter event listeners
  document.getElementById('statusFilter')?.addEventListener('change', filterEmployees);
  document.getElementById('departmentFilter')?.addEventListener('change', filterEmployees);
  document.getElementById('roleFilter')?.addEventListener('change', filterEmployees);
  document.getElementById('sortFilter')?.addEventListener('change', filterEmployees);

  document.getElementById('prevBtn')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      renderTable();
    }
  });

  document.getElementById('nextBtn')?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage += 1;
      renderTable();
    }
  });

  initDeleteModal();
  const analyticsBtn = document.getElementById('exportReportBtn');
if (analyticsBtn) {
  analyticsBtn.addEventListener('click', () => {
    if (!analytics) {
      analytics = new EmployeeAnalytics();
    }
    analytics.initialize();
    manager.showModal('analyticsModal');
  });
}


const analyticsModalClose = document.getElementById('analyticsModalClose');
if (analyticsModalClose) {
  analyticsModalClose.addEventListener('click', () => {
    manager.closeModal('analyticsModal');
  });
}

  document.getElementById('profileModalClose')?.addEventListener('click', () => {
    manager.closeModal('profileModal');
  });

  document.getElementById('errorModalClose')?.addEventListener('click', () => {
    manager.closeModal('errorModal');
  });

  document.getElementById('successOkBtn')?.addEventListener('click', () => {
    manager.closeModal('deleteSuccessModal');
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setupPageEvents();

  manager.getEmployees(
  (items) => {
    employees = items;
    filteredEmployees = [...employees];
    console.log('=== DEBUG INFO ===');
    console.log('Number of employees:', employees.length);
    if (employees.length > 0) {
      console.log('First employee data:', employees[0]);
      console.log('Field names:', Object.keys(employees[0]));
    }
    renderTable();
  },
  (error) => {
    console.error('Error loading employees:', error);
  }
);
});