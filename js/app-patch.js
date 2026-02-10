// === ФИНАЛЬНЫЙ ПАТЧ СИСТЕМЫ ===
// Гарантирует правильный порядок: Шаблон HTML -> JS Модуль -> Отрисовка

const originalSwitchTab = window.switchTab;

window.switchTab = async function (viewId) {
    console.log(`🚀 Переключение на: ${viewId}`);

    // 1. Сначала загружаем HTML шаблон если его еще нет
    if (window.loadViewTemplate) {
        await window.loadViewTemplate(viewId);
    }

    // 2. Вызываем оригинальную логику переключения (подсветка табов и т.д.)
    if (originalSwitchTab) {
        originalSwitchTab(viewId);
    }

    // 3. Дополнительная инициализация для специфичных модулей
    if (viewId === 'dashboard' && window.DashboardModule) {
        window.DashboardModule.renderDashboard();
    }

    if (viewId === 'stock' && window.StockModule) {
        window.StockModule.renderStock();
    }

    if (viewId === 'shop' && window.StockModule) {
        window.StockModule.renderShopInventory();
    }

    if (viewId === 'retail' && window.TradeModule) {
        window.renderRetailList();
        window.renderDailySales();
    }

    if (viewId === 'wholesale' && window.TradeModule) {
        window.renderWholesaleList();
    }

    if (viewId === 'debts' && window.HistoryModule) {
        const m = await window.loadModule('history');
        if (m) m.renderDebts();
    }

    if (viewId === 'installments' && window.HistoryModule) {
        const m = await window.loadModule('history');
        if (m) m.renderInstallments();
    }

    if (viewId === 'history' && window.HistoryModule) {
        const m = await window.loadModule('history');
        if (m) m.renderHistory();
    }

    if (viewId === 'users' && window.UsersModule) {
        window.UsersModule.loadUsers();
    }
};
