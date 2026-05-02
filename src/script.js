/**
 * Dashboard de Finances Personnelles
 * JavaScript Pur (Vanilla JS)
 */

// --- State Management ---
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let budgets = JSON.parse(localStorage.getItem('budgets')) || {};
let barChart = null;
let doughnutChart = null;

// --- Category Configuration ---
const categoryIcons = {
    'Nourriture': 'utensils',
    'Transport': 'car',
    'Logement': 'home',
    'Salaire': 'banknote',
    'Loisirs': 'gamepad-2',
    'Santé': 'heart-pulse',
    'Autre': 'help-circle'
};

// --- Elements Selection ---
const transactionList = document.getElementById('transactionList');
const emptyState = document.getElementById('emptyState');
const totalBalanceEl = document.getElementById('totalBalance');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpensesEl = document.getElementById('totalExpenses');
const incomeProgress = document.getElementById('incomeProgress');
const expenseProgress = document.getElementById('expenseProgress');
const categoryFilter = document.getElementById('categoryFilter');
const transactionForm = document.getElementById('transactionForm');
const transactionModal = document.getElementById('transactionModal');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtns = document.querySelectorAll('.closeModal, .modal-overlay, .modal-overlay-budget');
const notification = document.getElementById('notification');
const notifMessage = document.getElementById('notifMessage');
const notifIcon = document.getElementById('notifIcon');

// Budget specific elements
const budgetModal = document.getElementById('budgetModal');
const openBudgetModalBtn = document.getElementById('openBudgetModalBtn');
const closeBudgetModal = document.getElementById('closeBudgetModal');
const budgetForm = document.getElementById('budgetForm');
const budgetInputsContainer = document.getElementById('budgetInputs');
const budgetStatusList = document.getElementById('budgetStatusList');
const alertsContainer = document.getElementById('alertsContainer');
const activeAlertsList = document.getElementById('activeAlertsList');

// Mobile Nav Elements
const sidebar = document.getElementById('sidebar');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const menuIcon = document.getElementById('menuIcon');
const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

// --- Initialization ---
function init() {
    renderTransactions(transactions);
    updateSummary();
    checkBudgets(); // Initial budget check
    initCharts();
    setupEventListeners();
}

// --- Logic functions ---

function setupEventListeners() {
    // Mobile Nav controls
    const toggleMobileMenu = () => {
        const isOpen = !sidebar.classList.contains('-translate-x-full');
        if (isOpen) {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('hidden');
            menuIcon.setAttribute('data-lucide', 'menu');
        } else {
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.remove('hidden');
            menuIcon.setAttribute('data-lucide', 'x');
        }
        lucide.createIcons();
    };

    mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    sidebarOverlay.addEventListener('click', toggleMobileMenu);
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) toggleMobileMenu();
        });
    });
    // Modal controls
    openModalBtn.addEventListener('click', () => {
        transactionModal.classList.remove('hidden');
        updateModalIcon(); // Initial icon update
    });

    // Budget modal
    openBudgetModalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        renderBudgetInputs();
        budgetModal.classList.remove('hidden');
    });

    closeBudgetModal.addEventListener('click', () => {
        budgetModal.classList.add('hidden');
    });

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            transactionModal.classList.add('hidden');
            budgetModal.classList.add('hidden');
        });
    });

    // Budget form submission
    budgetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputs = budgetInputsContainer.querySelectorAll('input');
        inputs.forEach(input => {
            budgets[input.name] = parseFloat(input.value) || 0;
        });
        localStorage.setItem('budgets', JSON.stringify(budgets));
        budgetModal.classList.add('hidden');
        showNotification('Budgets mis à jour !');
        checkBudgets();
    });

    // Category change in modal
    document.getElementById('category').addEventListener('change', updateModalIcon);

    // Form submission
    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const description = document.getElementById('desc').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const type = document.getElementById('type').value;
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;

        const transaction = {
            id: generateID(),
            description,
            amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
            type,
            category,
            date
        };

        addTransaction(transaction);
        checkBudgets(category); // Specific check after adding
        showNotification('Transaction ajoutée avec succès !');
        
        // Reset form and close modal
        transactionForm.reset();
        document.getElementById('date').valueAsDate = new Date();
        transactionModal.classList.add('hidden');
    });

    // Filtering
    categoryFilter.addEventListener('change', (e) => {
        const category = e.target.value;
        const filtered = category === 'all' 
            ? transactions 
            : transactions.filter(t => t.category === category);
        renderTransactions(filtered);
    });

    // Export CSV
    document.getElementById('exportCsv').addEventListener('click', exportToCsv);

    // Dark Mode (Demo - just visual toggle)
    document.getElementById('darkModeToggle').addEventListener('click', () => {
         const isDark = document.body.classList.toggle('bg-slate-900');
         document.body.classList.toggle('text-white');
         
         // Update Chart Colors
         if (barChart && doughnutChart) {
             const textColor = isDark ? '#94a3b8' : '#64748b';
             const gridColor = isDark ? '#334155' : '#f1f5f9';

             barChart.options.scales.x.ticks.color = textColor;
             barChart.options.scales.y.ticks.color = textColor;
             barChart.options.scales.y.grid.color = gridColor;
             
             doughnutChart.options.plugins.legend.labels.color = textColor;

             barChart.update();
             doughnutChart.update();
         }

         showNotification(isDark ? 'Mode sombre activé' : 'Mode sombre désactivé');
    });
}

function generateID() {
    return Math.floor(Math.random() * 100000000);
}

function updateModalIcon() {
    const category = document.getElementById('category').value;
    const iconName = categoryIcons[category] || 'help-circle';
    const iconContainer = document.getElementById('modalCategoryIcon');
    if (iconContainer) {
        iconContainer.innerHTML = `<i data-lucide="${iconName}" class="w-6 h-6 text-indigo-600"></i>`;
        lucide.createIcons();
    }
}

function addTransaction(transaction) {
    transactions.push(transaction);
    saveAndRefresh();
}

function renderBudgetInputs() {
    budgetInputsContainer.innerHTML = '';
    Object.keys(categoryIcons).forEach(cat => {
        // Skip 'Salaire' for budget usually (income)
        if (cat === 'Salaire') return;

        const div = document.createElement('div');
        div.className = 'flex items-center gap-4 p-3 bg-slate-50 rounded-xl';
        
        const iconName = categoryIcons[cat];
        const currentValue = budgets[cat] || 0;

        div.innerHTML = `
            <div class="p-2 bg-white rounded-lg border border-slate-200">
                <i data-lucide="${iconName}" class="w-5 h-5 text-slate-600"></i>
            </div>
            <div class="flex-1">
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">${cat}</label>
                <div class="relative">
                    <input type="number" name="${cat}" value="${currentValue}" placeholder="Pas de limite" class="w-full bg-transparent border-b border-slate-200 focus:border-indigo-600 outline-none py-1 text-slate-900 font-medium">
                    <span class="absolute right-0 bottom-1 text-xs text-slate-400">CFA</span>
                </div>
            </div>
        `;
        budgetInputsContainer.appendChild(div);
    });
    lucide.createIcons();
}

function checkBudgets(specificCategory = null) {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const catsWithBudget = Object.keys(budgets).filter(cat => budgets[cat] > 0);
    
    // Clear status list (unless we have no budgets)
    if (catsWithBudget.length > 0) {
        budgetStatusList.innerHTML = '';
    }

    let activeAlerts = [];

    catsWithBudget.forEach(cat => {
        const threshold = budgets[cat];
        const currentSpending = Math.abs(expenseTransactions
            .filter(t => t.category === cat)
            .reduce((s, t) => s + t.amount, 0));

        const percentage = Math.min((currentSpending / threshold) * 100, 100);
        const isOver = currentSpending >= threshold;
        const isNear = currentSpending >= threshold * 0.8;

        // Update visual status list
        const statusDiv = document.createElement('div');
        statusDiv.className = 'flex flex-col gap-1';
        
        const progressColor = isOver ? 'bg-rose-500' : (isNear ? 'bg-amber-500' : 'bg-indigo-500');
        const textColor = isOver ? 'text-rose-600' : (isNear ? 'text-amber-600' : 'text-slate-600');
        const iconName = categoryIcons[cat] || 'help-circle';

        statusDiv.innerHTML = `
            <div class="flex justify-between items-center text-sm">
                <div class="flex items-center gap-2">
                    <i data-lucide="${iconName}" class="w-4 h-4 text-slate-400"></i>
                    <span class="font-medium text-slate-700">${cat}</span>
                </div>
                <span class="text-xs font-bold ${textColor}">${currentSpending.toLocaleString()} / ${threshold.toLocaleString()} CFA</span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div class="h-full ${progressColor} transition-all duration-1000" style="width: ${percentage}%"></div>
            </div>
        `;
        budgetStatusList.appendChild(statusDiv);

        // Track alerts
        if (isOver) {
            activeAlerts.push({ cat, currentSpending, threshold, type: 'error' });
        } else if (isNear) {
            activeAlerts.push({ cat, currentSpending, threshold, type: 'warning' });
        }
    });

    // Handle alert notifications and container
    renderAlerts(activeAlerts);
    
    // Notifications logic (only for specific change to avoid spamming on load)
    if (specificCategory) {
        const alert = activeAlerts.find(a => a.cat === specificCategory);
        if (alert) {
            if (alert.type === 'error') {
                showNotification(`Attention ! Budget ${alert.cat} dépassé (${alert.currentSpending.toLocaleString()} / ${alert.threshold.toLocaleString()} CFA)`, 'error');
            } else {
                showNotification(`Proche du seuil ! Budget ${alert.cat} à 80%`, 'warning');
            }
        }
    }

    lucide.createIcons();
}

function renderAlerts(alerts) {
    if (alerts.length === 0) {
        alertsContainer.classList.add('hidden');
        return;
    }

    alertsContainer.classList.remove('hidden');
    activeAlertsList.innerHTML = '';

    alerts.forEach(alert => {
        const div = document.createElement('div');
        const isError = alert.type === 'error';
        const bgColor = isError ? 'bg-rose-100' : 'bg-amber-100';
        const textColor = isError ? 'text-rose-700' : 'text-amber-700';
        const icon = isError ? 'alert-circle' : 'alert-triangle';

        div.className = `flex items-center justify-between p-3 rounded-xl ${bgColor} ${textColor} text-sm font-medium`;
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <i data-lucide="${icon}" class="w-4 h-4"></i>
                <span>${alert.cat} : ${isError ? 'Dépassement de budget !' : 'Seuil de 80% atteint.'}</span>
            </div>
            <span>${alert.currentSpending.toLocaleString()} CFA</span>
        `;
        activeAlertsList.appendChild(div);
    });
    
    lucide.createIcons();
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveAndRefresh();
    showNotification('Transaction supprimée', 'error');
}

function saveAndRefresh() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    renderTransactions(transactions);
    updateSummary();
    updateCharts();
}

function updateSummary() {
    const amounts = transactions.map(t => t.amount);
    
    const income = amounts
        .filter(item => item > 0)
        .reduce((acc, item) => (acc += item), 0);

    const expense = amounts
        .filter(item => item < 0)
        .reduce((acc, item) => (acc += item), 0);

    const total = income + expense;

    const formatter = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        minimumFractionDigits: 0
    });

    totalBalanceEl.innerText = formatter.format(total);
    totalIncomeEl.innerText = formatter.format(income);
    totalExpensesEl.innerText = formatter.format(Math.abs(expense));

    // Progress bars updates
    const maxVal = Math.max(income, Math.abs(expense), 1);
    incomeProgress.style.width = `${(income / maxVal) * 100}%`;
    expenseProgress.style.width = `${(Math.abs(expense) / maxVal) * 100}%`;
}

function renderTransactions(dataList) {
    transactionList.innerHTML = '';

    if (dataList.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        
        // Sorting by date descending
        const sorted = [...dataList].sort((a, b) => new Date(b.date) - new Date(a.date));

        sorted.forEach(transaction => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-slate-50 transition-colors group';
            
            const isExpense = transaction.amount < 0;
            const amountClass = isExpense ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold';
            const sign = isExpense ? '-' : '+';
            
            // Get category icon
            const catIcon = categoryIcons[transaction.category] || 'help-circle';
            const iconBg = isExpense ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500';

            row.innerHTML = `
                <td class="px-6 py-4 text-sm text-slate-500">${formatDate(transaction.date)}</td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="p-2 rounded-lg ${iconBg}">
                            <i data-lucide="${catIcon}" class="w-5 h-5"></i>
                        </div>
                        <span class="font-medium text-slate-900">${transaction.description}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        ${transaction.category}
                    </span>
                </td>
                <td class="px-6 py-4 text-right ${amountClass}">
                    ${sign} ${Math.abs(transaction.amount).toLocaleString('fr-FR')} CFA
                </td>
                <td class="px-6 py-4 text-center">
                    <button onclick="deleteTransaction(${transaction.id})" class="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            `;
            transactionList.appendChild(row);
        });
        
        // Icons need to be re-initialized for dynamic content
        lucide.createIcons();
    }
}

function formatDate(dateStr) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('fr-FR', options);
}

// --- Charts Logic ---

function initCharts() {
    const barCtx = document.getElementById('barChart').getContext('2d');
    const doughCtx = document.getElementById('doughnutChart').getContext('2d');

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
            x: { grid: { display: false } }
        }
    };

    barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Féb', 'Mar', 'Avr', 'Mai', 'Juin'],
            datasets: [
                { label: 'Revenus', data: [0, 0, 0, 0, 0, 0], backgroundColor: '#10b981', borderRadius: 8 },
                { label: 'Dépenses', data: [0, 0, 0, 0, 0, 0], backgroundColor: '#f43f5e', borderRadius: 8 }
            ]
        },
        options: chartOptions
    });

    doughnutChart = new Chart(doughCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#6366f1', '#10b981', '#f59e0b', '#ef4444', 
                    '#ec4899', '#8b5cf6', '#06b6d4', '#475569'
                ],
                borderWidth: 0,
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 12, family: "'Inter', sans-serif" }
                    }
                }
            }
        }
    });

    updateCharts();
}

function updateCharts() {
    if (!barChart || !doughnutChart) return;

    // 1. Update Bar Chart (Monthly summary - simplified for demo: categorizes based on type)
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = Math.abs(transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
    
    // In a real app we'd group by actual month, here we show current situation vs target
    barChart.data.datasets[0].data = [0, 0, 0, 0, 0, income];
    barChart.data.datasets[1].data = [0, 0, 0, 0, 0, expense];
    barChart.update();

    // 2. Update Doughnut Chart (Category distribution for expenses)
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const categories = [...new Set(expenseTransactions.map(t => t.category))];
    const categoryData = categories.map(cat => {
        return Math.abs(expenseTransactions
            .filter(t => t.category === cat)
            .reduce((s, t) => s + t.amount, 0));
    });

    doughnutChart.data.labels = categories;
    doughnutChart.data.datasets[0].data = categoryData;
    doughnutChart.update();
}

// --- Utils ---

function showNotification(message, type = 'success') {
    notifMessage.innerText = message;
    if (type === 'error') {
        notifIcon.setAttribute('data-lucide', 'alert-circle');
        notifIcon.classList.remove('text-emerald-400', 'text-amber-400');
        notifIcon.classList.add('text-rose-400');
    } else if (type === 'warning') {
        notifIcon.setAttribute('data-lucide', 'alert-triangle');
        notifIcon.classList.remove('text-emerald-400', 'text-rose-400');
        notifIcon.classList.add('text-amber-400');
    } else {
        notifIcon.setAttribute('data-lucide', 'check-circle-2');
        notifIcon.classList.remove('text-rose-400', 'text-amber-400');
        notifIcon.classList.add('text-emerald-400');
    }
    
    lucide.createIcons();
    
    notification.classList.remove('translate-y-24', 'opacity-0');
    setTimeout(() => {
        notification.classList.add('translate-y-24', 'opacity-0');
    }, 3000);
}

function exportToCsv() {
    if (transactions.length === 0) return showNotification('Pas de données à exporter', 'error');

    const headers = ['Date', 'Description', 'Categorie', 'Montant', 'Type'];
    const rows = transactions.map(t => [
        t.date, 
        t.description, 
        t.category, 
        t.amount, 
        t.type
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_finance_dash_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Export CSV terminé !');
}

// Make functions global for inline onclick
window.deleteTransaction = deleteTransaction;

// Start the app
init();
