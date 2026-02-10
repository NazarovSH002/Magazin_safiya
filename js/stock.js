function calculateTarget() {
    const val = parseFloat(document.getElementById('pPriceCNY').value) || 0;
    const rates = fetchRates();
    document.getElementById('pPriceUZS').value = Math.round((val / rates.cny) * rates.uzs);
}

function addOrUpdateProduct() {
    const name = document.getElementById('pName').value.trim();
    const qty = parseInt(document.getElementById('pQty').value) || 0;
    const cny = parseFloat(document.getElementById('pPriceCNY').value) || 0;
    const uzs = parseInt(document.getElementById('pPriceUZS').value) || 0;

    if (!name) return alert("Введите название");

    if (editingId) {
        const idx = products.findIndex(p => p.id === editingId);
        products[idx] = { ...products[idx], name, qty, priceCNY: cny, priceUZS: uzs, date: new Date().toLocaleString() };
        editingId = null;
    } else {
        products.push({ id: Date.now(), name, qty, priceCNY: cny, priceUZS: uzs, date: new Date().toLocaleString() });
    }

    clearStockForm();
    renderStock();
    saveAll();
}

function clearStockForm() {
    document.getElementById('pName').value = '';
    document.getElementById('pQty').value = '';
    document.getElementById('pPriceCNY').value = '0.0';
    document.getElementById('pPriceUZS').value = '0';
    editingId = null;
}

function renderStock() {
    const query = (document.getElementById('stockSearch')?.value || '').toLowerCase();
    const tbody = document.getElementById('stock-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    products.filter(p => p.name.toLowerCase().includes(query)).forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="stock-check" value="${p.id}" onclick="updateSelectedCount()"></td>
            <td>
                <div onclick="editProduct(${p.id})" style="cursor:pointer; font-weight:500;">${p.name}</div>
                <div style="font-size:10px; color:var(--text-muted);">${p.date || '-'}</div>
            </td>
            <td>${p.qty}</td>
            <td style="color:var(--text-muted)">${p.priceCNY} ¥</td>
            <td style="font-weight:600">${format(p.priceUZS)}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn btn-primary btn-sm" onclick="transferToShop(${p.id})">В магазин</button>
                    <button class="btn-icon-danger" title="Удалить" onclick="deleteProduct(${p.id})">×</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    updateSelectedCount();
}

function transferToShop(id) {
    const p = products.find(p => p.id === id);
    if (!p) return;
    const amount = prompt(`Передать "${p.name}" в магазин. Введите количество (доступно: ${p.qty}):`, p.qty);
    const qtyToMove = parseInt(amount);

    if (isNaN(qtyToMove) || qtyToMove <= 0) return;
    if (qtyToMove > p.qty) return alert("На складе недостаточно товара!");

    p.qty -= qtyToMove;

    const shopItem = shopProducts.find(s => s.stockId === id);
    if (shopItem) {
        shopItem.qty += qtyToMove;
        shopItem.priceCNY = p.priceCNY; // Обновляем закупочную цену
        shopItem.lastUpdate = new Date().toLocaleString();
    } else {
        shopProducts.push({
            id: Date.now(),
            stockId: p.id,
            name: p.name,
            qty: qtyToMove,
            priceCNY: p.priceCNY, // Сохраняем цену в юанях для расчета прибыли
            priceUZS: p.priceUZS,
            lastUpdate: new Date().toLocaleString()
        });
    }

    renderStock();
    saveAll();
    alert("Передано в магазин!");
}

function renderShopInventory() {
    const query = (document.getElementById('shopSearch')?.value || '').toLowerCase();
    const tbody = document.getElementById('shop-inventory-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    shopProducts.filter(s => s.name.toLowerCase().includes(query)).forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600">${s.name}</td>
            <td style="font-weight:700; color:var(--success)">${s.qty} шт</td>
            <td>${format(s.priceUZS)} сум</td>
            <td style="font-size:12px; color:var(--text-muted)">${s.lastUpdate}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn btn-danger btn-sm" onclick="returnToStock(${s.id})">На склад</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function returnToStock(shopId) {
    const sIdx = shopProducts.findIndex(s => s.id === shopId);
    if (sIdx === -1) return;
    const s = shopProducts[sIdx];

    const amount = prompt(`Вернуть "${s.name}" на склад. Сколько? (в магазине: ${s.qty}):`, s.qty);
    const qtyToReturn = parseInt(amount);

    if (isNaN(qtyToReturn) || qtyToReturn <= 0) return;
    if (qtyToReturn > s.qty) return alert("В магазине нет столько товара!");

    const p = products.find(p => p.id === s.stockId);
    if (p) p.qty += qtyToReturn;

    s.qty -= qtyToReturn;
    if (s.qty <= 0) shopProducts.splice(sIdx, 1);

    renderShopInventory();
    saveAll();
}

function editProduct(id) {
    const p = products.find(p => p.id === id);
    document.getElementById('pName').value = p.name;
    document.getElementById('pQty').value = p.qty;
    document.getElementById('pPriceCNY').value = p.priceCNY;
    document.getElementById('pPriceUZS').value = p.priceUZS;
    editingId = id;
}

function deleteProduct(id) {
    if (confirm("Удалить товар со склада?")) {
        products = products.filter(p => p.id !== id);
        renderStock();
        saveAll();
    }
}

function toggleAllCheckboxes(checked) {
    document.querySelectorAll('.stock-check').forEach(cb => cb.checked = checked);
    updateSelectedCount();
}

function updateSelectedCount() {
    const checked = document.querySelectorAll('.stock-check:checked');
    const btn = document.getElementById('multiDeleteBtn');
    if (btn) {
        btn.style.display = checked.length > 0 ? 'inline-flex' : 'none';
        btn.innerText = `Удалить выбранные (${checked.length})`;
    }
}

function bulkDelete() {
    const checked = document.querySelectorAll('.stock-check:checked');
    if (checked.length === 0) return;
    if (confirm(`Удалить выбранные товары (${checked.length} шт.)?`)) {
        const idsToRemove = Array.from(checked).map(cb => Number(cb.value));
        products = products.filter(p => !idsToRemove.includes(p.id));
        document.getElementById('selectAll').checked = false;
        renderStock();
        saveAll();
    }
}

function downloadTemplate() {
    const csv = "Name;Quantity;Cost_CNY;Price_UZS\niPhone 15 Pro;10;6500;16500000\nAirPods 3;25;1250;2300000";
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template_pro.csv";
    link.click();
}

function importCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const rows = e.target.result.split('\n');
        const rates = fetchRates();
        rows.slice(1).forEach(row => {
            const line = row.trim();
            if (!line) return;
            let cols = line.includes(';') ? line.split(';') : line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length >= 3) {
                const name = cols[0].replace(/"/g, '').trim();
                const qty = parseInt(cols[1]) || 0;
                const cny = parseFloat(cols[2]) || 0;
                const uzs = (cols.length >= 4 && cols[3].trim() !== "") ? parseInt(cols[3]) : Math.round((cny / rates.cny) * rates.uzs);
                products.push({ id: Date.now() + Math.random(), name, qty, priceCNY: cny, priceUZS: uzs, date: new Date().toLocaleString() });
            }
        });
        renderStock();
        saveAll();
        event.target.value = '';
    };
    reader.readAsText(file);
}
