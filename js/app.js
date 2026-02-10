// --- ГЛОБАЛЬНОЕ СОСТОЯНИЕ ---
let products = [];
let shopProducts = [];
let sales = [];
let debts = [];
let installments = [];
let retailCart = [];
let wholesaleCart = [];
let editingId = null;
let currentUser = JSON.parse(localStorage.getItem('pro_user')) || null;

// Система ленивой загрузки модулей
const loadedModules = {};
const moduleLoaders = {
    dashboard: () => import('./modules/dashboard.js'),
    stock: () => import('./modules/stock.js'),
    users: () => import('./modules/users.js'),
    trade: () => import('./modules/trade.js'),
    history: () => import('./modules/history.js')
};

async function loadModule(moduleName) {
    if (loadedModules[moduleName]) {
        return loadedModules[moduleName];
    }

    if (moduleLoaders[moduleName]) {
        console.log(`📦 Загрузка модуля: ${moduleName}`);
        const module = await moduleLoaders[moduleName]();
        loadedModules[moduleName] = module;

        // Инициализация модуля если есть функция init
        if (module.init) {
            module.init();
        }

        // Экспортируем функции в глобальную область для onclick
        window[moduleName.charAt(0).toUpperCase() + moduleName.slice(1) + 'Module'] = module;

        return module;
    }

    return null;
}

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : '/api';

// Экспортируем в window для доступа из модулей
window.API_URL = API_URL;
window.currentUser = currentUser;

// Загрузка данных с сервера
async function loadAll() {
    try {
        const response = await fetch(`${API_URL}/load`);
        const data = await response.json();

        products = data.products || [];
        shopProducts = data.shop || [];
        sales = data.sales || [];
        debts = data.debts || [];
        installments = data.installments || [];

        // Инициализация интерфейса после загрузки
        initRates(data.rates);

        // Обновляем текущую активную вкладку
        const activeView = document.querySelector('.view.active');
        if (activeView) {
            const viewId = activeView.id.replace('view-', '');
            switchTab(viewId);
        }

    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        // Резервный вариант: localStorage, если сервер не запущен
        products = JSON.parse(localStorage.getItem('pro_products')) || [];
        shopProducts = JSON.parse(localStorage.getItem('pro_shop')) || [];
        sales = JSON.parse(localStorage.getItem('pro_sales')) || [];
        debts = JSON.parse(localStorage.getItem('pro_debts')) || [];
        installments = JSON.parse(localStorage.getItem('pro_installments')) || [];
        initRates();

        // Обновляем текущую активную вкладку
        const activeView = document.querySelector('.view.active');
        if (activeView) {
            const viewId = activeView.id.replace('view-', '');
            switchTab(viewId);
        }
    }
}

// --- ИНИЦИАЛИЗАЦИЯ КУРСОВ ---
function initRates(rates) {
    const savedRates = rates || JSON.parse(localStorage.getItem('pro_rates')) || { cny: 7.2, uzs: 12850 };
    document.getElementById('rateCNY').value = savedRates.cny;
    document.getElementById('rateUZS').value = savedRates.uzs;
}

function saveRates() {
    const data = {
        cny: parseFloat(document.getElementById('rateCNY').value) || 1,
        uzs: parseFloat(document.getElementById('rateUZS').value) || 0
    };
    localStorage.setItem('pro_rates', JSON.stringify(data));
    saveAll(); // Также сохраняем на сервер
}

async function saveAll() {
    // 1. Сохраняем в localStorage (для подстраховки)
    localStorage.setItem('pro_products', JSON.stringify(products));
    localStorage.setItem('pro_shop', JSON.stringify(shopProducts));
    localStorage.setItem('pro_sales', JSON.stringify(sales));
    localStorage.setItem('pro_debts', JSON.stringify(debts));
    localStorage.setItem('pro_installments', JSON.stringify(installments));

    // 2. Сохраняем в файлы через сервер
    const allData = {
        products,
        shop: shopProducts,
        sales,
        debts,
        installments,
        rates: {
            cny: parseFloat(document.getElementById('rateCNY').value) || 1,
            uzs: parseFloat(document.getElementById('rateUZS').value) || 0
        }
    };

    try {
        await fetch(`${API_URL}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allData)
        });
    } catch (error) {
        console.error('Ошибка при сохранении на сервер:', error);
    }
}

// Запускаем загрузку при старте
window.onload = () => {
    if (currentUser) {
        showApp();
        loadAll();
    }
};

async function handleLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('pro_user', JSON.stringify(currentUser));
            showApp();
            loadAll();
        } else {
            errorEl.innerText = data.error;
            errorEl.style.display = 'block';
        }
    } catch (err) {
        alert('Ошибка подключения к серверу');
    }
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-container').classList.remove('hidden');
    applyRoleLimits();
}

function applyRoleLimits() {
    if (currentUser && currentUser.role === 'seller') {
        // Скрываем вкладки для продавца
        const forbiddenTabs = ['dashboard', 'stock', 'shop', 'history', 'debts', 'installments', 'users'];
        document.querySelectorAll('.tab').forEach(tab => {
            const onclick = tab.getAttribute('onclick') || '';
            if (forbiddenTabs.some(t => onclick.includes(`'${t}'`))) {
                tab.classList.add('hidden');
            }
        });
        // Переключаем на розницу по умолчанию
        switchTab('retail');
    } else if (currentUser && currentUser.role === 'admin') {
        // Админу показываем всё
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('hidden'));
        switchTab('dashboard'); // Сразу переходим на дашборд
    }
}

function logout() {
    localStorage.removeItem('pro_user');
    location.reload();
}

// --- НАВИГАЦИЯ ---
async function switchTab(viewId) {
    console.log(`🚀 Переключение на: ${viewId}`);

    // 1. Загружаем HTML шаблон
    if (window.loadViewTemplate) {
        await window.loadViewTemplate(viewId);
    }

    // 2. Логика переключения классов
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

    const targetView = document.getElementById('view-' + viewId);
    if (targetView) targetView.classList.add('active');

    // Подсветка активной вкладки
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => {
        const onclick = t.getAttribute('onclick');
        if (onclick && onclick.includes(`'${viewId}'`)) {
            t.classList.add('active');
        }
    });

    // 3. Инициализация модулей
    if (viewId === 'dashboard') {
        const m = await loadModule('dashboard');
        if (m && m.renderDashboard) m.renderDashboard();
    }

    if (viewId === 'stock') {
        const m = await loadModule('stock');
        if (m && m.renderStock) m.renderStock();
    }

    if (viewId === 'shop') {
        const m = await loadModule('stock');
        if (m && m.renderShopInventory) m.renderShopInventory();
    }

    if (viewId === 'retail') {
        const m = await loadModule('trade');
        if (m) {
            if (m.renderRetailList) m.renderRetailList();
            if (m.renderDailySales) m.renderDailySales();

            if (document.getElementById('retailDate')) {
                document.getElementById('retailDate').value = new Date().toISOString().split('T')[0];
            }
        }
    }

    if (viewId === 'wholesale') {
        const m = await loadModule('trade');
        if (m && m.renderWholesaleList) m.renderWholesaleList();
    }

    if (viewId === 'debts') {
        const m = await loadModule('history');
        if (m && m.renderDebts) m.renderDebts();
    }

    if (viewId === 'installments') {
        const m = await loadModule('history');
        if (m && m.renderInstallments) m.renderInstallments();
    }

    if (viewId === 'history') {
        const m = await loadModule('history');
        if (m && m.renderHistory) m.renderHistory();
    }

    if (viewId === 'users') {
        const m = await loadModule('users');
        if (m && m.loadUsers) m.loadUsers();
    }
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function format(num) {
    if (num === "" || num === undefined || isNaN(num)) return "0";
    return new Intl.NumberFormat('ru-RU').format(num);
}

function fetchRates() {
    return {
        cny: parseFloat(document.getElementById('rateCNY').value) || 1,
        uzs: parseFloat(document.getElementById('rateUZS').value) || 0
    };
}

// Глобальные функции для HTML onclick (будут переопределены модулями)
window.openUserModal = function () {
    loadModule('users').then(m => m && m.openUserModal && m.openUserModal());
};

window.closeUserModal = function () {
    loadModule('users').then(m => m && m.closeUserModal && m.closeUserModal());
};

window.saveUser = function () {
    loadModule('users').then(m => m && m.saveUser && m.saveUser());
};

window.format = format;
window.fetchRates = fetchRates;
window.loadModule = loadModule;
window.saveAll = saveAll;
window.switchTab = switchTab;
window.handleLogin = handleLogin;
window.logout = logout;
