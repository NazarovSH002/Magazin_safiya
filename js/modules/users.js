// === МОДУЛЬ: УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ===

let allUsers = [];

export async function loadUsers() {
    if (!window.currentUser || window.currentUser.role !== 'admin') return;

    try {
        const response = await fetch(`${window.API_URL}/users`);
        const result = await response.json();
        allUsers = result.users || [];
        renderUsers();
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
    }
}

function renderUsers() {
    const grid = document.getElementById('users-grid');
    if (!grid) return;

    if (allUsers.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
                <div style="font-size: 18px; margin-bottom: 8px;">Пользователей пока нет</div>
                <div style="font-size: 14px;">Нажмите "Добавить пользователя" чтобы создать нового</div>
            </div>
        `;
        return;
    }

    grid.innerHTML = allUsers.map(user => {
        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : user.username[0].toUpperCase();
        const roleText = user.role === 'admin' ? 'Администратор' : 'Продавец';
        const roleIcon = user.role === 'admin' ? '👑' : '🛍️';

        return `
            <div class="user-card">
                <div class="user-card-header">
                    <div class="user-avatar">${initials}</div>
                    <div class="user-info">
                        <div class="user-name">${user.name || user.username}</div>
                        <div class="user-username">@${user.username}</div>
                    </div>
                </div>
                <div class="user-role-badge ${user.role}">
                    ${roleIcon} ${roleText}
                </div>
                <div class="user-card-actions">
                    <button class="btn-edit-user" onclick="window.UsersModule.editUser('${user._id}')">
                        ✏️ Редактировать
                    </button>
                    <button class="btn-delete-user" onclick="window.UsersModule.deleteUser('${user._id}', '${user.username}')">
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

export function openUserModal(userId = null) {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const editId = document.getElementById('edit-user-id');

    if (userId) {
        const user = allUsers.find(u => u._id === userId);
        if (user) {
            title.textContent = 'Редактировать пользователя';
            editId.value = userId;
            document.getElementById('user-name').value = user.name || '';
            document.getElementById('user-username').value = user.username;
            document.getElementById('user-password').value = '';
            document.getElementById('user-password').placeholder = 'Оставьте пустым, чтобы не менять';
            document.getElementById('user-role').value = user.role;
        }
    } else {
        title.textContent = 'Новый пользователь';
        editId.value = '';
        document.getElementById('user-name').value = '';
        document.getElementById('user-username').value = '';
        document.getElementById('user-password').value = '';
        document.getElementById('user-password').placeholder = 'Пароль';
        document.getElementById('user-role').value = 'seller';
    }

    modal.style.display = 'flex';
}

export function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
}

export async function saveUser() {
    const userId = document.getElementById('edit-user-id').value;
    const name = document.getElementById('user-name').value.trim();
    const username = document.getElementById('user-username').value.trim();
    const password = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;

    if (!username) {
        alert('Введите логин пользователя');
        return;
    }

    if (!userId && !password) {
        alert('Введите пароль для нового пользователя');
        return;
    }

    const userData = { name, username, role };
    if (password) userData.password = password;

    try {
        const url = userId ? `${window.API_URL}/users/${userId}` : `${window.API_URL}/users`;
        const method = userId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (result.success) {
            closeUserModal();
            await loadUsers();
        } else {
            alert(result.error || 'Ошибка при сохранении пользователя');
        }
    } catch (error) {
        console.error('Ошибка сохранения пользователя:', error);
        alert('Ошибка сервера при сохранении');
    }
}

export function editUser(userId) {
    openUserModal(userId);
}

export async function deleteUser(userId, username) {
    if (window.currentUser && window.currentUser.username === username) {
        alert('Вы не можете удалить свой собственный аккаунт');
        return;
    }

    if (!confirm(`Вы уверены, что хотите удалить пользователя @${username}?`)) {
        return;
    }

    try {
        const response = await fetch(`${window.API_URL}/users/${userId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            await loadUsers();
        } else {
            alert(result.error || 'Ошибка при удалении пользователя');
        }
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        alert('Ошибка сервера при удалении');
    }
}

// Инициализация при загрузке модуля
export function init() {
    // Закрытие модального окна при клике вне его
    document.addEventListener('click', (e) => {
        const userModal = document.getElementById('user-modal');
        if (e.target === userModal) {
            closeUserModal();
        }
    });
}
