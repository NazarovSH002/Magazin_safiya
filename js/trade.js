// --- РОЗНИЦА ---
function renderRetailList() {
    const query = (document.getElementById('retailSearch')?.value || '').toLowerCase();
    const list = document.getElementById('retail-list');
    if (!list) return;
    list.innerHTML = '';
    // Торговля идет только из того, что передано в МАГАЗИН
    shopProducts.filter(p => p.name.toLowerCase().includes(query) && p.qty > 0).forEach(p => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.padding = '10px';
        div.style.cursor = 'pointer';
        div.onclick = () => addToCart(p, 'retail');
        div.innerHTML = `
            <div style="font-weight:600; font-size:14px;">${p.name}</div>
            <div style="color:var(--success); font-size:12px;">В магазине: ${p.qty}</div>
            <div style="color:var(--text-muted); font-size:11px;">${format(p.priceUZS)} сум</div>
        `;
        list.appendChild(div);
    });
}

// --- ОПТОМ ---
function renderWholesaleList() {
    const query = (document.getElementById('wholesaleSearch')?.value || '').toLowerCase();
    const list = document.getElementById('wholesale-list');
    if (!list) return;
    list.innerHTML = '';
    shopProducts.filter(p => p.name.toLowerCase().includes(query) && p.qty > 0).forEach(p => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.padding = '10px';
        div.style.cursor = 'pointer';
        div.onclick = () => addToCart(p, 'wholesale');
        div.innerHTML = `
            <div style="font-weight:600; font-size:14px;">${p.name}</div>
            <div style="color:var(--accent); font-size:12px;">В магазине: ${p.qty}</div>
            <div style="color:var(--text-muted); font-size:11px;">${format(p.priceUZS)} сум</div>
        `;
        list.appendChild(div);
    });
}

function addToCart(p, type) {
    const cart = type === 'retail' ? retailCart : wholesaleCart;
    const existing = cart.find(item => item.id === p.id);
    if (existing) {
        if (existing.cartQty < p.qty) {
            existing.cartQty++;
            renderCart(type);
        }
    } else {
        cart.push({ ...p, cartQty: 1, priceUZS: "" });
        renderCart(type);
    }
}

function updateCartItem(id, type, field, value) {
    const cart = type === 'retail' ? retailCart : wholesaleCart;
    const item = cart.find(c => c.id === id);
    if (item) {
        if (field === 'qty') {
            const shopProduct = shopProducts.find(p => p.id === id);
            item.cartQty = Math.min(parseInt(value) || 1, shopProduct ? shopProduct.qty : 1);
        } else if (field === 'price') {
            item.priceUZS = value === "" ? "" : parseInt(value) || 0;
        }
        renderCart(type);
    }
}

function removeFromCart(id, type) {
    if (type === 'retail') retailCart = retailCart.filter(c => c.id !== id);
    else wholesaleCart = wholesaleCart.filter(c => c.id !== id);
    renderCart(type);
}

function renderCart(type) {
    const cart = type === 'retail' ? retailCart : wholesaleCart;
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
            <input type="number" value="${item.cartQty}" onchange="updateCartItem(${item.id}, '${type}', 'qty', this.value)">
            <input type="number" value="${item.priceUZS}" placeholder="Цена" style="font-weight:bold; color:var(--success);" onchange="updateCartItem(${item.id}, '${type}', 'price', this.value)">
            <button class="btn-danger" style="padding:2px;" onclick="removeFromCart(${item.id}, '${type}')">×</button>
        `;
        list.appendChild(div);
    });
    document.getElementById(totalId).innerText = format(total) + " UZS";
}

function completeSale(type, isDebt, debtType = 'debt') {
    const cart = type === 'retail' ? retailCart : wholesaleCart;
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

    // Получаем дату из поля или текущую
    let saleDate = new Date();
    const dateInput = document.getElementById('retailDate');
    if (type === 'retail' && dateInput && dateInput.value) {
        saleDate = new Date(dateInput.value);
    }

    const saleData = {
        id: Date.now(),
        date: saleDate.toLocaleString(),
        customer,
        items: [...cart],
        total,
        comment,
        type: isDebt ? (debtType === 'installment' ? "РАССРОЧКА" : "ДОЛГ") : (type === 'retail' ? "РОЗНИЦА" : "ОПТ")
    };

    // Списание из МАГАЗИНА
    cart.forEach(item => {
        const shopIdx = shopProducts.findIndex(s => s.id === item.id);
        if (shopIdx !== -1) {
            shopProducts[shopIdx].qty -= item.cartQty;
            if (shopProducts[shopIdx].qty <= 0) shopProducts.splice(shopIdx, 1);
        }
    });

    sales.unshift(saleData);
    if (isDebt) {
        if (debtType === 'installment') {
            installments.unshift({ ...saleData, paid: 0, status: 'Активна' });
        } else {
            debts.unshift({ ...saleData, status: 'Не оплачен' });
        }
    }

    if (type === 'retail') {
        retailCart = [];
        if (document.getElementById('retailComment')) document.getElementById('retailComment').value = '';
        if (document.getElementById('retailDate')) document.getElementById('retailDate').value = '';
        renderRetailList();
    } else {
        wholesaleCart = [];
        if (document.getElementById('wholesaleCustomer')) document.getElementById('wholesaleCustomer').value = '';
        if (document.getElementById('wholesaleComment')) document.getElementById('wholesaleComment').value = '';
        renderWholesaleList();
    }
    renderCart(type);
    saveAll();
    if (type === 'retail') renderDailySales();
    alert("Продано!");
}

function renderDailySales() {
    const dailyList = document.getElementById('retail-daily-sales');
    const dayTotalEl = document.getElementById('retail-day-total');
    const dateSidebar = document.getElementById('retail-date-sidebar');
    const dateInput = document.getElementById('retailDate');

    if (!dailyList || !dateInput || !dateSidebar) return;

    // 1. Собираем все уникальные даты из розничных продаж
    const retailSales = sales.filter(s => s.type === "РОЗНИЦА" || s.type === "ДОЛГ" || s.type === "РАССРОЧКА");
    const uniqueDates = [...new Set(retailSales.map(s => s.date.split(',')[0]))]
        .sort((a, b) => {
            const dateA = new Date(a.split('.').reverse().join('-'));
            const dateB = new Date(b.split('.').reverse().join('-'));
            return dateB - dateA;
        });

    // 2. Рендерим сайдбар с датами
    const currentlySelectedDate = new Date(dateInput.value).toLocaleDateString();

    dateSidebar.innerHTML = uniqueDates.map(dateStr => {
        const isActive = dateStr === currentlySelectedDate;
        return `
            <div style="padding: 10px 15px; margin-bottom: 5px; cursor: pointer; border-radius: 8px; font-size: 14px; transition: all 0.2s; 
                        background: ${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.03)'}; 
                        color: ${isActive ? 'white' : 'var(--text)'};"
                 onclick="selectRetailDate('${dateStr}')">
                📅 ${dateStr}
            </div>
        `;
    }).join('') || '<div style="color:var(--text-muted); font-size: 12px;">Нет истории</div>';

    // 3. Рендерим список чеков за выбранную дату
    const daySales = sales.filter(s => s.date.includes(currentlySelectedDate));
    const dayTotal = daySales.reduce((sum, s) => sum + s.total, 0);

    dayTotalEl.innerText = format(dayTotal) + " UZS";

    dailyList.innerHTML = daySales.map(s => `
        <div style="padding:12px; border:1px solid var(--border); background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="font-weight:600; font-size:14px; margin-bottom:2px;">${s.customer} (Чек #${s.id.toString().slice(-4)})</div>
                <div style="font-size:11px; color:var(--text-muted);">${s.date.split(',')[1] || ''} • ${s.items.length} поз.</div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:700; color:var(--success); font-size:15px;">${format(s.total)}</div>
                <button class="btn-sm" style="background:none; border:none; color:var(--accent); cursor:pointer; font-size:11px; text-decoration:underline; padding:0;" onclick="toggleDetails(${s.id})">детали</button>
            </div>
        </div>
    `).join('') || '<div style="color:var(--text-muted); text-align:center; padding:40px;">За этот день продаж не найдено</div>';
}

function selectRetailDate(dateStr) {
    // Преобразуем DD.MM.YYYY в YYYY-MM-DD для input type="date"
    const [d, m, y] = dateStr.split('.');
    document.getElementById('retailDate').value = `${y}-${m}-${d}`;
    renderDailySales();
}
