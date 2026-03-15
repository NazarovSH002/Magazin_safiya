// === МОДУЛЬ СТАТИСТИКИ И РАСХОДОВ ===

export function renderStats() {
    // 1. Расчет прибыли и статистики
    calculateFinancials();

    // 2. Рендерим аналитику расходов
    renderExpensesBreakdown();

    // 3. Рендерим аналитику прибыли
    renderProfitBreakdown();
}

function calculateFinancials() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const weekCopy = new Date(now);
    const startOfWeek = new Date(weekCopy.setDate(weekCopy.getDate() - weekCopy.getDay() + (weekCopy.getDay() === 0 ? -6 : 1)));
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const rates = window.fetchRates();
    const sales = window.sales || [];
    const expenses = window.expenses || [];

    const getProfit = (sale) => {
        let saleProfit = 0;
        sale.items.forEach(item => {
            const costUZS = window.getCostUZS(item, rates);
            const itemProfit = (item.priceUZS - costUZS) * item.cartQty;
            saleProfit += itemProfit;
        });
        return saleProfit;
    };

    let statsStartEl = document.getElementById('statsStart');
    let statsEndEl = document.getElementById('statsEnd');
    
    // Если пустые, ставим сегодня
    const todayStr = new Date().toISOString().split('T')[0];
    if (statsStartEl && !statsStartEl.value) statsStartEl.value = todayStr;
    if (statsEndEl && !statsEndEl.value) statsEndEl.value = todayStr;

    const statsStart = statsStartEl?.value;
    const statsEnd = statsEndEl?.value;

    let startLimit = null;
    if (statsStart) {
        const parts = statsStart.split('-');
        startLimit = new Date(parts[0], parts[1] - 1, parts[2]);
    }
    let endLimit = null;
    if (statsEnd) {
        const parts = statsEnd.split('-');
        endLimit = new Date(parts[0], parts[1] - 1, parts[2]);
        endLimit.setHours(23, 59, 59, 999);
    }

    const stats = {
        day: { profit: 0, count: 0, revenue: 0, expense: 0, investment: 0 },
        week: { profit: 0, count: 0, revenue: 0, expense: 0, investment: 0 },
        month: { profit: 0, count: 0, revenue: 0, expense: 0, investment: 0 },
        total: { profit: 0, count: 0, revenue: 0, expense: 0, investment: 0 },
        period: { profit: 0, count: 0, revenue: 0, expense: 0, investment: 0 }
    };

    sales.forEach(s => {
        let sDate;
        if (s.timestamp) {
            sDate = new Date(s.timestamp);
        } else {
            const parts = s.date.split(',')[0].split('.');
            if (parts.length === 3) {
                sDate = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
                sDate = new Date(s.id);
            }
        }
        const p = getProfit(s);
        const revenue = s.items.reduce((sum, item) => sum + (item.priceUZS * item.cartQty), 0);
        const itemsCount = s.items.reduce((sum, item) => sum + (item.cartQty || 1), 0);

        stats.total.profit += p;
        stats.total.revenue += revenue;
        stats.total.count += itemsCount;

        if (sDate >= startOfDay) {
            stats.day.profit += p;
            stats.day.revenue += revenue;
            stats.day.count += itemsCount;
        }
        if (sDate >= startOfWeek) {
            stats.week.profit += p;
            stats.week.revenue += revenue;
            stats.week.count += itemsCount;
        }
        if (sDate >= startOfMonth) {
            stats.month.profit += p;
            stats.month.revenue += revenue;
            stats.month.count += itemsCount;
        }

        // Расчет за период
        let inPeriod = true;
        if (startLimit && sDate < startLimit) inPeriod = false;
        if (endLimit && sDate > endLimit) inPeriod = false;
        if (inPeriod) {
            stats.period.profit += p;
            stats.period.revenue += revenue;
            stats.period.count += itemsCount;
        }
    });

    // ВЫЧИТАЕМ ТОЛЬКО ОПЕРАЦИОННЫЕ РАСХОДЫ (ИСКЛЮЧАЕМ ЗАКУПКУ ТОВАРА ИЗ ПРИБЫЛИ)
    let totalInvested = 0;
    expenses.forEach(ex => {
        const exParts = ex.date.split('-');
        const exDate = new Date(exParts[0], exParts[1] - 1, exParts[2]);

        // Если это закупка товара, суммируем отдельно и НЕ вычитаем из прибыли
        if (ex.category === "Закупка товара") {
            totalInvested += ex.amount;
            stats.total.investment += ex.amount;

            if (exDate >= startOfDay) stats.day.investment += ex.amount;
            if (exDate >= startOfWeek) stats.week.investment += ex.amount;
            if (exDate >= startOfMonth) stats.month.investment += ex.amount;

            let inPeriodInv = true;
            if (startLimit && exDate < startLimit) inPeriodInv = false;
            if (endLimit && exDate > endLimit) inPeriodInv = false;
            if (inPeriodInv) {
                stats.period.investment += ex.amount;
            }
            return;
        }

        stats.total.profit -= ex.amount;
        stats.total.expense += ex.amount;

        if (exDate >= startOfDay) {
            stats.day.profit -= ex.amount;
            stats.day.expense += ex.amount;
        }
        if (exDate >= startOfWeek) {
            stats.week.profit -= ex.amount;
            stats.week.expense += ex.amount;
        }
        if (exDate >= startOfMonth) {
            stats.month.profit -= ex.amount;
            stats.month.expense += ex.amount;
        }

        // Расходы за период
        let inPeriod = true;
        if (startLimit && exDate < startLimit) inPeriod = false;
        if (endLimit && exDate > endLimit) inPeriod = false;
        if (inPeriod) {
            stats.period.profit -= ex.amount;
            stats.period.expense += ex.amount;
        }
    });

    // Обновляем UI (Главные карточки)
    const updateEl = (id, val, color, isNumeric) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerText = isNumeric ? window.format(Math.round(val)) : window.format(Math.round(val)) + " сум";
            if (color) el.style.color = color;
        }
    };

    const isToday = statsStart === todayStr && statsEnd === todayStr;
    const labelSuffix = isToday ? "(сегодня)" : "за период";
    
    if (document.getElementById('label-revenue')) document.getElementById('label-revenue').innerText = "Торговля " + labelSuffix;
    if (document.getElementById('label-expense')) document.getElementById('label-expense').innerText = "Расход " + labelSuffix;
    if (document.getElementById('label-profit')) document.getElementById('label-profit').innerText = "Чистая прибыль " + labelSuffix;
    if (document.getElementById('label-count')) document.getElementById('label-count').innerText = "Продано товаров " + labelSuffix;
    if (document.getElementById('label-investment')) document.getElementById('label-investment').innerText = "Закупка товара " + labelSuffix;

    updateEl('stats-daily-revenue', stats.period.revenue);
    updateEl('stats-daily-expense', stats.period.expense, '#ef4444');
    updateEl('stats-daily-profit', stats.period.profit, stats.period.profit >= 0 ? 'var(--success)' : '#ef4444');
    updateEl('stats-period-count', stats.period.count, '', true);
    updateEl('stats-daily-investment', stats.period.investment, '#f59e0b');

    // Сводка
    const monthExpensesOnly = expenses.filter(ex =>
        new Date(ex.date) >= startOfMonth &&
        ex.category !== "Закупка товара"
    ).reduce((sum, e) => sum + e.amount, 0);

    const monthInvestmentsOnly = expenses.filter(ex =>
        new Date(ex.date) >= startOfMonth &&
        ex.category === "Закупка товара"
    ).reduce((sum, e) => sum + e.amount, 0);

    const summaryText = document.getElementById('stats-summary-text');
    if (summaryText) {
        summaryText.innerHTML = `
            В этом месяце продано <b>${stats.month.count}</b> ед. товара.<br><br>
            <b>Чистая прибыль:</b> <br>
            <span style="color: ${stats.month.profit >= 0 ? 'var(--success)' : '#ef4444'}; font-weight: 700; font-size: 1.1em;">
                ${window.format(Math.round(stats.month.profit))} сум
            </span><br>
            <small style="color: var(--text-muted); font-size: 11px;">(Маржа минус операционные расходы)</small>
            <br><br>
            Общие расходы (аренда и т.д.): <br>
            <span style="color: #ef4444; font-weight: 600;">-${window.format(monthExpensesOnly)} сум</span>
            <br><br>
            Закупка нового товара: <br>
            <span style="color: var(--accent); font-weight: 600;">${window.format(monthInvestmentsOnly)} сум</span>
            <br>
            <small style="color: var(--text-muted); font-size: 11px;">(Не вычитается из чистой прибыли)</small>
        `;
    }
}

export function renderExpensesBreakdown() {
    const container = document.getElementById('stats-expenses-breakdown');
    if (!container) return;
    container.innerHTML = '';

    const query = (document.getElementById('expenseSearch')?.value || '').toLowerCase();
    const expenses = (window.expenses || []).filter(ex =>
        ex.category.toLowerCase().includes(query) ||
        ex.comment.toLowerCase().includes(query)
    );

    const statsStart = document.getElementById('statsStart')?.value;
    const statsEnd = document.getElementById('statsEnd')?.value;

    let startLimit = null;
    if (statsStart) {
        const parts = statsStart.split('-');
        startLimit = new Date(parts[0], parts[1] - 1, parts[2]);
    }
    let endLimit = null;
    if (statsEnd) {
        const parts = statsEnd.split('-');
        endLimit = new Date(parts[0], parts[1] - 1, parts[2]);
        endLimit.setHours(23, 59, 59, 999);
    }

    // Группировка: Месяц -> День -> Категория/Расход
    const data = {};

    expenses.forEach(ex => {
        const exParts = ex.date.split('-');
        const exDate = new Date(exParts[0], exParts[1] - 1, exParts[2]);

        // Применяем фильтр по датам
        if (startLimit && exDate < startLimit) return;
        if (endLimit && exDate > endLimit) return;

        const monthKey = exDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
        const dayKey = exDate.toLocaleDateString('ru-RU');

        if (!data[monthKey]) data[monthKey] = { total: 0, days: {} };
        if (!data[monthKey].days[dayKey]) data[monthKey].days[dayKey] = { total: 0, items: [] };

        data[monthKey].total += ex.amount;
        data[monthKey].days[dayKey].total += ex.amount;
        data[monthKey].days[dayKey].items.push(ex);
    });

    // Отрисовка расходов
    Object.keys(data).sort((a, b) => {
        const parseMonth = (str) => {
            const parts = str.split(' ');
            const months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
            return new Date(parts[1], months.indexOf(parts[0].toLowerCase()));
        };
        return parseMonth(b) - parseMonth(a);
    }).forEach(month => {
        const monthInfo = data[month];

        const monthDiv = document.createElement('div');
        monthDiv.className = 'month-group';

        const isInvestmentMonth = monthInfo.total > 0; // Для визуального стиля

        monthDiv.innerHTML = `
            <div class="stats-group-header" onclick="this.nextElementSibling.classList.toggle('active')" style="display:flex; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.05); border-radius:8px; cursor:pointer; font-weight:700;">
                <span>📅 ${month}</span>
                <span style="color:${isInvestmentMonth ? 'var(--text)' : '#ef4444'}">${window.format(monthInfo.total)} сум</span>
            </div>
            <div class="stats-group-content" style="display:none; padding-left:15px; margin-top:5px; flex-direction:column; gap:8px;"></div>
        `;

        const daysContent = monthDiv.querySelector('.stats-group-content');

        Object.keys(monthInfo.days).sort((a, b) => {
            const dateA = new Date(a.split('.').reverse().join('-'));
            const dateB = new Date(b.split('.').reverse().join('-'));
            return dateB - dateA;
        }).forEach(day => {
            const dayInfo = monthInfo.days[day];
            const dayDiv = document.createElement('div');
            dayDiv.innerHTML = `
                <div class="stats-day-header" onclick="this.nextElementSibling.classList.toggle('active')" style="display:flex; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:6px; cursor:pointer; font-size:14px;">
                    <span>📍 ${day}</span>
                    <span style="font-weight:600;">${window.format(dayInfo.total)} сум</span>
                </div>
                <div class="stats-day-content" style="display:none; padding:10px 15px; border-left:2px solid var(--accent); margin:5px 0 5px 10px; flex-direction:column; gap:8px;">
                    ${dayInfo.items.map(ex => {
                const isInv = ex.category === "Закупка товара";
                return `
                        <div style="background:rgba(255,255,255,0.02); border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center; border: ${isInv ? '1px solid rgba(139, 92, 246, 0.2)' : 'none'}">
                            <div>
                                <div style="font-weight:600; font-size:14px; color:${isInv ? 'var(--accent)' : 'var(--text)'};">${ex.category}</div>
                                <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${ex.comment}</div>
                            </div>
                            <div style="display:flex; align-items:center; gap:15px;">
                                <div style="font-weight:700; color:${isInv ? 'var(--accent)' : '#ef4444'};">${isInv ? '' : '-'}${window.format(ex.amount)}</div>
                                <button class="btn-icon-danger" onclick="window.StatsModule.deleteExpense(${ex.id})" style="width:28px; height:28px;">×</button>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            `;
            daysContent.appendChild(dayDiv);
        });

        container.appendChild(monthDiv);
    });
}

export function renderProfitBreakdown() {
    const container = document.getElementById('stats-profit-breakdown');
    if (!container) return;
    container.innerHTML = '';

    const rates = window.fetchRates();
    const sales = window.sales || [];

    // Группировка: Месяц -> День -> Товар
    const data = {};

    const statsStart = document.getElementById('statsStart')?.value;
    const statsEnd = document.getElementById('statsEnd')?.value;

    let startLimit = null;
    if (statsStart) {
        const parts = statsStart.split('-');
        startLimit = new Date(parts[0], parts[1] - 1, parts[2]);
    }
    let endLimit = null;
    if (statsEnd) {
        const parts = statsEnd.split('-');
        endLimit = new Date(parts[0], parts[1] - 1, parts[2]);
        endLimit.setHours(23, 59, 59, 999);
    }

    sales.forEach(s => {
        let sDate;
        if (s.timestamp) sDate = new Date(s.timestamp);
        else {
            const parts = s.date.split(',')[0].split('.');
            if (parts.length === 3) sDate = new Date(parts[2], parts[1] - 1, parts[0]);
            else sDate = new Date(s.id);
        }

        // Применяем фильтр
        if (startLimit && sDate < startLimit) return;
        if (endLimit && sDate > endLimit) return;

        const monthKey = sDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
        const dayKey = sDate.toLocaleDateString('ru-RU');

        if (!data[monthKey]) data[monthKey] = { profit: 0, days: {} };
        if (!data[monthKey].days[dayKey]) data[monthKey].days[dayKey] = { profit: 0, products: {} };

        s.items.forEach(item => {
            const costUZS = window.getCostUZS(item, rates);
            const profit = (item.priceUZS - costUZS) * item.cartQty;

            data[monthKey].profit += profit;
            data[monthKey].days[dayKey].profit += profit;

            if (!data[monthKey].days[dayKey].products[item.name]) {
                data[monthKey].days[dayKey].products[item.name] = {
                    qty: 0,
                    profit: 0,
                    totalSalePrice: 0,
                    totalCost: 0,
                    priceCNY: item.priceCNY || 0
                };
            }
            data[monthKey].days[dayKey].products[item.name].qty += item.cartQty;
            data[monthKey].days[dayKey].products[item.name].profit += profit;
            data[monthKey].days[dayKey].products[item.name].totalSalePrice += item.priceUZS * item.cartQty;
            data[monthKey].days[dayKey].products[item.name].totalCost += costUZS * item.cartQty;
        });
    });

    // Отрисовка
    Object.keys(data).sort((a, b) => {
        const parseMonth = (str) => {
            const parts = str.split(' ');
            const months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
            return new Date(parts[1], months.indexOf(parts[0].toLowerCase()));
        };
        return parseMonth(b) - parseMonth(a);
    }).forEach(month => {
        const monthInfo = data[month];

        const monthDiv = document.createElement('div');
        monthDiv.className = 'month-group';
        monthDiv.innerHTML = `
            <div class="stats-group-header" onclick="this.nextElementSibling.classList.toggle('active')" style="display:flex; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.05); border-radius:8px; cursor:pointer; font-weight:700;">
                <span>📅 ${month}</span>
                <span style="color:var(--success)">${window.format(Math.round(monthInfo.profit))} сум</span>
            </div>
            <div class="stats-group-content" style="display:none; padding-left:15px; margin-top:5px; flex-direction:column; gap:8px;"></div>
        `;

        const daysContent = monthDiv.querySelector('.stats-group-content');

        Object.keys(monthInfo.days).sort((a, b) => {
            const dateA = new Date(a.split('.').reverse().join('-'));
            const dateB = new Date(b.split('.').reverse().join('-'));
            return dateB - dateA;
        }).forEach(day => {
            const dayInfo = monthInfo.days[day];
            const dayDiv = document.createElement('div');
            dayDiv.innerHTML = `
                <div class="stats-day-header" onclick="this.nextElementSibling.classList.toggle('active')" style="display:flex; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:6px; cursor:pointer; font-size:14px;">
                    <span>📍 ${day}</span>
                    <span style="font-weight:600;">${window.format(Math.round(dayInfo.profit))} сум</span>
                </div>
                <div class="stats-day-content" style="display:none; padding:10px 15px; border-left:2px solid var(--accent); margin:5px 0 5px 10px;">
                    ${Object.keys(dayInfo.products).map(pName => {
                const prod = dayInfo.products[pName];
                const avgSalePrice = prod.totalSalePrice / prod.qty;
                const avgCost = prod.totalCost / prod.qty;
                return `
                        <div style="background:rgba(255,255,255,0.02); border-radius:8px; padding:10px; margin-bottom:8px;">
                            <div style="font-weight:600; margin-bottom:8px; color:var(--text);">${pName}</div>
                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:8px; font-size:12px;">
                                <div style="background:rgba(59,130,246,0.1); padding:6px 10px; border-radius:6px;">
                                    <div style="color:var(--text-muted); font-size:10px; text-transform:uppercase;">Количество</div>
                                    <div style="font-weight:700; color:var(--primary);">${prod.qty} шт</div>
                                </div>
                                <div style="background:rgba(16,185,129,0.1); padding:6px 10px; border-radius:6px;">
                                    <div style="color:var(--text-muted); font-size:10px; text-transform:uppercase;">Продано на</div>
                                    <div style="font-weight:700; color:var(--success);">${window.format(Math.round(prod.totalSalePrice))} сум</div>
                                </div>
                                <div style="background:rgba(245,158,11,0.1); padding:6px 10px; border-radius:6px;">
                                    <div style="color:var(--text-muted); font-size:10px; text-transform:uppercase;">Себестоимость</div>
                                    <div style="font-weight:700; color:#f59e0b;">${window.format(Math.round(prod.totalCost))} сум</div>
                                </div>
                                <div style="background:rgba(34,197,94,0.1); padding:6px 10px; border-radius:6px;">
                                    <div style="color:var(--text-muted); font-size:10px; text-transform:uppercase;">Прибыль</div>
                                    <div style="font-weight:700; color:#22c55e;">+${window.format(Math.round(prod.profit))} сум</div>
                                </div>
                            </div>
                            <div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.05); font-size:11px; color:var(--text-muted);">
                                <span>Цена за шт: ${window.format(Math.round(avgSalePrice))} сум</span>
                                <span style="margin-left:15px;">Себестоимость за шт: ${window.format(Math.round(avgCost))} сум</span>
                                <span style="margin-left:15px; color:var(--success);">Прибыль за шт: +${window.format(Math.round(prod.profit / prod.qty))} сум</span>
                            </div>
                        </div>
                        `;
            }).join('')}
                </div>
            `;
            daysContent.appendChild(dayDiv);
        });

        container.appendChild(monthDiv);
    });

    if (!document.getElementById('stats-extra-styles')) {
        const style = document.createElement('style');
        style.id = 'stats-extra-styles';
        style.textContent = `
            .stats-group-content.active, .stats-day-content.active { 
                display: flex !important; 
                flex-direction: column !important;
                gap: 5px;
            }
        `;
        document.head.appendChild(style);
    }
}


export function addExpense() {
    const date = document.getElementById('expDate').value;
    const category = document.getElementById('expCategory').value;
    const amount = parseInt(document.getElementById('expAmount').value) || 0;
    const comment = document.getElementById('expComment').value.trim();

    if (!date || !amount) return alert("Заполните дату и сумму");

    const newExpense = {
        id: Date.now(),
        date,
        category,
        amount,
        comment: comment || category
    };

    if (!window.expenses) window.expenses = [];
    window.expenses.push(newExpense);

    // Очистка формы
    document.getElementById('expAmount').value = '';
    document.getElementById('expComment').value = '';

    renderStats();
    if (window.saveAll) window.saveAll();
}

export function deleteExpense(id) {
    if (confirm("Удалить этот расход?")) {
        window.expenses = window.expenses.filter(ex => ex.id !== id);
        renderStats();
        if (window.saveAll) window.saveAll();
    }
}

export function init() {
    console.log('📈 Модуль Статистики инициализирован');
    const todayStr = new Date().toISOString().split('T')[0];
    
    const expDateInput = document.getElementById('expDate');
    if (expDateInput) expDateInput.value = todayStr;

    const statsStart = document.getElementById('statsStart');
    const statsEnd = document.getElementById('statsEnd');
    if (statsStart && !statsStart.value) statsStart.value = todayStr;
    if (statsEnd && !statsEnd.value) statsEnd.value = todayStr;
}
