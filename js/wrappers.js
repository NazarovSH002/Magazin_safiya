// === ГЛОБАЛЬНЫЕ ОБЕРТКИ ДЛЯ МОДУЛЕЙ ===
// Эти функции вызываются из HTML через onclick

// Stock module wrappers
window.calculateTarget = function () {
    if (window.StockModule) {
        window.StockModule.calculateTarget();
    }
};

window.addOrUpdateProduct = function () {
    if (window.StockModule) {
        window.StockModule.addOrUpdateProduct();
    }
};

window.clearStockForm = function () {
    if (window.StockModule) {
        window.StockModule.clearStockForm();
    }
};

window.toggleAllCheckboxes = function (checked) {
    if (window.StockModule) {
        window.StockModule.toggleAllCheckboxes(checked);
    }
};

window.bulkDelete = function () {
    if (window.StockModule) {
        window.StockModule.bulkDelete();
    }
};

window.downloadTemplate = function () {
    if (window.StockModule) {
        window.StockModule.downloadTemplate();
    }
};

window.importCSV = function (event) {
    if (window.StockModule) {
        window.StockModule.importCSV(event);
    }
};

// Users module wrappers
window.openUserModal = function () {
    if (window.UsersModule) {
        window.UsersModule.openUserModal();
    }
};

window.closeUserModal = function () {
    if (window.UsersModule) {
        window.UsersModule.closeUserModal();
    }
};

window.saveUser = function () {
    if (window.UsersModule) {
        window.UsersModule.saveUser();
    }
};
