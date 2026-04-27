/* ============================================
   EMPLOYEE EDIT - JAVASCRIPT
   ============================================ */

import { db } from './firebase-config.js';
import { 
  collection, 
  getDocs, 
  doc,
  updateDoc,
  query
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

export class EmployeeEdit {
  constructor() {
    this.selectedPhotoBase64 = null;
    this.selectedDocumentsBase64 = [];
    this.employees = [];
    this.currentEmployeeId = null;
    this.currentFirebaseId = null;
    this.selectedDocuments = [];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB

  }

    validatePhone(phone) {
    if (!phone) return 'Phone number is required';
    if (!/^\d{10}$/.test(phone)) return 'Phone number must be exactly 10 digits';
    if (!phone.startsWith('07')) return 'Phone number must start with 07 (Sri Lankan format)';
    return null;
  }
  validateNIC(nic) {
  if (!nic) return 'NIC number is required';
  nic = nic.trim().toUpperCase();
  if (/^\d{9}V$/.test(nic)) return null;
  if (/^\d{12}$/.test(nic)) return null;
  return 'Enter valid NIC (9 digits + V or 12 digits)';
}
validateEmergencyPhone(phone) {
  if (!phone) return null;
  if (!/^\d{10}$/.test(phone)) return 'Emergency phone must be exactly 10 digits';
  if (!phone.startsWith('07')) return 'Emergency phone must start with 07 (Sri Lankan format)';
  return null;
}

  validateDateOfJoining(doj) {
    if (!doj) return 'Date of joining is required';
    const joiningDate = new Date(doj);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (joiningDate > today) return 'Date of joining cannot be in the future';
    return null;
  }

  // ============================================
  // EDIT PAGE INITIALIZATION
  // ============================================

  initializeEditPage() {
    const urlParams = new URLSearchParams(window.location.search);
    this.currentEmployeeId = urlParams.get('id');

    if (!this.currentEmployeeId) {
      window.location.href = 'list.html';
      return;
    }

    this.loadEmployees();
    this.setupEditPageEventListeners();
  }

  async loadEmployees() {
    try {
      const q = query(collection(db, "employees"));
      const querySnapshot = await getDocs(q);
      
      this.employees = [];
      querySnapshot.forEach((docSnapshot) => {
        this.employees.push({
          firebaseId: docSnapshot.id,
          ...docSnapshot.data()
        });
      });

      const employee = this.employees.find(e => e.id === this.currentEmployeeId);
      if (employee) {
        this.currentFirebaseId = employee.firebaseId;
        this.populateFormWithEmployeeData(employee);
      } else {
        this.showError('Employee not found');
        setTimeout(() => window.location.href = 'list.html', 2000);
      }
    } catch (error) {
      console.error("Error loading employees:", error);
      this.showError('Error loading employee data: ' + error.message);
    }
  }

  populateFormWithEmployeeData(employee) {
    // Set Employee ID (read-only)
    const employeeIdInput = document.getElementById('employeeId');
    if (employeeIdInput) {
      employeeIdInput.value = employee.id;
    }

    // Personal Information
    const fullName = document.getElementById('fullName');
    if (fullName) fullName.value = employee.name || '';

    const email = document.getElementById('emailAddress');
    if (email) email.value = employee.email || '';

    const phone = document.getElementById('phoneNumber');
    if (phone) phone.value = employee.phone || '';

    const dob = document.getElementById('dateOfBirth');
    if (dob) dob.value = employee.dateOfBirth || '';

    const address = document.getElementById('address');
    if (address) address.value = employee.address || '';

    // Employee Details
    const joiningDate = document.getElementById('dateOfJoining');
    if (joiningDate) joiningDate.value = employee.dateOfJoining || '';

    const role = document.getElementById('role');
    if (role) role.value = employee.role || '';

    const department = document.getElementById('department');
    if (department) department.value = employee.department || '';

    const employmentType = document.getElementById('employmentType');
    if (employmentType) employmentType.value = employee.employmentType || '';

    const salary = document.getElementById('salary');
    if (salary) salary.value = employee.salary || '';

    // Status
    const statusRadio = document.querySelector(`input[name="status"][value="${employee.status || 'active'}"]`);
    if (statusRadio) statusRadio.checked = true;

    // Update breadcrumb
    const breadcrumb = document.getElementById('breadcrumbName');
    if (breadcrumb) breadcrumb.textContent = `Edit - ${employee.name}`;

    this.loadExistingDocuments(employee);

    // Set NIC and Emergency Contact values
  document.getElementById('nicNumber').value = employee.nicNumber || '';
  document.getElementById('emergencyContactName').value = employee.emergencyContactName || '';
  document.getElementById('emergencyContactPhone').value = employee.emergencyContactPhone || '';
  }

  loadExistingDocuments(employee) {
  if (employee.documents && employee.documents.length > 0) {
    this.selectedDocumentsBase64 = [...employee.documents];
    this.renderDocumentsList();
  }

  // Set bank name dropdown value
const bankSelect = document.getElementById('bankName');
if (bankSelect && employee.bankName) {
  let exists = false;
  for(let i = 0; i < bankSelect.options.length; i++) {
    if(bankSelect.options[i].value === employee.bankName) {
      exists = true;
      break;
    }
  }
  if(exists) {
    bankSelect.value = employee.bankName;
  } else {
    const option = document.createElement('option');
    option.value = employee.bankName;
    option.textContent = employee.bankName;
    bankSelect.appendChild(option);
    bankSelect.value = employee.bankName;
  }
}
  
}


  setupEditPageEventListeners() {
    // Cancel Button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (this.confirmNavigation()) {
          window.location.href = `profile.html?id=${this.currentEmployeeId}`;
        }
      });
    }

    // Form Submit
    const employeeForm = document.getElementById('employeeForm');
    if (employeeForm) {
      employeeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (this.validateForm()) {
          await this.submitForm();
        }
      });
    }

    // Profile Photo Upload
    const profilePhoto = document.getElementById('profilePhoto');
    const uploadBox = document.getElementById('uploadBox');
    const removePhoto = document.getElementById('removePhoto');

    if (profilePhoto && uploadBox) {
      uploadBox.addEventListener('click', () => profilePhoto.click());
      uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.style.borderColor = 'var(--primary-color)';
        uploadBox.style.backgroundColor = '#f0f8ff';
      });
      uploadBox.addEventListener('dragleave', () => {
        uploadBox.style.borderColor = '#ddd';
        uploadBox.style.backgroundColor = '#fafafa';
      });
      uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.style.borderColor = '#ddd';
        uploadBox.style.backgroundColor = '#fafafa';
        if (e.dataTransfer.files.length) {
          profilePhoto.files = e.dataTransfer.files;
          this.handlePhotoUpload();
        }
      });
      profilePhoto.addEventListener('change', () => this.handlePhotoUpload());
    }

    if (removePhoto) {
      removePhoto.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('profilePhoto').value = '';
        document.getElementById('uploadBox').style.display = 'block';
        document.getElementById('photoPreview').style.display = 'none';
      });
    }

    // Documents Upload
    const documentsInput = document.getElementById('documentsInput');
    const dropZone = document.getElementById('dropZone');

    if (dropZone && documentsInput) {
      dropZone.addEventListener('click', () => documentsInput.click());
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('active');
      });
      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('active');
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('active');
        this.handleDocumentsUpload(e.dataTransfer.files);
      });
      documentsInput.addEventListener('change', () => {
        this.handleDocumentsUpload(documentsInput.files);
      });
    }

    // Modal Success
    const successOkBtn = document.getElementById('successOkBtn');
    if (successOkBtn) {
      successOkBtn.addEventListener('click', () => {
        window.location.href = `profile.html?id=${this.currentEmployeeId}`;
      });
    }

    // Modal Error Close
    const errorModalClose = document.getElementById('errorModalClose');
    if (errorModalClose) {
      errorModalClose.addEventListener('click', () => {
        this.closeModal('errorModal');
      });
    }
  }

  handlePhotoUpload() {
    const file = document.getElementById('profilePhoto').files[0];
    if (file) {
      if (file.size > this.maxFileSize) {
        this.showError('File size exceeds 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const previewImage = document.getElementById('previewImage');
        const uploadBox = document.getElementById('uploadBox');
        const photoPreview = document.getElementById('photoPreview');

        if (previewImage) previewImage.src = e.target.result;
        if (uploadBox) uploadBox.style.display = 'none';
        if (photoPreview) photoPreview.style.display = 'block';

        this.selectedPhotoBase64 = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  handleDocumentsUpload(files) {
  Array.from(files).forEach(file => {
    if (file.size > this.maxFileSize) {
      this.showError(`File ${file.name} exceeds 10MB`);
      return;
    }

    if (!this.selectedDocumentsBase64.find(d => d.name === file.name)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedDocumentsBase64.push({
          name: file.name,
          size: file.size,
          type: file.type,
          data: e.target.result,
          uploadedAt: new Date().toISOString()
        });
        this.renderDocumentsList();
      };
      reader.readAsDataURL(file);
    }
  });
}

  renderDocumentsList() {
  const documentsList = document.getElementById('documentsList');
  if (!documentsList) return;

  documentsList.innerHTML = '';
  this.selectedDocumentsBase64.forEach((doc, index) => {
    const item = document.createElement('div');
    item.className = 'document-item';
    
    let icon = 'fa-file';
    if (doc.type.includes('pdf')) icon = 'fa-file-pdf';
    else if (doc.type.includes('word')) icon = 'fa-file-word';
    else if (doc.type.includes('image')) icon = 'fa-file-image';

    item.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${doc.name} (${(doc.size / 1024).toFixed(2)} KB)</span>
      <button type="button" class="btn-remove-document" data-index="${index}">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;

    const removeBtn = item.querySelector('.btn-remove-document');
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.selectedDocumentsBase64.splice(index, 1);
      this.renderDocumentsList();
    });

    documentsList.appendChild(item);
  });
}
      

  validateForm() {
    const fields = [
      { id: 'fullName', errorId: 'fullNameError', message: 'Full name is required' },
      { id: 'emailAddress', errorId: 'emailError', message: 'Valid email is required', type: 'email' },
      { id: 'phoneNumber', errorId: 'phoneError', message: 'Phone number is required' },
      { id: 'dateOfBirth', errorId: 'dobError', message: 'Date of birth is required' },
      { id: 'address', errorId: 'addressError', message: 'Address is required' },
      { id: 'dateOfJoining', errorId: 'joiningError', message: 'Date of joining is required' },
      { id: 'role', errorId: 'roleError', message: 'Role is required' },
      { id: 'department', errorId: 'deptError', message: 'Department is required' },
      { id: 'employmentType', errorId: 'typeError', message: 'Employment type is required' },
      { id: 'salary', errorId: 'salaryError', message: 'Salary is required' }
    ];

    let isValid = true;

    fields.forEach(field => {
      const input = document.getElementById(field.id);
      const errorElement = document.getElementById(field.errorId);
      const value = input?.value?.trim() || '';

      let error = false;

      if (!value) {
        error = true;
      } else if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          error = true;
        }
      }

      if (error) {
        isValid = false;
        if (input) input.classList.add('error');
        if (errorElement) {
          errorElement.textContent = field.message;
          errorElement.classList.add('show');
        }
      } else {
        if (input) input.classList.remove('error');
        if (errorElement) {
          errorElement.classList.remove('show');
        }
      }
    });

     const phoneInput = document.getElementById('phoneNumber');
  const phoneError = document.getElementById('phoneError');
  const phoneValue = phoneInput?.value?.trim() || '';
  const phoneValidationError = this.validatePhone(phoneValue);  // this.validatePhone
  if (phoneValidationError) {
    isValid = false;
    if (phoneInput) phoneInput.classList.add('error');
    if (phoneError) {
      phoneError.textContent = phoneValidationError;
      phoneError.classList.add('show');
    }
  }
 
    // Emergency Contact Phone validation (optional)
  const empPhoneInput = document.getElementById('emergencyContactPhone');
  const empPhoneError = document.getElementById('emergencyPhoneError');
  const empPhoneValue = empPhoneInput?.value?.trim() || '';
  const empPhoneValidationError = this.validateEmergencyPhone(empPhoneValue);
  if (empPhoneValidationError) {
    isValid = false;
    if (empPhoneInput) empPhoneInput.classList.add('error');
    if (empPhoneError) {
      empPhoneError.textContent = empPhoneValidationError;
      empPhoneError.classList.add('show');
    }
  }

  // DATE OF JOINING VALIDATION 
  const dojInput = document.getElementById('dateOfJoining');
  const dojError = document.getElementById('joiningError');
  const dojValue = dojInput?.value || '';
  const dojValidationError = this.validateDateOfJoining(dojValue);  //  this.validateDateOfJoining
  if (dojValidationError) {
    isValid = false;
    if (dojInput) dojInput.classList.add('error');
    if (dojError) {
      dojError.textContent = dojValidationError;
      dojError.classList.add('show');
    }
  }
  // NIC validation
const nicInput = document.getElementById('nicNumber');
const nicError = document.getElementById('nicError');
const nicValue = nicInput?.value || '';
const nicValidationError = this.validateNIC(nicValue);
if (nicValidationError) {
  isValid = false;
  if (nicInput) nicInput.classList.add('error');
  if (nicError) {
    nicError.textContent = nicValidationError;
    nicError.classList.add('show');
  }
}

    return isValid;

    
  }

  async submitForm() {
    try {
      const formData = {
        name: document.getElementById('fullName').value,
        email: document.getElementById('emailAddress').value,
        phone: document.getElementById('phoneNumber').value,
        dateOfBirth: document.getElementById('dateOfBirth').value,
        address: document.getElementById('address').value,
        dateOfJoining: document.getElementById('dateOfJoining').value,
        role: document.getElementById('role').value,
        department: document.getElementById('department').value,
        employmentType: document.getElementById('employmentType').value,
        salary: parseFloat(document.getElementById('salary').value),
        status: document.querySelector('input[name="status"]:checked').value,
        contact: document.getElementById('phoneNumber').value,
        photo: this.selectedPhotoBase64 || null,
        documents: this.selectedDocumentsBase64,
        updatedAt: new Date().toISOString(),
        bankName: document.getElementById('bankName')?.value || '',
        bankAccountNo: document.getElementById('bankAccountNo')?.value || '',
        nicNumber: document.getElementById('nicNumber')?.value || '',
        emergencyContactName: document.getElementById('emergencyContactName')?.value || '',
        emergencyContactPhone: document.getElementById('emergencyContactPhone')?.value || '',
      };

      // Update in Firebase
      if (this.currentFirebaseId) {
        await updateDoc(doc(db, "employees", this.currentFirebaseId), formData);
        console.log('Employee updated successfully');
      }

      // Show success modal
      this.closeModal('errorModal');
      this.showModal('successModal');
    } catch (error) {
      console.error("Error updating employee:", error);
      this.showError('Error updating employee: ' + error.message);
    }
  }

  confirmNavigation() {
    const formData = {
      fullName: document.getElementById('fullName').value,
      emailAddress: document.getElementById('emailAddress').value,
      phoneNumber: document.getElementById('phoneNumber').value,
      dateOfBirth: document.getElementById('dateOfBirth').value,
      address: document.getElementById('address').value,
      dateOfJoining: document.getElementById('dateOfJoining').value,
      role: document.getElementById('role').value,
      department: document.getElementById('department').value,
      employmentType: document.getElementById('employmentType').value,
      salary: document.getElementById('salary').value,
      status: document.querySelector('input[name="status"]:checked').value
    };

    const hasChanges = Object.values(formData).some(val => val !== '');
    if (hasChanges) {
      return confirm('You have unsaved changes. Do you want to leave?');
    }
    return true;
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
  }

  showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
    this.showModal('errorModal');
  }
}
