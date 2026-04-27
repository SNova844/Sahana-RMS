// Employee Analytics Report Module
import { db } from './firebase-config.js';
import { collection, getDocs, query } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

export class EmployeeAnalytics {
  constructor() {
    this.employees = [];
    this.charts = {};
  }

  async loadEmployees() {
    try {
      const q = query(collection(db, 'employees'));
      const querySnapshot = await getDocs(q);
      this.employees = [];
      querySnapshot.forEach((doc) => {
        this.employees.push({ firebaseId: doc.id, ...doc.data() });
      });
      return this.employees;
    } catch (error) {
      console.error('Error loading employees for analytics:', error);
      return [];
    }
  }

  filterByPeriod(employees, period) {
    if (period === 'all') return employees;
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch(period) {
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return employees;
    }
    
    return employees.filter(emp => {
      if (!emp.dateOfJoining) return true;
      const joinDate = new Date(emp.dateOfJoining);
      return joinDate >= cutoffDate;
    });
  }

  filterByDepartment(employees, department) {
    if (department === 'all') return employees;
    return employees.filter(emp => emp.department === department);
  }

  getDepartmentData(employees) {
    const deptMap = new Map();
    employees.forEach(emp => {
      const dept = emp.department || 'Unassigned';
      deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
    });
    return {
      labels: Array.from(deptMap.keys()),
      data: Array.from(deptMap.values())
    };
  }

  getRoleData(employees) {
    const roleMap = new Map();
    employees.forEach(emp => {
      const role = emp.role || 'Unassigned';
      roleMap.set(role, (roleMap.get(role) || 0) + 1);
    });
    // Sort by count descending and take top 8
    const sorted = Array.from(roleMap.entries()).sort((a, b) => b[1] - a[1]);
    const topRoles = sorted.slice(0, 8);
    return {
      labels: topRoles.map(r => r[0]),
      data: topRoles.map(r => r[1])
    };
  }

  getSalaryByDepartment(employees) {
    const deptSalaryMap = new Map();
    employees.forEach(emp => {
      const dept = emp.department || 'Unassigned';
      const salary = emp.salary || 0;
      const current = deptSalaryMap.get(dept) || { total: 0, count: 0 };
      current.total += salary;
      current.count += 1;
      deptSalaryMap.set(dept, current);
    });
    
    const labels = [];
    const data = [];
    deptSalaryMap.forEach((value, key) => {
      labels.push(key);
      data.push(Math.round(value.total / value.count));
    });
    
    return { labels, data };
  }

  getEmploymentTypeData(employees) {
    const typeMap = new Map();
    employees.forEach(emp => {
      const type = emp.employmentType || 'Unassigned';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });
    return {
      labels: Array.from(typeMap.keys()).map(t => t.charAt(0).toUpperCase() + t.slice(1)),
      data: Array.from(typeMap.values())
    };
  }

  getSummaryStats(employees) {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'active').length;
    const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;
    const totalSalary = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
    const avgSalary = total > 0 ? totalSalary / total : 0;
    
    return {
      total,
      activeRate,
      totalSalary,
      avgSalary
    };
  }

  getDetailedTableData(employees) {
    return employees.map(emp => ({
      id: emp.id || '-',
      name: emp.name || '-',
      department: emp.department || '-',
      role: emp.role || '-',
      employmentType: emp.employmentType || '-',
      status: emp.status || 'inactive',
      salary: emp.salary || 0,
      joinedDate: emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString() : '-'
    }));
  }

  destroyCharts() {
    Object.values(this.charts).forEach(chart => {
      if (chart) chart.destroy();
    });
    this.charts = {};
  }

  createDeptPieChart(labels, data) {
    const ctx = document.getElementById('deptPieChart').getContext('2d');
    this.charts.deptPie = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#4a90e2', '#27ae60', '#e74c3c', '#f39c12', 
            '#8e44ad', '#1abc9c', '#e67e22', '#2c3e50'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  createRoleBarChart(labels, data) {
    const ctx = document.getElementById('roleBarChart').getContext('2d');
    this.charts.roleBar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Number of Employees',
          data: data,
          backgroundColor: '#4a90e2',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${ctx.raw} employees` } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Count' } },
          x: { ticks: { rotate: 45, maxRotation: 45, minRotation: 45, font: { size: 10 } } }
        }
      }
    });
  }

  createSalaryBarChart(labels, data) {
    const ctx = document.getElementById('salaryBarChart').getContext('2d');
    this.charts.salaryBar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Average Monthly Salary (LKR)',
          data: data,
          backgroundColor: '#27ae60',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          tooltip: { callbacks: { label: (ctx) => `LKR ${ctx.raw.toLocaleString()}` } }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Salary (LKR)' } },
          x: { ticks: { rotate: 45, maxRotation: 45, minRotation: 45, font: { size: 10 } } }
        }
      }
    });
  }

  createEmploymentDoughnutChart(labels, data) {
    const ctx = document.getElementById('employmentDoughnutChart').getContext('2d');
    this.charts.employmentDoughnut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: ['#4a90e2', '#27ae60', '#f39c12', '#e74c3c', '#8e44ad'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 } } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} employees` } }
        }
      }
    });
  }

  renderTable(data) {
    const tbody = document.getElementById('analyticsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = data.map(item => `
      <tr>
        <td>${item.id}</td>
        <td>${item.name}</td>
        <td>${item.department}</td>
        <td>${item.role}</td>
        <td>${item.employmentType}</td>
        <td><span class="status-badge ${item.status}">${item.status}</span></td>
        <td>LKR ${item.salary.toLocaleString()}</td>
        <td>${item.joinedDate}</td>
      </tr>
    `).join('');
  }

  updateSummaryCards(stats) {
    const totalEl = document.getElementById('analyticsTotal');
    const rateEl = document.getElementById('analyticsActiveRate');
    const totalSalaryEl = document.getElementById('analyticsTotalSalary');
    const avgSalaryEl = document.getElementById('analyticsAvgSalary');
    
    if (totalEl) totalEl.textContent = stats.total;
    if (rateEl) rateEl.textContent = `${stats.activeRate}%`;
    if (totalSalaryEl) totalSalaryEl.textContent = `LKR ${stats.totalSalary.toLocaleString()}`;
    if (avgSalaryEl) avgSalaryEl.textContent = `LKR ${Math.round(stats.avgSalary).toLocaleString()}`;
  }

  async refreshReport() {
    const period = document.getElementById('reportPeriod')?.value || 'all';
    const department = document.getElementById('deptFilter')?.value || 'all';
    
    // Show loading state
    const refreshBtn = document.getElementById('refreshReportBtn');
    const originalText = refreshBtn?.innerHTML;
    if (refreshBtn) refreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
    
    await this.loadEmployees();
    let filtered = this.filterByPeriod(this.employees, period);
    filtered = this.filterByDepartment(filtered, department);
    
    // Destroy existing charts
    this.destroyCharts();
    
    // Create new charts
    const deptData = this.getDepartmentData(filtered);
    if (deptData.labels.length > 0) {
      this.createDeptPieChart(deptData.labels, deptData.data);
    }
    
    const roleData = this.getRoleData(filtered);
    if (roleData.labels.length > 0) {
      this.createRoleBarChart(roleData.labels, roleData.data);
    }
    
    const salaryData = this.getSalaryByDepartment(filtered);
    if (salaryData.labels.length > 0) {
      this.createSalaryBarChart(salaryData.labels, salaryData.data);
    }
    
    const empTypeData = this.getEmploymentTypeData(filtered);
    if (empTypeData.labels.length > 0) {
      this.createEmploymentDoughnutChart(empTypeData.labels, empTypeData.data);
    }
    
    // Update summary and table
    const stats = this.getSummaryStats(filtered);
    this.updateSummaryCards(stats);
    
    const tableData = this.getDetailedTableData(filtered);
    this.renderTable(tableData);
    
    if (refreshBtn) refreshBtn.innerHTML = originalText;
  }
  
async exportToPDF() {
  await this.refreshReport();
  await new Promise(r => setTimeout(r, 1000));
  
  const total = document.getElementById('analyticsTotal')?.textContent || '0';
  const activeRate = document.getElementById('analyticsActiveRate')?.textContent || '0%';
  const totalSalary = document.getElementById('analyticsTotalSalary')?.textContent || 'LKR 0';
  const avgSalary = document.getElementById('analyticsAvgSalary')?.textContent || 'LKR 0';
  const period = document.getElementById('reportPeriod')?.options[document.getElementById('reportPeriod')?.selectedIndex]?.text || 'All Time';
  
  const tableElement = document.getElementById('analyticsTable');
  const tableClone = tableElement ? tableElement.cloneNode(true) : null;
  
  const deptCanvas = document.getElementById('deptPieChart');
  const roleCanvas = document.getElementById('roleBarChart');
  const salaryCanvas = document.getElementById('salaryBarChart');
  const empCanvas = document.getElementById('employmentDoughnutChart');
  
  let deptImage = '', roleImage = '', salaryImage = '', empImage = '';
  if (deptCanvas) deptImage = deptCanvas.toDataURL();
  if (roleCanvas) roleImage = roleCanvas.toDataURL();
  if (salaryCanvas) salaryImage = salaryCanvas.toDataURL();
  if (empCanvas) empImage = empCanvas.toDataURL();
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Employee Analytics Report</title>
      <meta charset="UTF-8">
      <link rel="stylesheet" href="./css/pdf-export.css">
    </head>
    <body>
      <div class="pdf-report">
        <div class="header">
          <h1>Sahana Urban - Employee Analytics Report</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>Period: ${period}</p>
        </div>
        <div class="summary-grid">
          <div class="summary-item"><span>Total Employees</span><h3>${total}</h3></div>
          <div class="summary-item"><span>Active Rate</span><h3>${activeRate}</h3></div>
          <div class="summary-item"><span>Total Monthly Salary</span><h3>${totalSalary}</h3></div>
          <div class="summary-item"><span>Avg Salary</span><h3>${avgSalary}</h3></div>
        </div>
        <div class="charts-grid">
          <div class="chart-card"><h4>Department Distribution</h4><img src="${deptImage}"></div>
          <div class="chart-card"><h4>Role Distribution</h4><img src="${roleImage}"></div>
          <div class="chart-card"><h4>Salary by Department</h4><img src="${salaryImage}"></div>
          <div class="chart-card"><h4>Employment Type</h4><img src="${empImage}"></div>
        </div>
        <div class="table-wrapper">
          <h3>Detailed Employee Data</h3>
          ${tableClone ? tableClone.outerHTML : '<p>No data available</p>'}
        </div>
        <div class="footer"><p>Sahana Restaurant Management System - Confidential Report</p></div>
      </div>
    </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.print();
}
    
        

  initialize() {
    this.refreshReport();
    
    // Set up event listeners
    const refreshBtn = document.getElementById('refreshReportBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshReport());
    
    const exportBtn = document.getElementById('exportPdfBtn');
    if (exportBtn) exportBtn.addEventListener('click', () => this.exportToPDF());
    
    const periodSelect = document.getElementById('reportPeriod');
    if (periodSelect) periodSelect.addEventListener('change', () => this.refreshReport());
    
    const deptSelect = document.getElementById('deptFilter');
    if (deptSelect) deptSelect.addEventListener('change', () => this.refreshReport());
  }
}