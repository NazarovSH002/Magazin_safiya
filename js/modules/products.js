// === МОДУЛЬ: СВОДНЫЙ СПИСОК ТОВАРОВ ===

export function renderProductsList() {
    const query = (document.getElementById('productsSearch')?.value || '').toLowerCase();
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    // Сводные данные
    const summary = {};
    const rates = window.fetchRates();

    // 1. Учет товаров на складе (по себестоимости)
    (window.products || []).forEach(p => {
        const key = p.name;
        if (!summary[key]) summary[key] = { warehouse: 0, shop: 0, sold: 0, warehouseSum: 0, shopSum: 0, soldSum: 0, soldCostSum: 0 };
        summary[key].warehouse += (p.qty || 0);
        summary[key].warehouseSum += (p.qty || 0) * (window.getCostUZS(p, rates));
    });

    // 2. Учет товаров в магазине (по себестоимости)
    (window.shopProducts || []).forEach(s => {
        const key = s.name;
        if (!summary[key]) summary[key] = { warehouse: 0, shop: 0, sold: 0, warehouseSum: 0, shopSum: 0, soldSum: 0, soldCostSum: 0 };
        summary[key].shop += (s.qty || 0);
        summary[key].shopSum += (s.qty || 0) * (window.getCostUZS(s, rates));
    });

    // 3. Учет проданных товаров
    (window.sales || []).forEach(sale => {
        (sale.items || []).forEach(item => {
            const key = item.name;
            if (!summary[key]) summary[key] = { warehouse: 0, shop: 0, sold: 0, warehouseSum: 0, shopSum: 0, soldSum: 0, soldCostSum: 0 };
            summary[key].sold += (item.cartQty || 0);

            // Выручка (для блока "Продано")
            summary[key].soldSum += (item.cartQty || 0) * (item.priceUZS || 0);

            // Себестоимость проданного (для блока "Итого было")
            const itemCost = window.getCostUZS(item, rates);
            summary[key].soldCostSum += (item.cartQty || 0) * itemCost;
        });
    });

    // Очистка и отрисовка
    grid.innerHTML = '';

    let totalNames = 0;
    let totalWarehouseQty = 0;
    let totalShopQty = 0;
    let totalSoldQty = 0;

    let totalWarehouseVal = 0;
    let totalShopVal = 0;
    let totalSoldVal = 0; // Тут оставим выручку для верхней статы

    // Фильтрация и сортировка
    const sortedKeys = Object.keys(summary)
        .filter(key => key.toLowerCase().includes(query))
        .sort((a, b) => a.localeCompare(b));

    const toRender = sortedKeys.slice(0, 100);

    toRender.forEach(name => {
        const entry = summary[name];
        const totalWasQty = entry.warehouse + entry.shop + entry.sold;

        // ИТОГО БЫЛО теперь строго по себестоимости: Склад + Магазин + (Кол-во проданного * Себестоимость)
        const totalWasSumByCost = entry.warehouseSum + entry.shopSum + entry.soldCostSum;

        totalNames++;
        totalWarehouseQty += entry.warehouse;
        totalShopQty += entry.shop;
        totalSoldQty += entry.sold;

        totalWarehouseVal += entry.warehouseSum;
        totalShopVal += entry.shopSum;
        totalSoldVal += entry.soldSum;

        const card = document.createElement('div');
        card.className = 'card animate-fadeIn';
        card.style.padding = '20px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '15px';
        card.style.border = '1px solid var(--border)';
        card.style.background = 'rgba(255,255,255,0.02)';

        card.innerHTML = `
            <div style="border-bottom: 1px solid var(--border); padding-bottom: 10px;">
                <h3 style="margin:0; font-size:18px; color:var(--text);">${name}</h3>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">На складе</div>
                    <div style="font-weight: 700; font-size: 16px;">${entry.warehouse} <span style="font-size:11px; font-weight:400; opacity:0.6;">шт</span></div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top:2px;">${window.format(entry.warehouseSum)} сум</div>
                </div>
                
                <div style="background: rgba(59, 130, 246, 0.05); padding: 10px; border-radius: 8px;">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">В магазине</div>
                    <div style="font-weight: 700; font-size: 16px; color: #60a5fa;">${entry.shop} <span style="font-size:11px; font-weight:400; opacity:0.6;">шт</span></div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top:2px;">${window.format(entry.shopSum)} сум</div>
                </div>
                
                <div style="background: rgba(16, 185, 129, 0.05); padding: 10px; border-radius: 8px;">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Продано (выручка)</div>
                    <div style="font-weight: 700; font-size: 16px; color: var(--success);">${entry.sold} <span style="font-size:11px; font-weight:400; opacity:0.6;">шт</span></div>
                    <div style="font-size: 12px; color: var(--success); opacity:0.8; margin-top:2px;">${window.format(entry.soldSum)} сум</div>
                </div>
                
                <div style="background: rgba(139, 92, 246, 0.05); padding: 10px; border-radius: 8px;">
                    <div style="font-size: 11px; color: var(--accent); text-transform: uppercase; margin-bottom: 4px;">Итого было (себ-сть)</div>
                    <div style="font-weight: 800; font-size: 16px; color: var(--accent);">${totalWasQty} <span style="font-size:11px; font-weight:400; opacity:0.6;">шт</span></div>
                    <div style="font-size: 12px; color: var(--accent); opacity:0.8; margin-top:2px;">${window.format(totalWasSumByCost)} сум</div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    if (sortedKeys.length > 100) {
        const info = document.createElement('div');
        info.style.gridColumn = '1/-1';
        info.style.textAlign = 'center';
        info.style.padding = '20px';
        info.style.color = 'var(--text-muted)';
        info.innerText = `Показано 100 из ${sortedKeys.length} товаров. Используйте поиск для фильтрации.`;
        grid.appendChild(info);
    }

    // Обновление стат-карточек
    if (document.getElementById('stats-total-names')) document.getElementById('stats-total-names').innerText = totalNames;

    if (document.getElementById('stats-total-warehouse')) {
        document.getElementById('stats-total-warehouse').innerHTML = `
            ${totalWarehouseQty} <span style="font-size:12px; font-weight:400; opacity:0.6;">шт</span>
            <div style="font-size:13px; font-weight:400; color:var(--text-muted); margin-top:4px;">${window.formatMillion(totalWarehouseVal)}</div>
        `;
    }

    if (document.getElementById('stats-total-shop')) {
        document.getElementById('stats-total-shop').innerHTML = `
            ${totalShopQty} <span style="font-size:12px; font-weight:400; opacity:0.6;">шт</span>
            <div style="font-size:13px; font-weight:400; color:var(--text-muted); margin-top:4px;">${window.formatMillion(totalShopVal)}</div>
        `;
    }

    if (document.getElementById('stats-total-sold')) {
        document.getElementById('stats-total-sold').innerHTML = `
            ${totalSoldQty} <span style="font-size:12px; font-weight:400; opacity:0.6;">шт</span>
            <div style="font-size:13px; font-weight:600; color:var(--success); margin-top:4px;">${window.formatMillion(totalSoldVal)}</div>
        `;
    }
}

export function exportToCSV() {
    const summary = getSummaryData();
    let csv = "Товар;На складе (шт);На складе (сумм);В магазине (шт);В магазине (сумм);Продано (шт);Продано (выручка);Итого было (шт);Итого было (себестоимость)\n";

    Object.keys(summary).sort().forEach(name => {
        const entry = summary[name];
        const totalQty = entry.warehouse + entry.shop + entry.sold;
        const totalCostSum = entry.warehouseSum + entry.shopSum + entry.soldCostSum;
        csv += `${name};${entry.warehouse};${entry.warehouseSum};${entry.shop};${entry.shopSum};${entry.sold};${entry.soldSum};${totalQty};${totalCostSum}\n`;
    });

    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

export function printProductsReport() {
    const summary = getSummaryData();
    const query = (document.getElementById('productsSearch')?.value || '').toLowerCase();

    const printSection = document.getElementById('print-section');
    if (!printSection) return;
    printSection.style.display = 'block';

    const sortedKeys = Object.keys(summary)
        .filter(key => key.toLowerCase().includes(query))
        .sort((a, b) => a.localeCompare(b));

    let grandWarehouse = 0;
    let grandShop = 0;
    let grandSold = 0;
    let grandTotalQty = 0;
    let grandTotalCost = 0;

    let rowsHtml = sortedKeys.map((name, idx) => {
        const e = summary[name];
        const totalQty = e.warehouse + e.shop + e.sold;
        const totalCost = e.warehouseSum + e.shopSum + e.soldCostSum;

        grandWarehouse += e.warehouse;
        grandShop += e.shop;
        grandSold += e.sold;
        grandTotalQty += totalQty;
        grandTotalCost += totalCost;

        return `
            <tr>
                <td style="text-align:center; border: 1px solid #000; padding: 6px; color: #000 !important;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 6px; color: #000 !important; font-weight: 500;">${name}</td>
                <td style="text-align:center; border: 1px solid #000; padding: 6px; color: #000 !important;">${e.warehouse}</td>
                <td style="text-align:center; border: 1px solid #000; padding: 6px; color: #000 !important;">${e.shop}</td>
                <td style="text-align:center; border: 1px solid #000; padding: 6px; color: #000 !important;">${e.sold}</td>
                <td style="text-align:center; font-weight:800; border: 1px solid #000; padding: 6px; color: #000 !important;">${totalQty}</td>
                <td style="text-align:right; border: 1px solid #000; padding: 6px; color: #000 !important; font-weight: 600;">${window.format(totalCost)}</td>
            </tr>
        `;
    }).join('');

    printSection.innerHTML = `
        <div style="font-family: 'Inter', Arial, sans-serif; color: #000 !important; padding: 30px; border: 2px solid #000; max-width: 1050px; margin: 0 auto; background: #fff;">
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 3px solid #000; padding-bottom: 15px;">
                <h1 style="margin: 0; font-size: 26px; font-weight: 900; text-transform: uppercase; color: #000 !important;">Сводный отчет по товарам</h1>
                <p style="margin: 5px 0; font-size: 16px; font-weight: 600; color: #000 !important;">Дата выгрузки: ${new Date().toLocaleString('ru-RU')}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; color: #000 !important; font-size: 14px; border: 2px solid #000;">
                <thead>
                    <tr style="background: #e0e0e0; position: sticky; top: 0;">
                        <th style="padding: 10px; border: 1px solid #000; text-align: center; width: 40px; color: #000 !important; font-weight: 900;">№</th>
                        <th style="padding: 10px; border: 1px solid #000; text-align: left; color: #000 !important; font-weight: 900;">Наименование товара</th>
                        <th style="padding: 10px; border: 1px solid #000; text-align: center; width: 80px; color: #000 !important; font-weight: 900;">Склад (шт)</th>
                        <th style="padding: 10px; border: 1px solid #000; text-align: center; width: 80px; color: #000 !important; font-weight: 900;">Магаз (шт)</th>
                        <th style="padding: 10px; border: 1px solid #000; text-align: center; width: 80px; color: #000 !important; font-weight: 900;">Прод (шт)</th>
                        <th style="padding: 10px; border: 1px solid #000; text-align: center; width: 90px; color: #000 !important; font-weight: 900;">Итого (шт)</th>
                        <th style="padding: 10px; border: 1px solid #000; text-align: right; width: 150px; color: #000 !important; font-weight: 900;">Итого (себ-сть)</th>
                    </tr>
                </thead>
                <tbody style="color: #000 !important;">
                    ${rowsHtml}
                </tbody>
                <tfoot style="display: table-footer-group;">
                    <tr style="background: #d0d0d0; font-weight: 900; color: #000 !important;">
                        <td colspan="2" style="padding: 12px; border: 1px solid #000; text-align: right; text-transform: uppercase; color: #000 !important;">ИТОГ СТРАНИЦЫ:</td>
                        <td colspan="4" style="padding: 12px; border: 1px solid #000; text-align: center; color: #000 !important; font-size: 11px;">Сумма всех позиций отчета указана в конце документа</td>
                        <td style="padding: 12px; border: 1px solid #000; text-align: right; color: #000 !important;">...</td>
                    </tr>
                </tfoot>
            </table>

            <div style="margin-top: 30px; padding: 20px; border: 3px solid #000; background: #f2f2f2; color: #000 !important; page-break-inside: avoid;">
                <h2 style="margin: 0 0 15px 0; text-align: center; text-transform: uppercase; font-size: 20px;">ОБЩИЙ ИТОГ ОТЧЕТА</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 16px; font-weight: 900;">
                    <div style="border-bottom: 1px solid #000; padding: 5px 0;">Всего позиций (наименований):</div>
                    <div style="border-bottom: 1px solid #000; padding: 5px 0; text-align: right;">${sortedKeys.length}</div>
                    
                    <div style="border-bottom: 1px solid #000; padding: 5px 0;">Общее кол-во (шт):</div>
                    <div style="border-bottom: 1px solid #000; padding: 5px 0; text-align: right;">${grandTotalQty} шт</div>
                    
                    <div style="border-bottom: 2px solid #000; padding: 10px 0; font-size: 22px;">ОБЩАЯ СУММА (СЕБ-СТЬ):</div>
                    <div style="border-bottom: 2px solid #000; padding: 10px 0; text-align: right; font-size: 22px;">${window.format(grandTotalCost)} сум</div>
                </div>
            </div>

            <div style="margin-top: 50px; display: flex; justify-content: space-between; font-weight: 900; font-size: 16px; color: #000 !important;">
                <span style="color: #000 !important;">М.П. Руководитель: ____________________</span>
                <span style="color: #000 !important;">М.П. Продавец: ____________________</span>
            </div>
        </div>
    `;

    window.print();
    printSection.style.display = 'none';
}

// Вспомогательная функция для сбора данных
function getSummaryData() {
    const summary = {};
    (window.products || []).forEach(p => {
        const key = p.name;
        if (!summary[key]) summary[key] = { warehouse: 0, shop: 0, sold: 0, warehouseSum: 0, shopSum: 0, soldSum: 0, soldCostSum: 0 };
        summary[key].warehouse += (p.qty || 0);
        summary[key].warehouseSum += (p.qty || 0) * (p.costUZS || 0);
    });
    (window.shopProducts || []).forEach(s => {
        const key = s.name;
        if (!summary[key]) summary[key] = { warehouse: 0, shop: 0, sold: 0, warehouseSum: 0, shopSum: 0, soldSum: 0, soldCostSum: 0 };
        summary[key].shop += (s.qty || 0);
        summary[key].shopSum += (s.qty || 0) * (s.costUZS || 0);
    });
    (window.sales || []).forEach(sale => {
        (sale.items || []).forEach(item => {
            const key = item.name;
            if (!summary[key]) summary[key] = { warehouse: 0, shop: 0, sold: 0, warehouseSum: 0, shopSum: 0, soldSum: 0, soldCostSum: 0 };
            summary[key].sold += (item.cartQty || 0);
            summary[key].soldSum += (item.cartQty || 0) * (item.priceUZS || 0);
            summary[key].soldCostSum += (item.cartQty || 0) * (window.getCostUZS(item, rates));
        });
    });
    return summary;
}

export function init() {
    console.log('📦 Модуль сводки товаров инициализирован');
}
