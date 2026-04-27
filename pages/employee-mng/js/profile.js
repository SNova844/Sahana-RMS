import { db } from './firebase-config.js';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

export class ProfilePage {
  constructor() {
    this.employeeId = null;
    this.employee = null;
  }

  async initialize() {
    const urlParams = new URLSearchParams(window.location.search);
    this.employeeId = urlParams.get('id');

    if (!this.employeeId) {
      window.location.href = 'list.html';
      return;
    }

    await this.loadEmployee();
    this.setupEventListeners();
  }

  async loadEmployee() {
    try {
      const q = query(collection(db, 'employees'), where('id', '==', this.employeeId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.warn('Employee not found:', this.employeeId);
        this.showErrorView('Employee not found');
        return;
      }

      const docSnapshot = querySnapshot.docs[0];
      this.employee = { firebaseId: docSnapshot.id, ...docSnapshot.data() };
      this.renderEmployee();
    } catch (error) {
      console.error('Failed to load employee:', error);
      this.showErrorView('Failed to load employee data');
    }
  }

  renderEmployee() {

   
  try {
    const emp = this.employee;
    // ... rest of your code
  } catch (error) {
    console.error('Render error:', error);
  
}
    const emp = this.employee;
        console.log('=== EMPLOYEE DATA ===');
    console.log('Bank Name:', emp.bankName);
    console.log('Bank Account:', emp.bankAccountNo);
    console.log('NIC:', emp.nicNumber);
    console.log('Emergency Name:', emp.emergencyContactName);
    console.log('Emergency Phone:', emp.emergencyContactPhone);
    console.log('Date of Joining:', emp.dateOfJoining);
    if (!emp) return;

    const avatar = document.getElementById('profileAvatar');
const avatarInitials = document.getElementById('avatarInitials');

// Check if employee has a photo (base64)
if (emp.photo && avatar) {
  avatar.innerHTML = '';
  const img = document.createElement('img');
  img.src = emp.photo;
  img.alt = emp.name || 'Employee Photo';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  avatar.appendChild(img);
} else if (avatarInitials) {
  const initials = (emp.name || 'E').split(' ').map(p => p[0]).join('').toUpperCase();
  avatarInitials.textContent = initials || 'E';
}

    document.getElementById('employeeName').textContent = emp.name || '-';
    document.getElementById('employeeRole').textContent = `${emp.role || '-'} | ${emp.department || '-'}`;
    document.getElementById('employeeId').textContent = `Employee ID: ${emp.id || '-'}`;

    document.getElementById('summaryId').textContent = emp.id || '-';
    document.getElementById('summaryDept').textContent = emp.department || '-';
    document.getElementById('summaryRole').textContent = emp.role || '-';
    document.getElementById('summaryType').textContent = emp.employmentType ? this.capitalize(emp.employmentType) : '-';
    document.getElementById('summaryJoined').textContent = emp.dateOfJoining ? this.formatDate(emp.dateOfJoining) : '-';
    document.getElementById('summaryStatus').textContent = emp.status ? this.capitalize(emp.status) : '-';
    document.getElementById('summaryDob').textContent = emp.dateOfBirth ? this.formatDate(emp.dateOfBirth) : '-';

    document.getElementById('contactEmail').textContent = emp.email || '-';
    document.getElementById('contactPhone').textContent = emp.phone || emp.contact || '-';
    document.getElementById('contactAddress').textContent = emp.address || '-';
    document.getElementById('contactCity').textContent = emp.address ? this.extractCity(emp.address) : '-';

    document.getElementById('detailEmployeeId').textContent = emp.id || '-';
    document.getElementById('detailDob').textContent = emp.dateOfBirth ? this.formatDate(emp.dateOfBirth) : '-';
    document.getElementById('detailJoining').textContent = emp.dateOfJoining ? this.formatDate(emp.dateOfJoining) : '-';
    document.getElementById('detailType').textContent = emp.employmentType ? this.capitalize(emp.employmentType) : '-';
    document.getElementById('detailStatus').textContent = emp.status ? this.capitalize(emp.status) : '-';

    document.getElementById('detailName').textContent = emp.name || '-';
    document.getElementById('detailEmail').textContent = emp.email || '-';
    document.getElementById('detailPhone').textContent = emp.phone || emp.contact || '-';
    document.getElementById('detailAddress').textContent = emp.address || '-';
    document.getElementById('detailSalary').textContent = emp.salary != null ? `LKR ${this.formatCurrency(emp.salary)}` : '-';

    // Base Salary - element may not exist
const baseSalaryElem = document.getElementById('baseSalary');
if (baseSalaryElem) {
  baseSalaryElem.textContent = emp.salary != null ? `LKR ${this.formatCurrency(emp.salary)}` : 'LKR 0.00';
}

// Total Monthly - element may not exist
const totalMonthlyElem = document.getElementById('totalMonthly');
if (totalMonthlyElem) {
  totalMonthlyElem.textContent = emp.salary != null ? `LKR ${this.formatCurrency(emp.salary)}` : 'LKR 0.00';
}

        // Bank Information - MOVE THIS BEFORE renderDocuments
    const bankNameElem = document.getElementById('bankName');
    const bankAccountElem = document.getElementById('bankAccountNo');
    const emergencyContactElem = document.getElementById('emergencyContact');
    const nicNumberElem = document.getElementById('nicNumber');
    
    if (bankNameElem) bankNameElem.textContent = emp.bankName || 'Not provided';
    if (bankAccountElem) bankAccountElem.textContent = emp.bankAccountNo || 'Not provided';
    if (emergencyContactElem) emergencyContactElem.textContent = emp.emergencyContactName ? `${emp.emergencyContactName} (${emp.emergencyContactPhone})` : 'Not provided';
    if (nicNumberElem) nicNumberElem.textContent = emp.nicNumber || 'Not provided';

    // Calculate Experience
    if (emp.dateOfJoining) {
      const joinDate = new Date(emp.dateOfJoining);
      const today = new Date();
      let years = today.getFullYear() - joinDate.getFullYear();
      let months = today.getMonth() - joinDate.getMonth();
      if (months < 0) { years--; months += 12; }
      let expText = '';
      if (years > 0) expText += `${years} year${years > 1 ? 's' : ''} `;
      if (months > 0) expText += `${months} month${months > 1 ? 's' : ''}`;
      if (expText === '') expText = 'Less than 1 month';
      
      const totalExpElem = document.getElementById('totalExperience');
      const joinedDateExpElem = document.getElementById('joinedDateExp');
      if (totalExpElem) totalExpElem.textContent = expText;
      if (joinedDateExpElem) joinedDateExpElem.textContent = this.formatDate(emp.dateOfJoining);
    }

    
    this.renderDocuments(emp);

      
   

    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('profileContent').style.display = 'flex';
  }


  setupEventListeners() {
    document.getElementById('editBtn')?.addEventListener('click', () => {
      window.location.href = `edit.html?id=${this.employeeId}`;
    });

    document.getElementById('deleteBtn')?.addEventListener('click', () => this.showModal('deleteModal'));

    document.getElementById('deleteConfirmBtn')?.addEventListener('click', async () => {
      try {
        if (this.employee && this.employee.firebaseId) {
          await deleteDoc(doc(db, 'employees', this.employee.firebaseId));
        }
        window.location.href = 'list.html';
      } catch (error) {
        console.error('Delete failed', error);
      }
    });

    document.getElementById('deleteCancelBtn')?.addEventListener('click', () => this.closeModal('deleteModal'));
    document.getElementById('deleteModalClose')?.addEventListener('click', () => this.closeModal('deleteModal'));

  
  }

  

 renderDocuments(emp) {
  const documentsGrid = document.getElementById('documentsGrid');
  if (!documentsGrid) return;

  // Get documents from employee data
  const documents = (emp.documents && Array.isArray(emp.documents)) ? emp.documents : [];

  console.log('Documents to render:', documents);

  if (documents.length === 0) {
    documentsGrid.innerHTML = '<p class="no-documents" style="text-align: center; padding: 40px; color: #999;">No documents uploaded</p>';
    return;
  }

  documentsGrid.innerHTML = documents.map((doc, index) => {
    let icon = 'fa-file';
    if (doc.type) {
      if (doc.type.includes('pdf')) icon = 'fa-file-pdf';
      else if (doc.type.includes('word')) icon = 'fa-file-word';
      else if (doc.type.includes('image')) icon = 'fa-file-image';
    }

    return `
      <div class="document-card">
        <i class="fa-solid ${icon}"></i>
        <div class="name">${doc.name || 'Document'}</div>
        <div class="actions">
          <button class="btn-download" data-index="${index}" title="Download">
            <i class="fa-solid fa-download"></i> Download
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Add download event listeners
  documentsGrid.querySelectorAll('.btn-download').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(btn.dataset.index);
      const doc = documents[index];
      if (doc && doc.data) {
        const link = document.createElement('a');
        link.href = doc.data;
        link.download = doc.name;
        link.click();
      }
    });
  });
}

   


  showModal(id) { document.getElementById(id)?.classList.add('show'); }
  closeModal(id) { document.getElementById(id)?.classList.remove('show'); }
  showErrorView(message) { document.getElementById('loadingState').querySelector('p').textContent = message; }
  formatDate(dateString) { return new Date(dateString).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }); }
  formatCurrency(amount) { return parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  extractCity(address) {
    const cities = ['Colombo','Kandy','Galle','Matara','Jaffna','Trincomalee','Batticaloa','Ambalantota'];
    return cities.find(city => address.includes(city)) || '-';
  }
  capitalize(text) { return text ? text.charAt(0).toUpperCase() + text.slice(1) : '-'; }
}
