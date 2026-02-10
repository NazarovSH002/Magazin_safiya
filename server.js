const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const MONGODB_URI = process.env.MONGODB_URI;
const DATA_DIR = path.join(__dirname, 'data');

// Создаем папку data, если её нет
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

let isUsingMongoDB = false;

// Подключение к MongoDB
if (MONGODB_URI) {
    console.log('📡 Попытка подключения к MongoDB...');
    mongoose.connect(MONGODB_URI)
        .then(() => {
            console.log('✅ Успешно подключено к MongoDB');
            isUsingMongoDB = true;
            createDefaultUsers();
        })
        .catch(err => {
            console.error('❌ Ошибка подключения к MongoDB, использую локальные файлы:');
            console.error(err.message);
            isUsingMongoDB = false;
        });
} else {
    console.warn('⚠️ MONGODB_URI не установлен. Переход в автономный режим (локальные JSON файлы).');
    isUsingMongoDB = false;
}

// Схемы MongoDB
const DataSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
});
const DataModel = mongoose.model('Data', DataSchema);

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'seller'], default: 'seller' },
    name: String
});
const UserModel = mongoose.model('User', UserSchema);

// Вспомогательная функция для локальных данных
function getLocalPath(key) {
    return path.join(DATA_DIR, `${key}.json`);
}

function readLocalData(key, defaultValue = []) {
    const filePath = getLocalPath(key);
    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            return defaultValue;
        }
    }
    return defaultValue;
}

function writeLocalData(key, value) {
    fs.writeFileSync(getLocalPath(key), JSON.stringify(value, null, 2));
}

// Функции для работы с пользователями (автоматически определяют режим)
async function findUser(query) {
    if (isUsingMongoDB) {
        return await UserModel.findOne(query);
    } else {
        const users = readLocalData('users', [
            { username: 'admin', password: 'admin', role: 'admin', name: 'Администратор' },
            { username: 'seller', password: '1234', role: 'seller', name: 'Продавец' }
        ]);
        return users.find(u => Object.keys(query).every(k => u[k] === query[k]));
    }
}

async function createDefaultUsers() {
    if (isUsingMongoDB) {
        try {
            const adminExists = await UserModel.findOne({ username: 'admin' });
            if (!adminExists) {
                await UserModel.create({ username: 'admin', password: 'admin', role: 'admin', name: 'Администратор' });
                console.log('👤 Дефолтный админ создан в MongoDB');
            }
        } catch (err) { console.error(err); }
    }
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// API для авторизации
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`Попытка входа: ${username} (${isUsingMongoDB ? 'MongoDB' : 'Local'})`);

    try {
        const user = await findUser({ username, password });
        if (user) {
            res.json({ success: true, user: { username: user.username, role: user.role, name: user.name } });
        } else {
            res.status(401).json({ success: false, error: 'Неверный логин или пароль' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Загрузка данных
app.get('/api/load', async (req, res) => {
    try {
        if (isUsingMongoDB) {
            const allDocs = await DataModel.find({});
            const data = {};
            allDocs.forEach(doc => { data[doc.key] = doc.value; });
            res.json({
                products: data.products || [],
                shop: data.shop || [],
                sales: data.sales || [],
                debts: data.debts || [],
                installments: data.installments || [],
                expenses: data.expenses || [],
                rates: data.rates || { cny: 7.2, uzs: 12850 }
            });
        } else {
            res.json({
                products: readLocalData('products'),
                shop: readLocalData('shop'),
                sales: readLocalData('sales'),
                debts: readLocalData('debts'),
                installments: readLocalData('installments'),
                expenses: readLocalData('expenses'),
                rates: readLocalData('rates', { cny: 7.2, uzs: 12850 })
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Ошибка загрузки' });
    }
});

// Сохранение данных
app.post('/api/save', async (req, res) => {
    try {
        if (isUsingMongoDB) {
            const operations = Object.entries(req.body).map(([key, value]) => ({
                updateOne: { filter: { key }, update: { key, value }, upsert: true }
            }));
            if (operations.length > 0) await DataModel.bulkWrite(operations);
        } else {
            Object.entries(req.body).forEach(([key, value]) => {
                writeLocalData(key, value);
            });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

// API для управления пользователями

// Получить всех пользователей
app.get('/api/users', async (req, res) => {
    try {
        if (isUsingMongoDB) {
            const users = await UserModel.find({}, { password: 0 });
            res.json({ success: true, users });
        } else {
            const users = readLocalData('users', [
                { _id: '1', username: 'admin', password: 'admin', role: 'admin', name: 'Администратор' },
                { _id: '2', username: 'seller', password: '1234', role: 'seller', name: 'Продавец' }
            ]);
            // Убираем пароли перед отправкой
            const safeUsers = users.map(({ password, ...u }) => u);
            res.json({ success: true, users: safeUsers });
        }
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создать нового пользователя
app.post('/api/users', async (req, res) => {
    try {
        const { name, username, password, role } = req.body;
        if (!username || !password) return res.status(400).json({ success: false, error: 'Логин и пароль обязательны' });

        if (isUsingMongoDB) {
            const existing = await UserModel.findOne({ username });
            if (existing) return res.status(400).json({ success: false, error: 'Логин занят' });
            const newUser = await UserModel.create({ name: name || username, username, password, role: role || 'seller' });
            res.json({ success: true, user: { _id: newUser._id, name: newUser.name, username: newUser.username, role: newUser.role } });
        } else {
            const users = readLocalData('users');
            if (users.find(u => u.username === username)) return res.status(400).json({ success: false, error: 'Логин занят' });
            const newUser = { _id: Date.now().toString(), name: name || username, username, password, role: role || 'seller' };
            users.push(newUser);
            writeLocalData('users', users);
            const { password: pw, ...safeUser } = newUser;
            res.json({ success: true, user: safeUser });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Обновить пользователя
app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, username, password, role } = req.body;

        if (isUsingMongoDB) {
            const updateData = { name, username, role };
            if (password) updateData.password = password;
            const updatedUser = await UserModel.findByIdAndUpdate(id, updateData, { new: true });
            if (!updatedUser) return res.status(404).json({ success: false, error: 'Не найден' });
            res.json({ success: true, user: { _id: updatedUser._id, name: updatedUser.name, username: updatedUser.username, role: updatedUser.role } });
        } else {
            const users = readLocalData('users');
            const idx = users.findIndex(u => u._id === id);
            if (idx === -1) return res.status(404).json({ success: false, error: 'Не найден' });

            users[idx] = { ...users[idx], name, username, role };
            if (password) users[idx].password = password;

            writeLocalData('users', users);
            const { password: pw, ...safeUser } = users[idx];
            res.json({ success: true, user: safeUser });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Удалить пользователя
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (isUsingMongoDB) {
            const deletedUser = await UserModel.findByIdAndDelete(id);
            if (!deletedUser) return res.status(404).json({ success: false, error: 'Не найден' });
        } else {
            const users = readLocalData('users');
            const newUsers = users.filter(u => u._id !== id);
            if (users.length === newUsers.length) return res.status(404).json({ success: false, error: 'Не найден' });
            writeLocalData('users', newUsers);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту: ${PORT}`);
});
