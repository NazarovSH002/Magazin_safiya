// --- МОДУЛЬ ТОРГОВЛИ (РОЗНИЦА И ОПТ) ---

export function renderRetailList() {
    const query = (document.getElementById('retailSearch')?.value || '').toLowerCase();
    const list = document.getElementById('retail-list');
    if (!list) return;
    list.innerHTML = '';

    // shopProducts берется из глобальной области (window)
    const products = window.shopProducts || [];

    const filtered = (window.shopProducts || []).filter(p => p.name.toLowerCase().includes(query) && p.qty > 0);
    const toRender = filtered.slice(0, 50);

    toRender.forEach(p => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.padding = '10px';
        div.style.cursor = 'pointer';
        div.onclick = () => addToCart(p, 'retail');
        div.innerHTML = `
            <div style="font-weight:600; font-size:14px;">${p.name}</div>
            <div style="color:var(--success); font-size:12px;">В магазине: ${p.qty}</div>
            <div style="color:var(--text-muted); font-size:11px;">${window.format(p.costUZS || 0)} сум</div>
        `;
        list.appendChild(div);
    });

    if (filtered.length > 50) {
        const div = document.createElement('div');
        div.style.gridColumn = '1 / -1';
        div.style.textAlign = 'center';
        div.style.padding = '10px';
        div.style.color = 'var(--text-muted)';
        div.style.fontSize = '12px';
        div.innerText = `Показано 50 из ${filtered.length}. Уточните поиск.`;
        list.appendChild(div);
    }
}

export function renderWholesaleList() {
    const query = (document.getElementById('wholesaleSearch')?.value || '').toLowerCase();
    const list = document.getElementById('wholesale-list');
    if (!list) return;
    list.innerHTML = '';

    const products = window.shopProducts || [];

    const filtered = (window.shopProducts || []).filter(p => p.name.toLowerCase().includes(query) && p.qty > 0);
    const toRender = filtered.slice(0, 50);

    toRender.forEach(p => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.padding = '10px';
        div.style.cursor = 'pointer';
        div.onclick = () => addToCart(p, 'wholesale');
        div.innerHTML = `
            <div style="font-weight:600; font-size:14px;">${p.name}</div>
            <div style="color:var(--accent); font-size:12px;">В магазине: ${p.qty}</div>
            <div style="color:var(--text-muted); font-size:11px;">${window.format(p.costUZS || 0)} сум</div>
        `;
        list.appendChild(div);
    });

    if (filtered.length > 50) {
        const div = document.createElement('div');
        div.style.gridColumn = '1 / -1';
        div.style.textAlign = 'center';
        div.style.padding = '10px';
        div.style.color = 'var(--text-muted)';
        div.style.fontSize = '12px';
        div.innerText = `Показано 50 из ${filtered.length}. Уточните поиск.`;
        list.appendChild(div);
    }
    if (document.getElementById('wholesaleDate') && !document.getElementById('wholesaleDate').value) {
        document.getElementById('wholesaleDate').value = new Date().toISOString().split('T')[0];
    }
}

// Внутренние переменные модуля для корзины
let localRetailCart = [];
let localWholesaleCart = [];

export function addToCart(p, type) {
    const cart = type === 'retail' ? window.retailCart : window.wholesaleCart;
    const existing = cart.find(item => item.id === p.id);
    if (existing) {
        if (existing.cartQty < p.qty) {
            existing.cartQty++;
            renderCart(type);
        }
    } else {
        // Устанавливаем цену продажи равной себестоимости по умолчанию
        const defaultPrice = p.costUZS || p.priceUZS || 0;
        cart.push({ ...p, cartQty: 1, priceUZS: defaultPrice });
        renderCart(type);
    }
}

export function updateCartItem(id, type, field, value) {
    const cart = type === 'retail' ? window.retailCart : window.wholesaleCart;
    const item = cart.find(c => c.id === id);
    if (item) {
        if (field === 'qty') {
            const shopProduct = window.shopProducts.find(p => p.id === id);
            item.cartQty = Math.min(parseInt(value) || 1, shopProduct ? shopProduct.qty : 1);
        } else if (field === 'price') {
            item.priceUZS = value === "" ? "" : parseInt(value) || 0;
        }
        renderCart(type);
    }
}

export function removeFromCart(id, type) {
    if (type === 'retail') window.retailCart = window.retailCart.filter(c => c.id !== id);
    else window.wholesaleCart = window.wholesaleCart.filter(c => c.id !== id);
    renderCart(type);
}

export function renderCart(type) {
    const cart = type === 'retail' ? window.retailCart : window.wholesaleCart;
    const listId = type === 'retail' ? 'retail-cart' : 'wholesale-cart';
    const totalId = type === 'retail' ? 'retail-total' : 'wholesale-total';
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        total += (parseInt(item.priceUZS) || 0) * item.cartQty;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.style.display = 'grid';
        div.style.gridTemplateColumns = '1fr 60px 100px 30px';
        div.style.gap = '5px';
        div.style.alignItems = 'center';
        div.style.marginBottom = '8px';
        div.innerHTML = `
            <div style="font-size:12px; overflow:hidden; text-overflow:ellipsis;">${item.name}</div>
            <input type="number" value="${item.cartQty}" onchange="TradeModule.updateCartItem(${item.id}, '${type}', 'qty', this.value)">
            <input type="number" value="${item.priceUZS}" placeholder="Цена" style="font-weight:bold; color:var(--success);" onchange="TradeModule.updateCartItem(${item.id}, '${type}', 'price', this.value)">
            <button class="btn-danger" style="padding:2px;" onclick="TradeModule.removeFromCart(${item.id}, '${type}')">×</button>
        `;
        list.appendChild(div);
    });
    document.getElementById(totalId).innerText = window.format(total) + " UZS";
}

export async function completeSale(type, isDebt, debtType = 'debt') {
    const cart = type === 'retail' ? window.retailCart : window.wholesaleCart;
    if (cart.length === 0) return alert("Чек пуст");

    let customer = "Розница";
    let commentFieldId = type === 'retail' ? 'retailComment' : 'wholesaleComment';
    let comment = document.getElementById(commentFieldId)?.value.trim() || "";

    if (type === 'wholesale') {
        customer = document.getElementById('wholesaleCustomer').value.trim();
        if (isDebt && !customer) return alert("Введите имя клиента");
        if (!customer) customer = "Оптом";
    }

    const total = cart.reduce((sum, i) => sum + ((parseInt(i.priceUZS) || 0) * i.cartQty), 0);

    let saleDate = new Date();
    const dateInput = document.getElementById(type === 'retail' ? 'retailDate' : 'wholesaleDate');
    if (dateInput && dateInput.value) {
        saleDate = new Date(dateInput.value);
    }

    const saleData = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        timestamp: saleDate.getTime(),
        date: saleDate.toLocaleString(),
        customer,
        items: cart.map(item => ({...item})), // Клонируем для истории
        total,
        comment,
        type: isDebt ? (debtType === 'installment' ? "РАССРОЧКА" : "ДОЛГ") : (type === 'retail' ? "РОЗНИЦА" : "ОПТ")
    };

    // Списание (через window)
    cart.forEach(item => {
        const shopIdx = window.shopProducts.findIndex(s => s.id === item.id);
        if (shopIdx !== -1) {
            window.shopProducts[shopIdx].qty -= item.cartQty;
            if (window.shopProducts[shopIdx].qty <= 0) window.shopProducts.splice(shopIdx, 1);
        }
    });

    window.sales.unshift(saleData);
    if (isDebt) {
        if (debtType === 'installment') {
            window.installments.unshift({ ...saleData, paid: 0, status: 'Активна' });
        } else {
            window.debts.unshift({ ...saleData, status: 'Не оплачен' });
        }
    }

    if (type === 'retail') {
        window.retailCart = [];
        if (document.getElementById('retailComment')) document.getElementById('retailComment').value = '';
        if (document.getElementById('retailDate')) document.getElementById('retailDate').value = '';
        renderRetailList();
    } else {
        window.wholesaleCart = [];
        if (document.getElementById('wholesaleCustomer')) document.getElementById('wholesaleCustomer').value = '';
        if (document.getElementById('wholesaleComment')) document.getElementById('wholesaleComment').value = '';
        renderWholesaleList();
        renderWholesaleDailySales();
    }

    renderCart(type);

    if (window.saveAll) await window.saveAll();
    window.logAction('sale', `Продажа (${saleData.type}): ${customer} на сумму ${window.format(total)}`, { id: saleData.id, total, type: saleData.type });
    if (type === 'retail') renderDailySales();
    alert("Продано!");
}

export function renderDailySales() {
    const dailyList = document.getElementById('retail-daily-sales');
    const dayTotalEl = document.getElementById('retail-day-total');
    const dateSidebar = document.getElementById('retail-date-sidebar');
    const dateInput = document.getElementById('retailDate');

    if (!dailyList || !dateInput || !dateSidebar) return;

    const retailSales = window.sales.filter(s => s.type === "РОЗНИЦА" || s.type === "ДОЛГ" || s.type === "РАССРОЧКА");
    const uniqueDates = [...new Set(retailSales.map(s => s.date.split(',')[0]))]
        .sort((a, b) => {
            const dateA = new Date(a.split('.').reverse().join('-'));
            const dateB = new Date(b.split('.').reverse().join('-'));
            return dateB - dateA;
        });

    const currentlySelectedDate = new Date(dateInput.value).toLocaleDateString();

    dateSidebar.innerHTML = uniqueDates.map(dateStr => {
        const isActive = dateStr === currentlySelectedDate;
        return `
            <div style="padding: 10px 15px; margin-bottom: 5px; cursor: pointer; border-radius: 8px; font-size: 14px; transition: all 0.2s; 
                        background: ${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.03)'}; 
                        color: ${isActive ? 'white' : 'var(--text)'};"
                 onclick="TradeModule.selectRetailDate('${dateStr}')">
                📅 ${dateStr}
            </div>
        `;
    }).join('') || '<div style="color:var(--text-muted); font-size: 12px;">Нет истории</div>';

    const daySales = window.sales.filter(s => s.date.includes(currentlySelectedDate));
    const dayTotal = daySales.reduce((sum, s) => sum + s.total, 0);

    dayTotalEl.innerText = window.format(dayTotal) + " UZS";

    dailyList.innerHTML = daySales.map(s => {
        const itemsList = s.items.map(i => `
            <div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                <span>${i.name} x ${i.cartQty}</span>
                <span>${window.format(i.priceUZS * i.cartQty)} сум</span>
            </div>
        `).join('');

        return `
        <div style="margin-bottom:10px;">
            <div style="padding:12px; border:1px solid var(--border); background:rgba(255,255,255,0.02); border-radius:10px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="TradeModule.toggleDetails(${s.id})">
                <div>
                    <div style="font-weight:600; font-size:14px; margin-bottom:2px;">${s.customer} (Чек #${s.id.toString().slice(-4)})</div>
                    <div style="font-size:11px; color:var(--text-muted);">${s.date.split(',')[1] || ''} • ${s.items.length} поз.</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700; color:var(--success); font-size:15px;">${window.format(s.total)}</div>
                    <div style="display:flex; gap:8px; justify-content: flex-end; margin-top:5px;">
                        <button class="btn-sm" style="background:none; border:none; color:var(--accent); cursor:pointer; font-size:11px; text-decoration:underline; padding:0;" onclick="TradeModule.toggleDetails(${s.id})">детали</button>
                        <button class="btn-icon-danger" style="padding:2px 5px; font-size:10px;" onclick="HistoryModule.deleteHistory(${s.id}); TradeModule.renderDailySales();" title="Удалить продажу">×</button>
                    </div>
                </div>
            </div>
            <div id="details-${s.id}" style="display:none; padding:12px; background:rgba(255,255,255,0.03); border-radius:0 0 10px 10px; margin-top:-5px; border:1px solid var(--border); border-top:none;">
                <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px; font-weight:700;">Состав чека:</div>
                ${itemsList}
                ${s.comment ? `<div style="font-size:11px; color:var(--accent); margin-top:8px;">💬 ${s.comment}</div>` : ''}
            </div>
        </div>
        `;
    }).join('') || '<div style="color:var(--text-muted); text-align:center; padding:40px;">За этот день продаж не найдено</div>';
}

export function selectRetailDate(dateStr) {
    const [d, m, y] = dateStr.split('.');
    document.getElementById('retailDate').value = `${y}-${m}-${d}`;
    renderDailySales();
}

export function toggleDetails(id) {
    const el = document.getElementById(`details-${id}`);
    if (el) {
        const isHidden = el.style.display === 'none';
        el.style.display = isHidden ? 'block' : 'none';
    }
}

export function renderWholesaleDailySales() {
    const dailyList = document.getElementById('wholesale-daily-sales');
    const dayTotalEl = document.getElementById('wholesale-day-total');
    const dateSidebar = document.getElementById('wholesale-date-sidebar');
    const dateInput = document.getElementById('wholesaleDate');

    if (!dailyList || !dateSidebar) return;

    // Берем только оптовые продажи
    const wholesaleSales = window.sales.filter(s => s.type === "ОПТ");
    const uniqueDates = [...new Set(wholesaleSales.map(s => s.date.split(',')[0]))]
        .sort((a, b) => {
            const dateA = new Date(a.split('.').reverse().join('-'));
            const dateB = new Date(b.split('.').reverse().join('-'));
            return dateB - dateA;
        });

    // Определяем дату для фильтрации
    let filterDateStr = "";
    if (dateInput && dateInput.value) {
        filterDateStr = new Date(dateInput.value).toLocaleDateString();
    } else if (uniqueDates.length > 0) {
        filterDateStr = uniqueDates[0];
    } else {
        filterDateStr = new Date().toLocaleDateString();
    }

    dateSidebar.innerHTML = uniqueDates.map(dateStr => {
        const isActive = dateStr === filterDateStr;
        return `
            <div style="padding: 10px 15px; margin-bottom: 5px; cursor: pointer; border-radius: 8px; font-size: 14px; transition: all 0.2s; 
                        background: ${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.03)'}; 
                        color: ${isActive ? 'white' : 'var(--text)'};"
                 onclick="TradeModule.selectWholesaleDate('${dateStr}')">
                📅 ${dateStr}
            </div>
        `;
    }).join('') || '<div style="color:var(--text-muted); font-size: 12px;">Нет истории</div>';

    const daySales = wholesaleSales.filter(s => s.date.includes(filterDateStr));
    const dayTotal = daySales.reduce((sum, s) => sum + s.total, 0);

    if (dayTotalEl) dayTotalEl.innerText = window.format(dayTotal) + " UZS";

    dailyList.innerHTML = daySales.map(s => {
        const itemsList = s.items.map(i => `
            <div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                <span>${i.name} x ${i.cartQty}</span>
                <span>${window.format(i.priceUZS * i.cartQty)} сум</span>
            </div>
        `).join('');

        return `
        <div style="margin-bottom:10px;">
            <div style="padding:12px; border:1px solid var(--border); background:rgba(255,255,255,0.02); border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
                <div onclick="TradeModule.toggleDetails(${s.id})" style="cursor:pointer; flex: 1;">
                    <div style="font-weight:600; font-size:14px; margin-bottom:2px;">${s.customer} (Чек #${s.id.toString().slice(-4)})</div>
                    <div style="font-size:11px; color:var(--text-muted);">${s.date.split(',')[1] || ''} • ${s.items.length} поз.</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700; color:var(--accent); font-size:15px;">${window.format(s.total)}</div>
                    <div style="display:flex; gap:8px; justify-content: flex-end; margin-top:5px;">
                        <button class="btn-sm" style="background:none; border:none; color:var(--accent); cursor:pointer; font-size:11px; text-decoration:underline; padding:0;" onclick="TradeModule.toggleDetails(${s.id})">детали</button>
                        <button class="btn-icon-danger" style="padding:2px 5px; font-size:10px;" onclick="HistoryModule.deleteHistory(${s.id}); TradeModule.renderWholesaleDailySales();" title="Удалить продажу">×</button>
                    </div>
                </div>
            </div>
            <div id="details-${s.id}" style="display:none; padding:12px; background:rgba(255,255,255,0.03); border-radius:0 0 10px 10px; margin-top:-5px; border:1px solid var(--border); border-top:none;">
                <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px; font-weight:700;">Состав чека:</div>
                ${itemsList}
                ${s.comment ? `<div style="font-size:11px; color:var(--accent); margin-top:8px;">💬 ${s.comment}</div>` : ''}
            </div>
        </div>
        `;
    }).join('') || '<div style="color:var(--text-muted); text-align:center; padding:40px;">За этот день оптовых продаж не найдено</div>';
}

export function selectWholesaleDate(dateStr) {
    const [d, m, y] = dateStr.split('.');
    const input = document.getElementById('wholesaleDate');
    if (input) input.value = `${y}-${m}-${d}`;
    renderWholesaleDailySales();
}

export function init() {
    console.log('🛒 Модуль Торговли инициализирован');
}
