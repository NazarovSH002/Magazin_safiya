// === МОДУЛЬ: СКЛАД И МАГАЗИН ===

export function calculateTarget() {
    const val = parseFloat(document.getElementById('pPriceCNY').value) || 0;
    const rates = window.fetchRates();
    const costUZS = Math.round((val / rates.cny) * rates.uzs);
    document.getElementById('pCostUZS').value = costUZS;
}

export function addOrUpdateProduct() {
    const nameEl = document.getElementById('pName');
    const qtyEl = document.getElementById('pQty');
    const cnyEl = document.getElementById('pPriceCNY');
    const costEl = document.getElementById('pCostUZS');
    const uzsEl = document.getElementById('pPriceUZS');
    const dateEl = document.getElementById('pDate');
    const toShopEl = document.getElementById('pToShop');

    if (!nameEl) return console.error("Element pName not found");

    const name = nameEl.value.trim();
    const qty = parseInt(qtyEl.value) || 0;
    const cny = parseFloat(cnyEl.value) || 0;
    const costUZS = parseInt(costEl.value) || 0;
    const uzs = parseInt(uzsEl.value) || 0;
    const pDate = dateEl.value || new Date().toISOString().split('T')[0];

    if (!name) return alert("Введите название товара");

    if (!window.products) window.products = [];

    if (window.editingId) {
        const idx = window.products.findIndex(p => p.id === window.editingId);
        if (idx !== -1) {
            window.products[idx] = { ...window.products[idx], name, qty, priceCNY: cny, costUZS, priceUZS: uzs, date: pDate };
            
            // СИНХРОНИЗАЦИЯ: Обновляем те же товары в магазине
            if (window.shopProducts) {
                window.shopProducts.forEach(s => {
                    if (s.stockId === window.editingId) {
                        s.name = name;
                        s.priceCNY = cny;
                        s.costUZS = costUZS;
                        s.priceUZS = uzs;
                    }
                });
            }
            
            window.logAction('edit_product', `Изменен товар: ${name}`, { id: window.editingId, qty, uzs });
        }
        window.editingId = null;
    } else {
        createNewEntry();
    }

    function createNewEntry() {
        const newId = Date.now() + Math.floor(Math.random() * 1000);
        const newProduct = {
            id: newId,
            name,
            qty,
            priceCNY: cny,
            costUZS: costUZS,
            priceUZS: uzs,
            date: pDate
        };
        window.products.push(newProduct);
        window.logAction('add_product', `Добавлен товар на склад: ${name}`, { id: newId, qty, uzs, date: pDate });

        if (toShopEl && toShopEl.checked) {
            const shopId = Date.now() + Math.floor(Math.random() * 1000);
            window.shopProducts.push({
                id: shopId,
                stockId: newId,
                name: name,
                qty: qty,
                priceCNY: cny,
                costUZS: costUZS,
                priceUZS: uzs,
                lastUpdate: pDate
            });
            newProduct.qty = 0;
            window.logAction('transfer_to_shop', `Товар ${name} сразу добавлен в магазин`, { id: shopId, qty });
        }
    }

    clearStockForm();
    renderStock();

    if (window.saveAll) {
        window.saveAll();
    } else {
        console.warn("window.saveAll is not defined");
    }
}

export function clearStockForm() {
    document.getElementById('pName').value = '';
    document.getElementById('pQty').value = '';
    document.getElementById('pPriceCNY').value = '0.0';
    document.getElementById('pCostUZS').value = '0';
    document.getElementById('pDate').value = new Date().toISOString().split('T')[0];
    if (document.getElementById('pToShop')) document.getElementById('pToShop').checked = false;
    window.editingId = null;

    const btn = document.getElementById('saveStockBtn');
    if (btn) btn.innerText = 'Сохранить на складе';

    const title = document.getElementById('stockFormTitle');
    if (title) title.innerText = 'Новый товар';
}

export function renderStock() {
    const query = (document.getElementById('stockSearch')?.value || '').toLowerCase();
    const tbody = document.getElementById('stock-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = window.products.filter(p => p.name.toLowerCase().includes(query));
    const toRender = filtered.slice(0, 100); // Ограничиваем рендеринг для скорости

    toRender.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Выбор"><input type="checkbox" class="stock-check" value="${p.id}" onclick="window.StockModule.updateSelectedCount()"></td>
            <td data-label="Товар на складе">
                <div onclick="window.StockModule.fillAsTemplate(${p.id})" style="cursor:pointer; font-weight:500;" title="Использовать как шаблон">${p.name}</div>
                <div style="font-size:10px; color:var(--text-muted);">${p.date || '-'}</div>
            </td>
            <td data-label="Кол-во">${p.qty}</td>
            <td data-label="Закуп" style="color:var(--text-muted)">${p.priceCNY} ¥</td>
            <td data-label="Себестоимость" style="font-weight:600">${window.format(window.getCostUZS(p, window.fetchRates()))}</td>
            <td data-label="Действие">
                <div class="actions-cell">
                    <button class="btn btn-primary btn-sm" onclick="window.StockModule.transferToShop(${p.id})">В магазин</button>
                    <button class="btn-sm" style="background:rgba(255,255,255,0.05); border:1px solid var(--border); color:var(--text);" onclick="window.StockModule.editProduct(${p.id})" title="Редактировать запись">✏️</button>
                    <button class="btn-icon-danger" title="Удалить" onclick="window.StockModule.deleteProduct(${p.id})">×</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (filtered.length > 100) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="6" style="text-align:center; color:var(--text-muted); padding:10px;">Показано первые 100 из ${filtered.length} товаров. Используйте поиск для уточнения.</td>`;
        tbody.appendChild(tr);
    }

    updateSelectedCount();
}

export function transferToShop(id) {
    const p = window.products.find(p => p.id === id);
    if (!p) return;
    const amount = prompt(`Передать "${p.name}" в магазин. Введите количество (доступно: ${p.qty}):`, p.qty);
    const qtyToMove = parseInt(amount);

    if (isNaN(qtyToMove) || qtyToMove <= 0) return;
    if (qtyToMove > p.qty) return alert("На складе недостаточно товара!");

    p.qty -= qtyToMove;

    const shopItem = window.shopProducts.find(s => s.stockId === id);
    if (shopItem) {
        shopItem.qty += qtyToMove;
        shopItem.priceCNY = p.priceCNY;
        shopItem.costUZS = p.costUZS;
        shopItem.lastUpdate = new Date().toLocaleString();
    } else {
        window.shopProducts.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            stockId: p.id,
            name: p.name,
            qty: qtyToMove,
            priceCNY: p.priceCNY,
            costUZS: p.costUZS || 0,
            priceUZS: p.priceUZS,
            lastUpdate: new Date().toLocaleString()
        });
    }

    renderStock();
    window.saveAll();
    window.logAction('transfer_to_shop', `Перенос "${p.name}" в магазин`, { qty: qtyToMove });
    alert("Передано в магазин!");
}

export function renderShopInventory() {
    const query = (document.getElementById('shopSearch')?.value || '').toLowerCase();
    const tbody = document.getElementById('shop-inventory-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    window.shopProducts.filter(s => s.name.toLowerCase().includes(query)).forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Название" style="font-weight:600">${s.name}</td>
            <td data-label="Количество" style="font-weight:700; color:var(--success)">${s.qty} шт</td>
            <td data-label="Себестоимость">${window.format(s.costUZS || 0)} сум</td>
            <td data-label="Дата переноса" style="font-size:12px; color:var(--text-muted)">${s.lastUpdate}</td>
            <td data-label="Действие">
                <div class="actions-cell">
                    <button class="btn btn-danger btn-sm" onclick="window.StockModule.returnToStock(${s.id})">На склад</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

export function returnToStock(shopId) {
    const sIdx = window.shopProducts.findIndex(s => s.id === shopId);
    if (sIdx === -1) return;
    const s = window.shopProducts[sIdx];

    const amount = prompt(`Вернуть "${s.name}" на склад. Сколько? (в магазине: ${s.qty}):`, s.qty);
    const qtyToReturn = parseInt(amount);

    if (isNaN(qtyToReturn) || qtyToReturn <= 0) return;
    if (qtyToReturn > s.qty) return alert("В магазине нет столько товара!");

    const p = window.products.find(p => p.id === s.stockId);
    if (p) p.qty += qtyToReturn;

    s.qty -= qtyToReturn;
    if (s.qty <= 0) window.shopProducts.splice(sIdx, 1);

    renderShopInventory();
    window.saveAll();
    window.logAction('return_to_stock', `Возврат "${s.name}" из магазина на склад`, { qty: qtyToReturn });
}

export function fillAsTemplate(id) {
    const p = window.products.find(p => p.id === id);
    if (!p) return;
    document.getElementById('pName').value = p.name;
    document.getElementById('pPriceCNY').value = p.priceCNY;
    document.getElementById('pCostUZS').value = p.costUZS || 0;
    // Сбрасываем ID редактирования, чтобы это считалось новым добавлением
    window.editingId = null;
    const btn = document.getElementById('saveStockBtn');
    if (btn) btn.innerText = 'Сохранить на складе';
    const title = document.getElementById('stockFormTitle');
    if (title) title.innerText = 'Новый товар (по шаблону)';
}

export function editProduct(id) {
    const p = window.products.find(p => p.id === id);
    if (!p) return;
    document.getElementById('pName').value = p.name;
    document.getElementById('pQty').value = p.qty;
    document.getElementById('pPriceCNY').value = p.priceCNY;
    document.getElementById('pCostUZS').value = p.costUZS || 0;
    document.getElementById('pDate').value = (p.date && p.date.includes('-')) ? p.date : new Date().toISOString().split('T')[0];

    window.editingId = id;
    const btn = document.getElementById('saveStockBtn');
    if (btn) btn.innerText = 'Обновить данные';
    const title = document.getElementById('stockFormTitle');
    if (title) title.innerText = 'Редактирование записи';
}

export function deleteProduct(id) {
    if (confirm("Удалить товар со склада?")) {
        const p = window.products.find(p => p.id === id);
        if (p) window.logAction('delete_product', `Товар ${p.name} удален со склада`);
        window.products = window.products.filter(p => p.id !== id);
        renderStock();
        window.saveAll();
    }
}

export function toggleAllCheckboxes(checked) {
    document.querySelectorAll('.stock-check').forEach(cb => cb.checked = checked);
    updateSelectedCount();
}

export function updateSelectedCount() {
    const checked = document.querySelectorAll('.stock-check:checked');
    const btn = document.getElementById('multiDeleteBtn');
    if (btn) {
        btn.style.display = checked.length > 0 ? 'inline-flex' : 'none';
        btn.innerText = `Удалить выбранные (${checked.length})`;
    }
}

export function bulkDelete() {
    const checked = document.querySelectorAll('.stock-check:checked');
    if (checked.length === 0) return;
    if (confirm(`Удалить выбранные товары (${checked.length} шт.)?`)) {
        const idsToRemove = Array.from(checked).map(cb => Number(cb.value));
        window.products = window.products.filter(p => !idsToRemove.includes(p.id));
        document.getElementById('selectAll').checked = false;
        renderStock();
        window.saveAll();
    }
}

export function downloadTemplate() {
    const csv = "Name;Quantity;Cost_CNY;Price_UZS\niPhone 15 Pro;10;6500;16500000\nAirPods 3;25;1250;2300000";
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template_pro.csv";
    link.click();
}

export function importCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const rows = e.target.result.split('\n');
        const rates = window.fetchRates();
        rows.slice(1).forEach(row => {
            const line = row.trim();
            if (!line) return;
            let cols = line.includes(';') ? line.split(';') : line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length >= 3) {
                const name = cols[0].replace(/"/g, '').trim();
                const qty = parseInt(cols[1]) || 0;
                const cny = parseFloat(cols[2]) || 0;
                const costUZS = Math.round((cny / rates.cny) * rates.uzs);
                const uzs = (cols.length >= 4 && cols[3].trim() !== "") ? parseInt(cols[3]) : costUZS;
                
                window.products.push({ 
                    id: Date.now() + Math.floor(Math.random() * 1000000), 
                    name, 
                    qty, 
                    priceCNY: cny, 
                    costUZS: costUZS,
                    priceUZS: uzs, 
                    date: new Date().toLocaleString() 
                });
            }
        });
        renderStock();
        window.saveAll();
        event.target.value = '';
    };
    reader.readAsText(file);
}

export function init() {
    console.log('📦 Модуль Stock инициализирован');
}
