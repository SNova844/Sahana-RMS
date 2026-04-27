import { manager } from './employee-manager.js';
let employeeToDelete = null;

export function setEmployeeToDelete(employeeId) {
  employeeToDelete = employeeId;
}

export async function confirmDeleteEmployee() {
  if (!employeeToDelete) {
    console.error('No employee selected for deletion');
    return;
  }

  console.log('Attempting to delete employee:', employeeToDelete);

  try {
    // Delete from database
    await manager.deleteEmployeeById(employeeToDelete);
    console.log(`Employee ${employeeToDelete} deleted successfully`);

    // Close the confirmation modal
    manager.closeModal('deleteModal');

    // Show success modal
    manager.showModal('deleteSuccessModal');

    // Reset the selected employee
    employeeToDelete = null;

  } catch (error) {
    console.error('Error deleting employee:', error);
    manager.showError('Failed to delete employee: ' + error.message);
  }
}

export function initDeleteModal() {
  // Set up event listeners for the delete modal
  const confirmBtn = document.getElementById('deleteConfirmBtn');
  const cancelBtn = document.getElementById('deleteCancelBtn');
  const closeBtn = document.getElementById('deleteModalClose');

  if (confirmBtn) {
    confirmBtn.addEventListener('click', confirmDeleteEmployee);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      manager.closeModal('deleteModal');
      employeeToDelete = null;
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      manager.closeModal('deleteModal');
      employeeToDelete = null;
    });
  }
}