// Скрипт миграции: добавление costUZS для всех товаров
// Запустить: node migrate-backup.js

const fs = require('fs');
const path = require('path');

// Курсы валют (соответствуют настройкам приложения)
const rates = {
    cny: 7.2,
    uzs: 12850
};

// Путь к файлу бэкапа
const backupPath = path.join(__dirname, '..', '..', 'Downloads', 'shop_backup_2026-02-13.json');
const outputPath = path.join(__dirname, '..', '..', 'Downloads', 'shop_backup_2026-02-13_migrated.json');

console.log('🔄 Начало миграции данных...\n');

// Читаем файл
const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

let updatedProducts = 0;
let updatedShopProducts = 0;

// Обновляем товары на складе
if (data.data.products && Array.isArray(data.data.products)) {
    data.data.products.forEach(p => {
        if (!p.costUZS || p.costUZS === 0) {
            if (p.priceCNY && p.priceCNY > 0) {
                p.costUZS = Math.round((p.priceCNY / rates.cny) * rates.uzs);
                updatedProducts++;
                console.log(`✅ Склад: ${p.name} → costUZS = ${p.costUZS.toLocaleString()} сум`);
            } else if (p.priceUZS && p.priceUZS > 0) {
                // Для товаров без CNY используем priceUZS как себестоимость
                p.costUZS = p.priceUZS;
                updatedProducts++;
                console.log(`✅ Склад (без CNY): ${p.name} → costUZS = ${p.costUZS.toLocaleString()} сум`);
            }
        }
    });
}

console.log('\n');

// Обновляем товары в магазине
if (data.data.shop && Array.isArray(data.data.shop)) {
    data.data.shop.forEach(s => {
        if (!s.costUZS || s.costUZS === 0) {
            if (s.priceCNY && s.priceCNY > 0) {
                s.costUZS = Math.round((s.priceCNY / rates.cny) * rates.uzs);
                updatedShopProducts++;
                console.log(`✅ Магазин: ${s.name} → costUZS = ${s.costUZS.toLocaleString()} сум`);
            } else if (s.priceUZS && s.priceUZS > 0) {
                // Для товаров без CNY используем priceUZS как себестоимость
                s.costUZS = s.priceUZS;
                updatedShopProducts++;
                console.log(`✅ Магазин (без CNY): ${s.name} → costUZS = ${s.costUZS.toLocaleString()} сум`);
            }
        }
    });
}

console.log(`\n📊 Результаты миграции:`);
console.log(`   Обновлено товаров на складе: ${updatedProducts}`);
console.log(`   Обновлено товаров в магазине: ${updatedShopProducts}`);

if (updatedProducts > 0 || updatedShopProducts > 0) {
    // Сохраняем обновленный файл
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`\n💾 Сохранено в: ${outputPath}`);
    console.log('\n✅ Миграция завершена успешно!');
    console.log('\n📝 Следующие шаги:');
    console.log('   1. Откройте приложение');
    console.log('   2. Нажмите "Загрузить из файла"');
    console.log(`   3. Выберите файл: shop_backup_2026-02-13_migrated.json`);
} else {
    console.log('\nℹ️ Нет товаров для обновления.');
}
