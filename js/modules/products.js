// === МОДУЛЬ: СВОДНЫЙ СПИСОК ТОВАРОВ ===

export function renderProductsList() {
    const query = (document.getElementById('productsSearch')?.value || '').toLowerCase();
    const tbody = document.getElementById('products-summary-tbody');
    if (!tbody) return;

    // Сводные данные
    const summary = {};
    const rates = window.fetchRates();

    // 1. Учет товаров на складе (по себестоимости)
    (window.products || []).forEach(p => {
        const key = p.name;
        if (!summary[key]) summary[key] = { warehouse: 0, shop: 0, sold: 0, warehouseSum: 0, shopSum: 0, soldSum: 0 };
        summary[key].warehouse += (p.qty || 0);
        summary[key].warehouseSum += (p.qty || 0) * (p.costUZS || 0);
    });

    // 2. Учет товаров в магазине (по себестоимости)
    (window.shopProducts || []).forEach(s => {
        const key = s.name;
        if (!summary[key]) summary[key] = { warehouse: 0, shop: 0, sold: 0, warehouseSum: 0, shopSum: 0, soldSum: 0 };
        summary[key].shop += (s.qty || 0);
        summary[key].shopSum += (s.qty || 0) * (s.costUZS || 0);
    });

    // 3. Учет проданных товаров (по фактической цене продажи)
    (window.sales || []).forEach(sale => {
        (sale.items || []).forEach(item => {
            const key = item.name;
            if (!summary[key]) summary[key] = { warehouse: 0, shop: 0, sold: 0, warehouseSum: 0, shopSum: 0, soldSum: 0 };
            summary[key].sold += (item.cartQty || 0);
            summary[key].soldSum += (item.cartQty || 0) * (item.priceUZS || 0);
        });
    });

    // Очистка и отрисовка
    tbody.innerHTML = '';

    let totalNames = 0;
    let totalWarehouseQty = 0;
    let totalShopQty = 0;
    let totalSoldQty = 0;

    let totalWarehouseVal = 0;
    let totalShopVal = 0;
    let totalSoldVal = 0;

    // Фильтрация и сортировка
    const sortedKeys = Object.keys(summary)
        .filter(key => key.toLowerCase().includes(query))
        .sort((a, b) => a.localeCompare(b));

    sortedKeys.forEach(name => {
        const entry = summary[name];
        const totalWasQty = entry.warehouse + entry.shop + entry.sold;
        const totalWasSum = entry.warehouseSum + entry.shopSum + entry.soldSum;

        totalNames++;
        totalWarehouseQty += entry.warehouse;
        totalShopQty += entry.shop;
        totalSoldQty += entry.sold;

        totalWarehouseVal += entry.warehouseSum;
        totalShopVal += entry.shopSum;
        totalSoldVal += entry.soldSum;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Товар" style="padding: 12px 8px;">
                <div style="font-weight:600;">${name}</div>
            </td>
            <td data-label="Склад" style="text-align:center;">
                <div style="font-weight:500;">${entry.warehouse} шт</div>
                <div style="font-size:10px; color:var(--text-muted);">${window.format(entry.warehouseSum)} сум</div>
            </td>
            <td data-label="Магазин" style="text-align:center;">
                <div style="font-weight:500;">${entry.shop} шт</div>
                <div style="font-size:10px; color:var(--text-muted);">${window.format(entry.shopSum)} сум</div>
            </td>
            <td data-label="Продано" style="text-align:center;">
                <div style="color:var(--success); font-weight:600;">${entry.sold} шт</div>
                <div style="font-size:10px; color:var(--success); opacity:0.8;">${window.format(entry.soldSum)} сум</div>
            </td>
            <td data-label="ИТОГО БЫЛО" style="text-align:center; background:rgba(var(--accent-rgb), 0.05); border-left: 1px solid rgba(255,255,255,0.05);">
                <div style="font-weight:800; color:var(--accent);">${totalWasQty} шт</div>
                <div style="font-size:10px; color:var(--accent); opacity:0.8;">${window.format(totalWasSum)} сум</div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Обновление стат-карточек
    if (document.getElementById('stats-total-names')) document.getElementById('stats-total-names').innerText = totalNames;

    if (document.getElementById('stats-total-warehouse')) {
        document.getElementById('stats-total-warehouse').innerHTML = `
            <div style="font-size:20px; font-weight:700;">${totalWarehouseQty} <span style="font-size:12px; font-weight:400; opacity:0.6;">шт</span></div>
            <div style="font-size:13px; font-weight:400; color:var(--text-muted); margin-top:2px;">${window.formatMillion(totalWarehouseVal)}</div>
        `;
    }

    if (document.getElementById('stats-total-shop')) {
        document.getElementById('stats-total-shop').innerHTML = `
            <div style="font-size:20px; font-weight:700;">${totalShopQty} <span style="font-size:12px; font-weight:400; opacity:0.6;">шт</span></div>
            <div style="font-size:13px; font-weight:400; color:var(--text-muted); margin-top:2px;">${window.formatMillion(totalShopVal)}</div>
        `;
    }

    if (document.getElementById('stats-total-sold')) {
        document.getElementById('stats-total-sold').innerHTML = `
            <div style="font-size:20px; font-weight:700;">${totalSoldQty} <span style="font-size:12px; font-weight:400; opacity:0.6;">шт</span></div>
            <div style="font-size:13px; font-weight:600; color:var(--success); margin-top:2px;">${window.formatMillion(totalSoldVal)}</div>
        `;
    }
}

export function exportToCSV() {
    // Получаем текущие данные (как в render)
    const summary = {};

    (window.products || []).forEach(p => {
        const key = p.name;
        if (!summary[key]) summary[key] = { warehouse: 0, shop: 0, sold: 0, warehouseSum: 0, shopSum: 0, soldSum: 0 };
        summary[key].warehouse += (p.qty || 0);
        summary[key].warehouseSum += (p.qty || 0) * (p.costUZS || 0);
    });

    (window.shopProducts || []).forEach(s => {
        const key = s.name;
        if (!summary[key]) summary[key] = { warehouse: 0, shop: 0, sold: 0, warehouseSum: 0, shopSum: 0, soldSum: 0 };
        summary[key].shop += (s.qty || 0);
        summary[key].shopSum += (s.qty || 0) * (s.costUZS || 0);
    });

    (window.sales || []).forEach(sale => {
        (sale.items || []).forEach(item => {
            const key = item.name;
            if (!summary[key]) summary[key] = { warehouse: 0, shop: 0, sold: 0, warehouseSum: 0, shopSum: 0, soldSum: 0 };
            summary[key].sold += (item.cartQty || 0);
            summary[key].soldSum += (item.cartQty || 0) * (item.priceUZS || 0);
        });
    });

    // Формируем CSV
    let csv = "Товар;На складе (шт);На складе (сумм);В магазине (шт);В магазине (сумм);Продано (шт);Продано (выручка);Итого было (шт)\n";

    Object.keys(summary).sort().forEach(name => {
        const entry = summary[name];
        const totalQty = entry.warehouse + entry.shop + entry.sold;
        csv += `${name};${entry.warehouse};${entry.warehouseSum};${entry.shop};${entry.shopSum};${entry.sold};${entry.soldSum};${totalQty}\n`;
    });

    // Скачивание
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

export function init() {
    console.log('📦 Модуль сводки товаров инициализирован');
}
