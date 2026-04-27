// Employee management core (data + utilities) - no page-specific UI logic
import { db } from './firebase-config.js';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

export class EmployeeManagement {
  constructor() {
    this.employees = [];
    this.selectedDocuments = [];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  async getEmployees(onData, onError) {
    try {
      const q = query(collection(db, 'employees'));
      onSnapshot(
        q,
        (querySnapshot) => {
          this.employees = [];
          querySnapshot.forEach((docSnap) => {
            this.employees.push({
              firebaseId: docSnap.id,
              ...docSnap.data()
            });
          });
          onData(this.employees);
        },
        (error) => {
          console.error('Firestore listener error:', error);
          this.loadSampleEmployees();
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error('Error initializing employees:', error);
      this.loadSampleEmployees();
      if (onError) onError(error);
    }
  }

  async addEmployee(employeeData) {
    try {
      const docRef = await addDoc(collection(db, 'employees'), employeeData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  }

  async deleteEmployeeById(employeeId) {
    try {
      console.log('Finding employee with id:', employeeId);
      console.log('Employees ids:', this.employees.map(e => e.id));
      const employee = this.employees.find((e) => e.id === employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      if (!employee.firebaseId) {
        throw new Error('Cannot delete employee without Firebase document ID');
      }

      console.log('Deleting document:', employee.firebaseId);
      await deleteDoc(doc(db, 'employees', employee.firebaseId));
      console.log('Document deleted from Firestore');
      return true;
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }

  getEmployeeById(id) {
    return this.employees.find((e) => e.id === id);
  }

  loadSampleEmployees() {
    this.employees = [
      {
        id: 'EMP-001',
        name: 'John Perera',
        role: 'Kitchen Manager',
        department: 'Kitchen',
        contact: '0712345678',
        email: 'john.perera@sahana.lk',
        status: 'active',
        dateOfBirth: '1985-03-15',
        dateOfJoining: '2020-01-10',
        employmentType: 'full-time',
        salary: 75000,
        address: '123 Colombo Road, Kandy',
        phone: '0712345678',
        photo: null
      },
      {
        id: 'EMP-002',
        name: 'Priya Silva',
        role: 'Head Chef',
        department: 'Kitchen',
        contact: '0723456789',
        email: 'priya.silva@sahana.lk',
        status: 'active',
        dateOfBirth: '1990-07-22',
        dateOfJoining: '2019-05-15',
        employmentType: 'full-time',
        salary: 85000,
        address: '456 Galle Road, Colombo',
        phone: '0723456789',
        photo: null
      }
    ];
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
    }
  }

  showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
      errorMessage.textContent = message;
      this.showModal('errorModal');
    }
  }

  showNotification(message, type = 'info') {
    // Simple notification using alert for now
    alert(message);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatCurrency(amount) {
    return parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  extractCity(address) {
    const cities = ['Colombo', 'Kandy', 'Galle', 'Matara', 'Jaffna', 'Trincomalee', 'Batticaloa', 'Ambalantota'];
    for (const city of cities) {
      if (address.includes(city)) return city;
    }
    const parts = address.split(',');
    return parts[parts.length - 1]?.trim() || '-';
  }
}
