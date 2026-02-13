// === МОДУЛЬ: ДАШБОРД ===

export function renderDashboard() {
    // Получаем глобальные данные
    const { products, shopProducts, sales, debts } = window;
    const rates = window.fetchRates();

    // 1. Считаем капитал на складе (в сумах на основе закупа в CNY)
    const stockQty = products.reduce((sum, p) => sum + p.qty, 0);
    const stockValue = products.reduce((sum, p) => sum + (p.qty * window.getCostUZS(p, rates)), 0);
    document.getElementById('stat-stock-value').innerText = `${window.format(stockQty)} шт • ${window.formatMillion(Math.round(stockValue))}`;

    // 2. Продажи и Прибыль сегодня
    const todayStr = new Date().toLocaleDateString();
    const todaySales = sales.filter(s => s.date.includes(todayStr));

    const salesToday = todaySales.reduce((sum, s) => sum + s.total, 0);
    const salesTodayQty = todaySales.reduce((sum, s) => {
        if (!Array.isArray(s.items)) return sum;
        return sum + s.items.reduce((iSum, item) => iSum + item.cartQty, 0);
    }, 0);
    document.getElementById('stat-sales-today').innerText = `${window.format(salesTodayQty)} шт • ${window.formatMillion(salesToday)}`;

    const profitToday = todaySales.reduce((sum, s) => {
        if (!Array.isArray(s.items)) return sum; // Пропускаем если нет деталей
        const saleProfit = s.items.reduce((iSum, item) => {
            const costPerUnit = window.getCostUZS(item, rates);
            const profitPerUnit = (parseInt(item.priceUZS) || 0) - costPerUnit;
            return iSum + (profitPerUnit * item.cartQty);
        }, 0);
        return sum + saleProfit;
    }, 0);
    document.getElementById('stat-profit-today').innerText = `${window.format(salesTodayQty)} шт • ${window.formatMillion(Math.round(profitToday))}`;

    // 3. Общие долги
    const totalDebts = debts.reduce((sum, d) => sum + d.total, 0);
    const debtsCount = debts.length;
    document.getElementById('stat-total-debts').innerText = `${debtsCount} долг${debtsCount === 1 ? '' : debtsCount < 5 ? 'а' : 'ов'} • ${window.formatMillion(totalDebts)}`;

    // 4. Товаров в магазине (всего штук)
    const shopQty = shopProducts.reduce((sum, s) => sum + s.qty, 0);
    const shopValue = shopProducts.reduce((sum, s) => sum + (s.qty * window.getCostUZS(s, rates)), 0);
    document.getElementById('stat-shop-qty').innerText = `${window.format(shopQty)} шт • ${window.formatMillion(Math.round(shopValue))}`;

    // 5. Последние операции на Дашборде
    const recentSalesList = document.getElementById('dashboard-recent-sales');
    if (recentSalesList) {
        recentSalesList.innerHTML = sales.slice(0, 5).map(s => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border); background:rgba(255,255,255,0.02); border-radius:8px; margin-bottom:8px;">
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:600; font-size:14px;">${s.customer}</span>
                    <span style="font-size:11px; color:var(--text-muted);">${s.type} • ${s.date}</span>
                </div>
                <span style="font-weight:700; color:var(--success); font-size:15px;">+${window.format(s.total)}</span>
            </div>
        `).join('') || '<div style="color:var(--text-muted); text-align:center; padding:20px;">Операций пока нет</div>';
    }

    // 6. Заканчивается в магазине (минимум товара)
    const lowStockList = document.getElementById('dashboard-low-stock');
    if (lowStockList) {
        lowStockList.innerHTML = shopProducts
            .filter(s => s.qty < 5)
            .sort((a, b) => a.qty - b.qty)
            .slice(0, 5)
            .map(s => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border); background:rgba(239, 68, 68, 0.05); border-radius:8px; margin-bottom:8px;">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600; font-size:14px;">${s.name}</span>
                        <span style="font-size:11px; color:var(--danger);">Критический остаток</span>
                    </div>
                    <span style="font-weight:700; color:var(--danger); background:rgba(239,68,68,0.1); padding:4px 10px; border-radius:6px;">${s.qty} шт</span>
                </div>
            `).join('') || '<div style="color:var(--success); text-align:center; padding:20px;">✅ Все товары в наличии</div>';
    }
}

export function init() {
    console.log('📊 Модуль Dashboard инициализирован');
}
