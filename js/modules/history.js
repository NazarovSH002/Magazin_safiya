// === МОДУЛЬ ИСТОРИИ, ДОЛГОВ И РАССРОЧКИ ===

const format = window.format;

export function renderDebts() {
    const debts = window.debts || [];
    const tbody = document.getElementById('debts-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    debts.forEach((d, idx) => {
        const remaining = d.total - (d.paid || 0);
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') toggleDetails(d.id);
        };
        tr.innerHTML = `
            <td style="font-size:12px;">${d.date.split(',')[0]}</td>
            <td style="font-weight:600">${d.customer}</td>
            <td style="font-size:12px; max-width:200px; color:var(--text-muted)">${Array.isArray(d.items) ? d.items.length + ' позиций' : d.items}</td>
            <td style="font-weight:700;">${format(d.total)}</td>
            <td style="color:var(--danger); font-weight:700;">${format(remaining)}</td>
            <td><span class="badge" style="background:rgba(245, 158, 11, 0.2); color:var(--accent); border: 1px solid rgba(245, 158, 11, 0.3);">${remaining <= 0 ? 'Погашен' : 'Не оплачен'}</span></td>
            <td>
                <div class="actions-cell">
                    <button class="btn btn-success btn-sm" onclick="HistoryModule.settleDebt(${idx})">Погасить</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);

        // Детали (товары + платежи)
        const detailTr = document.createElement('tr');
        detailTr.id = `details-${d.id}`;
        detailTr.className = 'details-row';

        let itemsHtml = Array.isArray(d.items) ? d.items.map(i => `
            <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px;">
                <span>${i.name} x ${i.cartQty}</span>
                <span>${format(i.priceUZS * i.cartQty)} сум</span>
            </div>
        `).join('') : `<div style="font-size:13px;">${d.items}</div>`;

        let paymentsHtml = (d.payments || []).map(p => `
            <div style="display:flex; justify-content:space-between; padding:4px 0; color:var(--success); font-size:12px;">
                <span>📅 ${p.date}</span>
                <span>+${format(p.amount)} сум ${p.comment ? `<small style="color:var(--text-muted)">(${p.comment})</small>` : ''}</span>
            </div>
        `).join('') || '<div style="color:var(--text-muted); font-size:12px;">Платежей пока не было</div>';

        detailTr.innerHTML = `
            <td colspan="7" style="padding:15px; background:rgba(255,255,255,0.02); border-left: 2px solid var(--accent);">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px;">
                    <div>
                        <p style="font-size:11px; color:var(--text-muted); margin-bottom:8px; font-weight:700; text-transform:uppercase;">📦 Товары в заказе:</p>
                        ${itemsHtml}
                    </div>
                    <div>
                        <p style="font-size:11px; color:var(--text-muted); margin-bottom:8px; font-weight:700; text-transform:uppercase;">💸 История погашений:</p>
                        ${paymentsHtml}
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(detailTr);
    });
}

export function settleDebt(idx) {
    const debt = window.debts[idx];
    openPaymentModal(idx, 'debt', debt.customer, debt.total - (debt.paid || 0));
}

export function payInstallment(idx) {
    const ins = window.installments[idx];
    openPaymentModal(idx, 'installment', ins.customer, ins.total - (ins.paid || 0));
}

export function openPaymentModal(idx, type, customer, remaining) {
    document.getElementById('payment-modal-title').innerText = `Платеж: ${customer} (Остаток: ${format(remaining)})`;
    document.getElementById('payment-item-idx').value = idx;
    document.getElementById('payment-item-type').value = type;
    document.getElementById('payment-amount').value = remaining;
    document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('payment-comment').value = '';

    document.getElementById('payment-modal').classList.add('active');
}

export function closePaymentModal() {
    document.getElementById('payment-modal').classList.remove('active');
}

export async function submitPayment() {
    const idx = parseInt(document.getElementById('payment-item-idx').value);
    const type = document.getElementById('payment-item-type').value;
    const amount = parseInt(document.getElementById('payment-amount').value);
    const date = document.getElementById('payment-date').value;
    const comment = document.getElementById('payment-comment').value;

    if (!amount || isNaN(amount)) return alert("Введите корректную сумму");

    const item = type === 'debt' ? window.debts[idx] : window.installments[idx];
    if (!item) return closePaymentModal();

    if (!item.payments) item.payments = [];
    item.payments.push({ date, amount, comment });

    item.paid = (item.paid || 0) + amount;

    if (item.paid >= item.total) {
        const saleH = window.sales.find(s => s.id === item.id);
        if (saleH) saleH.type = type === 'debt' ? "ОПЛАЧЕН (Был долг)" : "ВЫПЛАЧЕНО (Рассрочка)";

        if (type === 'debt') window.debts.splice(idx, 1);
        alert("Полностью погашено!");
    } else {
        alert(`Платеж принят: ${format(amount)}. Остаток: ${format(item.total - item.paid)}`);
    }

    closePaymentModal();
    if (type === 'debt') renderDebts();
    else renderInstallments();
    if (window.saveAll) await window.saveAll();
}

export function renderInstallments() {
    const installments = window.installments || [];
    const tbody = document.getElementById('installments-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    installments.forEach((ins, idx) => {
        const remaining = ins.total - (ins.paid || 0);
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') toggleDetails(ins.id);
        };
        tr.innerHTML = `
            <td style="font-size:12px;">${ins.date.split(',')[0]}</td>
            <td style="font-weight:600">${ins.customer}</td>
            <td style="font-weight:700;">${format(ins.total)}</td>
            <td style="color:var(--danger); font-weight:700;">${format(remaining)}</td>
            <td><span class="badge" style="background:rgba(59, 130, 246, 0.1); color:#3b82f6; border: 1px solid rgba(59, 130, 246, 0.2);">${remaining <= 0 ? 'Выплачено' : 'Активна'}</span></td>
            <td>
                <div class="actions-cell">
                    <button class="btn btn-primary btn-sm" onclick="HistoryModule.payInstallment(${idx})">Внести платеж</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);

        // Детали рассрочки
        const detailTr = document.createElement('tr');
        detailTr.id = `details-${ins.id}`;
        detailTr.className = 'details-row';

        let itemsHtml = Array.isArray(ins.items) ? ins.items.map(i => `
            <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px;">
                <span>${i.name} x ${i.cartQty}</span>
                <span>${format(i.priceUZS * i.cartQty)} сум</span>
            </div>
        `).join('') : `<div style="font-size:13px;">${ins.items}</div>`;

        let paymentsHtml = (ins.payments || []).map(p => `
            <div style="display:flex; justify-content:space-between; padding:4px 0; color:var(--success); font-size:12px;">
                <span>📅 ${p.date}</span>
                <span>+${format(p.amount)} сум ${p.comment ? `<small style="color:var(--text-muted)">(${p.comment})</small>` : ''}</span>
            </div>
        `).join('') || '<div style="color:var(--text-muted); font-size:12px;">Платежей пока не было</div>';

        detailTr.innerHTML = `
            <td colspan="6" style="padding:15px; background:rgba(255,255,255,0.02); border-left: 2px solid #3b82f6;">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px;">
                    <div>
                        <p style="font-size:11px; color:var(--text-muted); margin-bottom:8px; font-weight:700; text-transform:uppercase;">📦 Товары в рассрочке:</p>
                        ${itemsHtml}
                    </div>
                    <div>
                        <p style="font-size:11px; color:var(--text-muted); margin-bottom:8px; font-weight:700; text-transform:uppercase;">💸 График выплат (фактически):</p>
                        ${paymentsHtml}
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(detailTr);
    });
}

export function renderHistory() {
    const sales = window.sales || [];
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    sales.forEach(s => {
        const hasDetails = Array.isArray(s.items);
        const tr = document.createElement('tr');
        tr.style.cursor = hasDetails ? 'pointer' : 'default';
        tr.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') toggleDetails(s.id);
        };

        tr.innerHTML = `
            <td style="font-size:12px;">${s.date}</td>
            <td style="font-weight:600;">${s.customer}</td>
            <td style="font-weight:700; color:var(--success);">${format(s.total)}</td>
            <td><span class="badge" style="background:rgba(255,255,255,0.05); color:var(--text-muted); border: 1px solid var(--border);">${s.type}</span></td>
            <td>
                <div class="actions-cell" style="justify-content: flex-end;">
                    <button class="btn btn-primary btn-sm" onclick="HistoryModule.printReceipt(${s.id})" title="Печать чека">🖨️</button>
                    <button class="btn-icon-danger" onclick="HistoryModule.deleteHistory(${s.id})" title="Удалить">×</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);

        // Строка с деталями (скрытая)
        if (hasDetails) {
            const detailTr = document.createElement('tr');
            detailTr.id = `details-${s.id}`;
            detailTr.className = 'details-row';
            let itemsHtml = s.items.map(item => `
                <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #333;">
                    <span>${item.name} x ${item.cartQty}</span>
                    <span>${format(item.priceUZS * item.cartQty)} сум</span>
                </div>
            `).join('');

            detailTr.innerHTML = `
                <td colspan="5" style="padding:15px; background:rgba(255,255,255,0.03);">
                    <div style="max-width:400px;">
                        <p style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">СОСТАВ ЗАКАЗА:</p>
                        ${itemsHtml}
                        ${s.comment ? `<p style="margin-top:15px; font-size:12px; color:var(--accent);">💬 Комментарий: ${s.comment}</p>` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(detailTr);
        }
    });
}

export function toggleDetails(id) {
    const el = document.getElementById(`details-${id}`);
    if (el) el.classList.toggle('active');
}

export function printReceipt(id) {
    const s = window.sales.find(x => x.id === id);
    if (!s) return;

    const printSection = document.getElementById('print-section');
    printSection.style.display = 'block';

    let itemsHtml = "";
    if (Array.isArray(s.items)) {
        itemsHtml = s.items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td style="text-align:center">${item.cartQty}</td>
                <td style="text-align:right">${format(item.priceUZS)}</td>
                <td style="text-align:right">${format(item.priceUZS * item.cartQty)}</td>
            </tr>
        `).join('');
    } else {
        itemsHtml = `<tr><td colspan="4">${s.items}</td></tr>`;
    }

    printSection.innerHTML = `
        <div style="font-family: 'Inter', Arial, sans-serif; color: #000 !important; padding: 40px; border: 2px solid #000; max-width: 800px; margin: 0 auto; background: #fff;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px;">
                <h1 style="margin: 0; font-size: 28px; letter-spacing: 2px; text-transform: uppercase; color: #000 !important;">Товарный Чек</h1>
                <p style="margin: 5px 0; color: #000 !important;">№ ${s.id}</p>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; color: #000 !important;">
                <div>
                    <p style="margin: 0 0 5px 0; color: #000 !important;"><strong>Дата:</strong> ${s.date}</p>
                    <p style="margin: 0; color: #000 !important;"><strong>Клиент:</strong> ${s.customer}</p>
                </div>
                <div style="text-align: right; color: #000 !important;">
                    <p style="margin: 0 0 5px 0; color: #000 !important;"><strong>Тип оплаты:</strong> ${s.type}</p>
                    ${s.comment ? `<p style="margin: 5px 0 0 0; color: #000 !important;"><strong>Комментарий:</strong> ${s.comment}</p>` : ''}
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; color: #000 !important;">
                <thead>
                    <tr style="border-top: 2px solid #000; border-bottom: 1px solid #000;">
                        <th style="padding: 12px 8px; text-align: center; width: 40px; color: #000 !important;">№</th>
                        <th style="padding: 12px 8px; text-align: left; color: #000 !important;">Наименование товара</th>
                        <th style="padding: 12px 8px; text-align: center; width: 80px; color: #000 !important;">Кол-во</th>
                        <th style="padding: 12px 8px; text-align: right; width: 120px; color: #000 !important;">Цена</th>
                        <th style="padding: 12px 8px; text-align: right; width: 140px; color: #000 !important;">Сумма</th>
                    </tr>
                </thead>
                <tbody style="font-size: 14px; color: #000 !important;">
                    ${(() => {
            let finalRows = [];
            if (Array.isArray(s.items)) {
                finalRows = s.items.map(item => ({
                    name: item.name,
                    qty: item.cartQty,
                    price: item.priceUZS,
                    total: (parseInt(item.priceUZS) || 0) * item.cartQty
                }));
            } else if (typeof s.items === 'string') {
                const parts = s.items.split(', ');
                finalRows = parts.map(p => {
                    const qtyMatch = p.match(/\((\d+)шт/);
                    const priceMatch = p.match(/×\s*([\d\s]+)\)/);
                    return {
                        name: p.split(' (')[0],
                        qty: qtyMatch ? qtyMatch[1] : "-",
                        price: priceMatch ? priceMatch[1].replace(/\s/g, '') : "-",
                        total: "-"
                    };
                });
            }

            return finalRows.map((row, idx) => `
                            <tr style="border-bottom: 1px solid #000; color: #000 !important;">
                                <td style="padding: 12px 8px; text-align: center; color: #000 !important;">${idx + 1}</td>
                                <td style="padding: 12px 8px; font-weight: 500; color: #000 !important;">${row.name}</td>
                                <td style="padding: 12px 8px; text-align: center; color: #000 !important;">${row.qty}</td>
                                <td style="padding: 12px 8px; text-align: right; color: #000 !important;">${format(row.price)}</td>
                                <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: #000 !important;">${format(row.total)}</td>
                            </tr>
                        `).join('');
        })()}
                </tbody>
                <tfoot>
                    <tr style="color: #000 !important;">
                        <td colspan="3"></td>
                        <td style="padding: 20px 8px; text-align: right; font-size: 14px; font-weight: bold; text-transform: uppercase; color: #000 !important;">Итого к оплате:</td>
                        <td style="padding: 20px 8px; text-align: right; font-size: 20px; font-weight: 800; border-bottom: 3px double #000; color: #000 !important;">${format(s.total)} UZS</td>
                    </tr>
                </tfoot>
            </table>

            <div style="margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 100px; font-size: 14px; color: #000 !important;">
                <div style="border-top: 1px solid #000; padding-top: 10px; text-align: center; color: #000 !important;">Покупатель</div>
                <div style="border-top: 1px solid #000; padding-top: 10px; text-align: center; color: #000 !important;">М.П. Продавец</div>
            </div>
            
            <div style="text-align: center; margin-top: 80px; padding-top: 20px; border-top: 2px dashed #000; color: #000 !important;">
                <p style="margin: 0; font-style: italic; color: #000 !important;">Спасибо за ваш выбор! Ждем вас снова.</p>
            </div>
        </div>
    `;

    window.print();
    printSection.style.display = 'none';
}

export async function deleteHistory(id) {
    if (confirm("Удалить запись из истории? (Остатки не вернутся)")) {
        window.sales = window.sales.filter(s => s.id !== id);
        renderHistory();
        if (window.saveAll) await window.saveAll();
    }
}

export function exportHistoryCSV() {
    let csv = "\ufeffДата;Клиент;Сумма;Тип;Товары\n";
    window.sales.forEach(s => {
        let itemsStr = "";
        if (Array.isArray(s.items)) {
            itemsStr = s.items.map(i => `${i.name} (${i.cartQty}шт)`).join(', ');
        } else {
            itemsStr = s.items;
        }
        csv += `${s.date};${s.customer};${s.total};${s.type};"${itemsStr.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `history_${new Date().toLocaleDateString()}.csv`;
    link.click();
}

export function printReport(type) {
    const printSection = document.getElementById('print-section');
    printSection.style.display = 'block';

    let title = "";
    let headers = [];
    let rowsHtml = "";

    if (type === 'stock') {
        title = "Отчет: Остатки на складе";
        headers = ["Наименование", "Кол-во", "Закуп ($)", "Цена (сум)"];
        rowsHtml = window.products.map(p => `
            <tr>
                <td>${p.name}</td>
                <td style="text-align:center">${p.qty}</td>
                <td style="text-align:right">${p.priceCNY} ¥</td>
                <td style="text-align:right">${format(p.priceUZS)}</td>
            </tr>
        `).join('');
    } else if (type === 'shop') {
        title = "Отчет: Наличие в магазине";
        headers = ["Наименование", "Кол-во", "Цена (сум)"];
        rowsHtml = window.shopProducts.map(s => `
            <tr>
                <td>${s.name}</td>
                <td style="text-align:center">${s.qty}</td>
                <td style="text-align:right">${format(s.priceUZS)}</td>
            </tr>
        `).join('');
    } else if (type === 'debts') {
        title = "Отчет: Список должников";
        headers = ["Дата", "Клиент", "Сумма", "Остаток"];
        rowsHtml = window.debts.map(d => `
            <tr>
                <td>${d.date.split(',')[0]}</td>
                <td>${d.customer}</td>
                <td style="text-align:right">${format(d.total)}</td>
                <td style="text-align:right; font-weight:700; color:#000;">${format(d.total - (d.paid || 0))}</td>
            </tr>
        `).join('');
    } else if (type === 'installments') {
        title = "Отчет: Рассрочка";
        headers = ["Дата", "Клиент", "Сумма", "Остаток"];
        rowsHtml = window.installments.map(ins => `
            <tr>
                <td>${ins.date.split(',')[0]}</td>
                <td>${ins.customer}</td>
                <td style="text-align:right">${format(ins.total)}</td>
                <td style="text-align:right; font-weight:700; color:#000;">${format(ins.total - (ins.paid || 0))}</td>
            </tr>
        `).join('');
    } else if (type === 'retail-daily') {
        const dateInput = document.getElementById('retailDate');
        const selectedDate = dateInput ? new Date(dateInput.value).toLocaleDateString() : new Date().toLocaleDateString();
        title = `Отчет по рознице за ${selectedDate}`;
        headers = ["Чек", "Время", "Клиент", "Тип", "Сумма"];
        const daySales = window.sales.filter(s => s.date.includes(selectedDate));
        rowsHtml = daySales.map(s => `
            <tr>
                <td>#${s.id.toString().slice(-4)}</td>
                <td style="text-align:center">${s.date.split(',')[1] || ''}</td>
                <td>${s.customer}</td>
                <td style="text-align:center; font-size:10px;">${s.type}</td>
                <td style="text-align:right; font-weight:700;">${format(s.total)}</td>
            </tr>
        `).join('');
    }

    printSection.innerHTML = `
        <div style="font-family: 'Inter', Arial, sans-serif; color: #000 !important; padding: 40px; border: 2px solid #000; max-width: 900px; margin: 0 auto; background: #fff;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px;">
                <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; color: #000 !important;">${title}</h1>
                <p style="margin: 5px 0; color: #000 !important;">Дата выгрузки: ${new Date().toLocaleString()}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; color: #000 !important; border: 1px solid #000;">
                <thead>
                    <tr style="background: #f0f0f0;">
                        <th style="padding: 10px; border: 1px solid #000; text-align: center; width: 40px;">№</th>
                        ${headers.map(h => {
        let alignment = 'center';
        if (h === 'Наименование' || h === 'Клиент') alignment = 'left';
        return `<th style="padding: 10px; border: 1px solid #000; text-align: ${alignment};">${h}</th>`;
    }).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml.split('</tr>').filter(r => r.trim()).map((row, idx) => {
        let styledRow = row.replace('<tr>', `<tr><td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000 !important; font-weight: 500;">${idx + 1}</td>`);
        return styledRow.replace(/<td/g, '<td style="padding: 8px; border: 1px solid #000; color: #000 !important; font-weight: 500;"');
    }).join('')}
                </tbody>
            </table>

            <div style="margin-top: 40px; text-align: right; font-weight: bold; font-size: 16px; color: #000 !important;">
                Подпись: ____________________
            </div>
        </div>
    `;

    window.print();
    printSection.style.display = 'none';
}
