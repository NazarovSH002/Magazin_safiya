// === СИСТЕМА ДИНАМИЧЕСКОЙ ЗАГРУЗКИ HTML-ШАБЛОНОВ ===

const viewCache = {};
const viewContainer = document.getElementById('views-container');

// Карта шаблонов - все вкладки будут загружаться динамически
const viewTemplates = {
    dashboard: 'views/dashboard.html',
    stock: 'views/stock.html',
    shop: 'views/shop.html',
    retail: 'views/retail.html',
    wholesale: 'views/wholesale.html',
    debts: 'views/debts.html',
    installments: 'views/installments.html',
    history: 'views/history.html',
    users: 'views/users.html'
};

/**
 * Загружает HTML-шаблон для вкладки
 * @param {string} viewName - Название вкладки
 * @returns {Promise<boolean>} - true если загрузка успешна
 */
async function loadViewTemplate(viewName) {
    // Если шаблон уже загружен, пропускаем
    if (viewCache[viewName]) {
        return true;
    }

    // Если для этой вкладки нет отдельного шаблона, пропускаем
    if (!viewTemplates[viewName]) {
        return true;
    }

    try {
        const response = await fetch(viewTemplates[viewName]);
        if (!response.ok) {
            console.error(`Не удалось загрузить шаблон: ${viewName}`);
            return false;
        }

        const html = await response.text();

        // Вставляем содержимое в контейнер
        if (viewContainer) {
            viewContainer.insertAdjacentHTML('beforeend', html);
        }

        // Помечаем как загруженный
        viewCache[viewName] = true;
        console.log(`✅ Шаблон загружен: ${viewName}`);

        return true;
    } catch (error) {
        console.error(`Ошибка загрузки шаблона ${viewName}:`, error);
        return false;
    }
}

// Экспортируем в window
window.loadViewTemplate = loadViewTemplate;
