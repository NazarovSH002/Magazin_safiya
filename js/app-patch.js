// Патч для app.js - добавить в конец файла или перед закрывающей скобкой switchTab

// Обновленная логика для users
const originalSwitchTab = window.switchTab;
if (originalSwitchTab) {
    window.switchTab = function (viewId) {
        // Вызываем оригинальную функцию
        originalSwitchTab(viewId);

        // Дополнительная логика для загрузки HTML-шаблонов
        if (viewId === 'users' && window.loadViewTemplate) {
            window.loadViewTemplate('users');
        }
    };
}
