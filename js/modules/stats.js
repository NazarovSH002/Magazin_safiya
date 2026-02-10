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
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)));
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const rates = window.fetchRates();
    const sales = window.sales || [];
    const expenses = window.expenses || [];

    const getProfit = (sale) => {
        let saleProfit = 0;
        sale.items.forEach(item => {
            const priceCNY = item.priceCNY || 0;
            const costUZS = (priceCNY / rates.cny) * rates.uzs;
            const itemProfit = (item.priceUZS - costUZS) * item.cartQty;
            saleProfit += itemProfit;
        });
        return saleProfit;
    };

    const stats = {
        day: { profit: 0, count: 0 },
        week: { profit: 0, count: 0 },
        month: { profit: 0, count: 0 },
        total: { profit: 0, count: 0 }
    };

    sales.forEach(s => {
        const sDate = new Date(s.id); // Используем ID как timestamp для точности даты
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
    });

    // Вычитаем расходы
    expenses.forEach(ex => {
        const exDate = new Date(ex.date);
        stats.total.profit -= ex.amount;

        if (exDate >= startOfDay) stats.day.profit -= ex.amount;
        if (exDate >= startOfWeek) stats.week.profit -= ex.amount;
        if (exDate >= startOfMonth) stats.month.profit -= ex.amount;
    });

    // Обновляем UI
    updateStatCard('day', stats.day);
    updateStatCard('week', stats.week);
    updateStatCard('month', stats.month);
    updateStatCard('total', stats.total);

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
