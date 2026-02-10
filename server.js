const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const MONGODB_URI = process.env.MONGODB_URI;

// Подключение к MongoDB
if (MONGODB_URI) {
    console.log('📡 Попытка подключения к MongoDB...');
    mongoose.connect(MONGODB_URI)
        .then(() => {
            console.log('✅ Успешно подключено к MongoDB');
            createDefaultUsers();
        })
        .catch(err => {
            console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ПОДКЛЮЧЕНИЯ К MONGODB:');
            console.error(err.message);
        });
} else {
    console.warn('⚠️ MONGODB_URI не установлен в переменных окружения!');
}

// Схема для данных (продукты, продажи и т.д.)
const DataSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
});
const DataModel = mongoose.model('Data', DataSchema);

// Схема для пользователей
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'seller'], default: 'seller' },
    name: String
});
const UserModel = mongoose.model('User', UserSchema);

// Функция создания дефолтных пользователей
async function createDefaultUsers() {
    try {
        const adminExists = await UserModel.findOne({ username: 'admin' });
        if (!adminExists) {
            await UserModel.create({
                username: 'admin',
                password: 'admin',
                role: 'admin',
                name: 'Администратор'
            });
            console.log('👤 Дефолтный админ создан (admin/admin)');
        }

        const sellerExists = await UserModel.findOne({ username: 'seller' });
        if (!sellerExists) {
            await UserModel.create({
                username: 'seller',
                password: '1234',
                role: 'seller',
                name: 'Продавец'
            });
            console.log('👤 Дефолтный продавец создан (seller/1234)');
        }
    } catch (err) {
        console.error('❌ Ошибка при создании пользователей:', err);
    }
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// API для авторизации
app.post('/api/login', async (req, res) => {
    // Проверка состояния базы данных
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ success: false, error: 'База данных еще подключается. Попробуйте через 10 секунд.' });
    }

    const { username, password } = req.body;
    console.log(`Попытка входа: ${username}`);

    try {
        const user = await UserModel.findOne({ username, password });
        if (user) {
            console.log(`✅ Вход выполнен: ${username}`);
            res.json({ success: true, user: { username: user.username, role: user.role, name: user.name } });
        } else {
            console.log(`❌ Неверные данные для: ${username}`);
            res.status(401).json({ success: false, error: 'Неверный логин или пароль' });
        }
    } catch (error) {
        console.error('Ошибка логина:', error);
        res.status(500).json({ error: 'Ошибка сервера при поиске пользователя' });
    }
});

// API для управления пользователями
app.get('/api/users', async (req, res) => {
    try {
        const users = await UserModel.find({}, { password: 0 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка загрузки пользователей' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { username, password, role, name } = req.body;
        const newUser = await UserModel.create({ username, password, role, name });
        res.json({ success: true, user: { username: newUser.username, role: newUser.role, name: newUser.name } });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка создания пользователя' });
    }
});

app.delete('/api/users/:username', async (req, res) => {
    try {
        if (req.params.username === 'admin') return res.status(400).json({ error: 'Нельзя удалить главного админа' });
        await UserModel.deleteOne({ username: req.params.username });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления пользователя' });
    }
});

// Загрузка данных
app.get('/api/load', async (req, res) => {
    try {
        const allDocs = await DataModel.find({});
        const data = {};
        allDocs.forEach(doc => { data[doc.key] = doc.value; });
        res.json({
            products: data.products || [],
            shop: data.shop || [],
            sales: data.sales || [],
            debts: data.debts || [],
            installments: data.installments || [],
            rates: data.rates || { cny: 7.2, uzs: 12850 }
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка загрузки' });
    }
});

// Сохранение данных
app.post('/api/save', async (req, res) => {
    try {
        const operations = Object.entries(req.body).map(([key, value]) => ({
            updateOne: { filter: { key }, update: { key, value }, upsert: true }
        }));
        if (operations.length > 0) await DataModel.bulkWrite(operations);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту: ${PORT}`);
});
