// === МОДУЛЬ СТАТИСТИКИ И РАСХОДОВ ===

export function renderStats() {
    const tbody = document.getElementById('expenses-tbody');
    const query = (document.getElementById('expenseSearch')?.value || '').toLowerCase();
    if (!tbody) return;

    // 1. Рендерим таблицу расходов
    tbody.innerHTML = '';
    const filteredExpenses = (window.expenses || [])
        .filter(ex =>
            ex.category.toLowerCase().includes(query) ||
            ex.comment.toLowerCase().includes(query)
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    filteredExpenses.forEach(ex => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-size: 12px;">${new Date(ex.date).toLocaleDateString()}</td>
            <td><span class="badge" style="background: rgba(59, 130, 246, 0.1); color: var(--primary); padding: 4px 8px; border-radius: 6px; font-size: 11px;">${ex.category}</span></td>
            <td style="font-size: 13px; color: var(--text-muted);">${ex.comment}</td>
            <td style="font-weight: 700; color: #ef4444;">-${window.format(ex.amount)}</td>
            <td><button class="btn-icon-danger" onclick="window.StatsModule.deleteExpense(${ex.id})">×</button></td>
        `;
        tbody.appendChild(tr);
    });

    // 2. Расчет прибыли и статистики
    calculateFinancials();
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

    const statsStart = document.getElementById('statsStart')?.value;
    const statsEnd = document.getElementById('statsEnd')?.value;

    const stats = {
        day: { profit: 0, count: 0 },
        week: { profit: 0, count: 0 },
        month: { profit: 0, count: 0 },
        total: { profit: 0, count: 0 },
        period: { profit: 0, count: 0 }
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

        stats.total.profit += p;
        stats.total.count++;

        if (sDate >= startOfDay) {
            stats.day.profit += p;
            stats.day.count++;
        }
        if (sDate >= startOfWeek) {
            stats.week.profit += p;
            stats.week.count++;
        }
        if (sDate >= startOfMonth) {
            stats.month.profit += p;
            stats.month.count++;
        }

        // Расчет за период
        let inPeriod = true;
        if (statsStart && sDate < new Date(statsStart)) inPeriod = false;
        if (statsEnd) {
            const endLimit = new Date(statsEnd);
            endLimit.setHours(23, 59, 59, 999);
            if (sDate > endLimit) inPeriod = false;
        }
        if (inPeriod) {
            stats.period.profit += p;
            stats.period.count++;
        }
    });

    // Вычитаем расходы
    expenses.forEach(ex => {
        const exParts = ex.date.split('-');
        const exDate = new Date(exParts[0], exParts[1] - 1, exParts[2]);
        stats.total.profit -= ex.amount;

        if (exDate >= startOfDay) stats.day.profit -= ex.amount;
        if (exDate >= startOfWeek) stats.week.profit -= ex.amount;
        if (exDate >= startOfMonth) stats.month.profit -= ex.amount;

        // Расходы за период
        let inPeriod = true;
        if (statsStart && exDate < new Date(statsStart)) inPeriod = false;
        if (statsEnd) {
            const endLimit = new Date(statsEnd);
            endLimit.setHours(23, 59, 59, 999);
            if (exDate > endLimit) inPeriod = false;
        }
        if (inPeriod) {
            stats.period.profit -= ex.amount;
        }
    });

    // Обновляем UI
    updateStatCard('day', stats.day);
    updateStatCard('week', stats.week);
    updateStatCard('month', stats.month);
    updateStatCard('total', stats.total);

    const periodEl = document.getElementById('stats-period-profit');
    if (periodEl) {
        periodEl.innerText = window.format(Math.round(stats.period.profit)) + " сум";
        periodEl.style.color = stats.period.profit >= 0 ? 'var(--success)' : '#ef4444';
    }

    renderProfitBreakdown();

    // Сводка
    const expMonth = expenses.filter(ex => new Date(ex.date) >= startOfMonth).reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('stats-summary-text').innerHTML = `
        В этом месяце вы совершили <b>${stats.month.count}</b> продаж.<br><br>
        Чистая прибыль (после расходов): <br>
        <span style="color: ${stats.month.profit >= 0 ? 'var(--success)' : '#ef4444'}; font-weight: 700;">
            ${window.format(Math.round(stats.month.profit))} сум
        </span><br><br>
        Общие расходы месяца: <br>
        <span style="color: #ef4444; font-weight: 600;">-${window.format(expMonth)} сум</span>
    `;
}

function updateStatCard(id, data) {
    const profitEl = document.getElementById(`stats-profit-${id}`);
    const salesEl = document.getElementById(`stats-sales-${id}`);
    if (profitEl) {
        profitEl.innerText = window.format(Math.round(data.profit)) + " сум";
        profitEl.style.color = data.profit >= 0 ? 'var(--success)' : '#ef4444';
    }
    if (salesEl) salesEl.innerText = `Продаж: ${data.count}`;
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

    sales.forEach(s => {
        let sDate;
        if (s.timestamp) sDate = new Date(s.timestamp);
        else {
            const parts = s.date.split(',')[0].split('.');
            if (parts.length === 3) sDate = new Date(parts[2], parts[1] - 1, parts[0]);
            else sDate = new Date(s.id);
        }

        // Применяем фильтр
        if (statsStart && sDate < new Date(statsStart)) return;
        if (statsEnd) {
            const endLimit = new Date(statsEnd);
            endLimit.setHours(23, 59, 59, 999);
            if (sDate > endLimit) return;
        }

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
    const dateInput = document.getElementById('expDate');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
}
