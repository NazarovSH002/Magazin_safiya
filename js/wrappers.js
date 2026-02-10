// === ГЛОБАЛЬНЫЕ ОБЕРТКИ ДЛЯ МОДУЛЕЙ ===
// Эти функции вызываются из HTML через onclick

// Helper for dynamic module functions
async function callModuleFn(moduleName, fnName, ...args) {
    const m = await window.loadModule(moduleName);
    if (m && m[fnName]) {
        return m[fnName](...args);
    }
}

// Stock module wrappers
window.calculateTarget = () => callModuleFn('stock', 'calculateTarget');
window.addOrUpdateProduct = () => callModuleFn('stock', 'addOrUpdateProduct');
window.clearStockForm = () => callModuleFn('stock', 'clearStockForm');
window.toggleAllCheckboxes = (checked) => callModuleFn('stock', 'toggleAllCheckboxes', checked);
window.bulkDelete = () => callModuleFn('stock', 'bulkDelete');
window.downloadTemplate = () => callModuleFn('stock', 'downloadTemplate');
window.importCSV = (event) => callModuleFn('stock', 'importCSV', event);
window.renderStock = () => callModuleFn('stock', 'renderStock');
window.renderShopInventory = () => callModuleFn('stock', 'renderShopInventory');
window.printReport = (type) => callModuleFn('history', 'printReport', type); // Migrated to history module

// Users module wrappers
window.openUserModal = () => callModuleFn('users', 'openUserModal');
window.closeUserModal = () => callModuleFn('users', 'closeUserModal');
window.saveUser = () => callModuleFn('users', 'saveUser');

// Trade module wrappers
window.TradeModule = {
    updateCartItem: (id, type, field, value) => callModuleFn('trade', 'updateCartItem', id, type, field, value),
    removeFromCart: (id, type) => callModuleFn('trade', 'removeFromCart', id, type),
    selectRetailDate: (date) => callModuleFn('trade', 'selectRetailDate', date)
};
window.renderRetailList = () => callModuleFn('trade', 'renderRetailList');
window.renderWholesaleList = () => callModuleFn('trade', 'renderWholesaleList');
window.completeSale = (type, isDebt, debtType) => callModuleFn('trade', 'completeSale', type, isDebt, debtType);
window.renderDailySales = () => callModuleFn('trade', 'renderDailySales');

// History module wrappers
window.HistoryModule = {
    settleDebt: (idx) => callModuleFn('history', 'settleDebt', idx),
    payInstallment: (idx) => callModuleFn('history', 'payInstallment', idx),
    printReceipt: (id) => callModuleFn('history', 'printReceipt', id),
    deleteHistory: (id) => callModuleFn('history', 'deleteHistory', id)
};
window.submitPayment = () => callModuleFn('history', 'submitPayment');
window.closePaymentModal = () => callModuleFn('history', 'closePaymentModal');
window.exportHistoryCSV = () => callModuleFn('history', 'exportHistoryCSV');
window.toggleDetails = (id) => callModuleFn('history', 'toggleDetails', id);

// Stats module wrappers
window.renderStats = () => callModuleFn('stats', 'renderStats');
window.addExpense = () => callModuleFn('stats', 'addExpense');
window.deleteExpense = (id) => callModuleFn('stats', 'deleteExpense', id);
