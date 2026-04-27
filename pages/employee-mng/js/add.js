import { EmployeeManagement } from './employee-mng.js';

const manager = new EmployeeManagement();
let selectedDocuments = [];
let selectedPhotoBase64 = null;
let selectedDocumentsBase64 = [];

function validatePhone(phone) {
  if (!phone) return 'Phone number is required';
  if (!/^\d{10}$/.test(phone)) return 'Phone number must be exactly 10 digits';
  if (!phone.startsWith('07')) return 'Phone number must start with 07 (Sri Lankan format)';
  return null;
}

//NIC validations
function validateNIC(nic) {
  if (!nic) return 'NIC number is required';
  
  nic = nic.trim().toUpperCase();
  
  // Old NIC: 9 digits and V
  if (/^\d{9}V$/.test(nic)) {
    return null;
  }
  
  // New NIC: 12 digits
  if (/^\d{12}$/.test(nic)) {
    return null;
  }
  
  return 'Enter valid NIC (9 digits + V or 12 digits)';
}

// Emergency Contact Phone validation
function validateEmergencyPhone(phone) {
  if (!phone) return null; // Optional field - no validation if empty
  if (!/^\d{10}$/.test(phone)) return 'Emergency phone must be exactly 10 digits';
  if (!phone.startsWith('07')) return 'Emergency phone must start with 07 (Sri Lankan format)';
  return null;
}


function validateDateOfJoining(doj) {
  if (!doj) return 'Date of joining is required';
  const joiningDate = new Date(doj);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (joiningDate > today) return 'Date of joining cannot be in the future';
  return null;
}

function generateEmployeeId() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const empId = `EMP-${timestamp}${random}`;
  const employeeIdInput = document.getElementById('employeeId');
  if (employeeIdInput) employeeIdInput.value = empId;
}

function renderDocumentsList() {
  const documentsList = document.getElementById('documentsList');
  if (!documentsList) return;

  documentsList.innerHTML = '';
  selectedDocumentsBase64.forEach((doc, index) => {
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
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        selectedDocumentsBase64.splice(index, 1);
        renderDocumentsList();
      });
    }

    documentsList.appendChild(item);
  });
}

   

function handlePhotoUpload() {
  const profilePhoto = document.getElementById('profilePhoto');
  const file = profilePhoto?.files?.[0];
  if (!file) return;

  if (file.size > manager.maxFileSize) {
    manager.showError('File size exceeds 5MB');
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
    
    // Store the base64 data for saving to Firestore
    selectedPhotoBase64 = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removePhoto() {
  const profilePhoto = document.getElementById('profilePhoto');
  const uploadBox = document.getElementById('uploadBox');
  const photoPreview = document.getElementById('photoPreview');
  
  if (profilePhoto) profilePhoto.value = '';
  if (uploadBox) uploadBox.style.display = 'block';
  if (photoPreview) photoPreview.style.display = 'none';
  
  selectedPhotoBase64 = null;
}

function handleDocumentsUpload(files) {
  if (!files?.length) return;

  Array.from(files).forEach((file) => {
    if (file.size > manager.maxFileSize) {
      manager.showError(`File ${file.name} exceeds 10MB`);
      return;
    }

    if (!selectedDocumentsBase64.find((d) => d.name === file.name)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        selectedDocumentsBase64.push({
          name: file.name,
          size: file.size,
          type: file.type,
          data: e.target.result,
          uploadedAt: new Date().toISOString()
        });
        renderDocumentsList();
      };
      reader.readAsDataURL(file);
    }
  });
}

function validateForm() {
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

  fields.forEach((field) => {
    const input = document.getElementById(field.id);
    const errorElem = document.getElementById(field.errorId);
    const value = input?.value?.trim() || '';

    let hasError = false;
    if (!value) {
      hasError = true;
    } else if (field.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        hasError = true;
      }
    }

    if (hasError) {
      isValid = false;
      if (input) input.classList.add('error');
      if (errorElem) {
        errorElem.textContent = field.message;
        errorElem.classList.add('show');
      }
    } else {
      if (input) input.classList.remove('error');
      if (errorElem) errorElem.classList.remove('show');
    }
  });

  //Phone number validation
   const phoneInput = document.getElementById('phoneNumber');
  const phoneError = document.getElementById('phoneError');
  const phoneValue = phoneInput?.value?.trim() || '';
  const phoneValidationError = validatePhone(phoneValue);
  if (phoneValidationError) {
    isValid = false;
    if (phoneInput) phoneInput.classList.add('error');
    if (phoneError) {
      phoneError.textContent = phoneValidationError;
      phoneError.classList.add('show');
    }
  }

    //  DATE OF JOINING VALIDATION 
  const dojInput = document.getElementById('dateOfJoining');
  const dojError = document.getElementById('joiningError');
  const dojValue = dojInput?.value || '';
  const dojValidationError = validateDateOfJoining(dojValue);
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
const nicValidationError = validateNIC(nicValue);
if (nicValidationError) {
  isValid = false;
  if (nicInput) nicInput.classList.add('error');
  if (nicError) {
    nicError.textContent = nicValidationError;
    nicError.classList.add('show');
  }
}

  // Emergency Contact Phone validation (optional)
  const empPhoneInput = document.getElementById('emergencyContactPhone');
  const empPhoneError = document.getElementById('emergencyPhoneError');
  const empPhoneValue = empPhoneInput?.value?.trim() || '';
  const empPhoneValidationError = validateEmergencyPhone(empPhoneValue);
  if (empPhoneValidationError) {
    isValid = false;
    if (empPhoneInput) empPhoneInput.classList.add('error');
    if (empPhoneError) {
      empPhoneError.textContent = empPhoneValidationError;
      empPhoneError.classList.add('show');
    }
  }

  return isValid;
}

async function submitForm() {
  const formData = {
    id: document.getElementById('employeeId').value,
    name: document.getElementById('fullName').value,
    email: document.getElementById('emailAddress').value,
    phone: document.getElementById('phoneNumber').value,
    dateOfBirth: document.getElementById('dateOfBirth').value,
    address: document.getElementById('address').value,
    dateOfJoining: document.getElementById('dateOfJoining').value,
    role: document.getElementById('role').value,
    department: document.getElementById('department').value,
    employmentType: document.getElementById('employmentType').value,
    salary: parseFloat(document.getElementById('salary').value) || 0,
    status: document.querySelector('input[name="status"]:checked')?.value || 'active',
    contact: document.getElementById('phoneNumber').value,
    photo: selectedPhotoBase64,
    documents: selectedDocumentsBase64,
    createdAt: new Date().toISOString(),
    bankName: document.getElementById('bankName')?.value || '',
    bankAccountNo: document.getElementById('bankAccountNo')?.value || '',
    nicNumber: document.getElementById('nicNumber')?.value || '',
    emergencyContactName: document.getElementById('emergencyContactName')?.value || '',
    emergencyContactPhone: document.getElementById('emergencyContactPhone')?.value || '',
  };

  try {
    await manager.addEmployee(formData);
    manager.closeModal('errorModal');
    manager.showModal('successModal');
  } catch (error) {
    manager.showError('Error saving employee: ' + (error.message || error));
  }
}

function setupEvents() {
  document.getElementById('cancelBtn')?.addEventListener('click', () => {
    if (confirm('Are you sure? Any unsaved changes will be lost.')) {
      window.location.href = 'list.html';
    }
  });

  const employeeForm = document.getElementById('employeeForm');
  if (employeeForm) {
    employeeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (validateForm()) {
        await submitForm();
      }
    });

    
  }

  const profilePhoto = document.getElementById('profilePhoto');
  const uploadBox = document.getElementById('uploadBox');
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
        handlePhotoUpload();
      }
    });

    profilePhoto.addEventListener('change', handlePhotoUpload);
  }

  const removePhotoBtn = document.getElementById('removePhoto');
if (removePhotoBtn) {
  removePhotoBtn.addEventListener('click', removePhoto);
}

  const documentsInput = document.getElementById('documentsInput');
  const dropZone = document.getElementById('dropZone');
  if (dropZone && documentsInput) {
    dropZone.addEventListener('click', () => documentsInput.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('active');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('active'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('active');
      handleDocumentsUpload(e.dataTransfer.files);
    });
    documentsInput.addEventListener('change', () => handleDocumentsUpload(documentsInput.files));
  }

  document.getElementById('successOkBtn')?.addEventListener('click', () => {
    window.location.href = 'list.html';
  });

  document.getElementById('errorModalClose')?.addEventListener('click', () => {
    manager.closeModal('errorModal');
  });

  // Other Bank option handling
const bankSelect = document.getElementById('bankName');
if (bankSelect) {
  bankSelect.addEventListener('change', function() {
    if (this.value === 'Other') {
      const otherBank = prompt('Please enter bank name:');
      if (otherBank) {
        const option = document.createElement('option');
        option.value = otherBank;
        option.textContent = otherBank;
        this.appendChild(option);
        this.value = otherBank;
      } else {
        this.value = '';
      }
    }
  });
}
}

window.addEventListener('DOMContentLoaded', () => {
  generateEmployeeId();
  setupEvents();
});