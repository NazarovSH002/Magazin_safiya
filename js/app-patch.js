// Патч для app.js - добавляет загрузку HTML-шаблонов

// Обновленная логика для загрузки HTML-шаблонов
const originalSwitchTab = window.switchTab;
if (originalSwitchTab) {
    window.switchTab = function (viewId) {
        // Вызываем оригинальную функцию
        originalSwitchTab(viewId);

        // Дополнительная логика для загрузки HTML-шаблонов
        if (window.loadViewTemplate) {
            if (viewId === 'dashboard') {
                window.loadViewTemplate('dashboard');
            }
            if (viewId === 'users') {
                window.loadViewTemplate('users');
            }
        }
    };
}
