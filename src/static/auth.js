// auth.js

// Логика для отображения ссылки "Забыли пароль?"
let loginAttempts = localStorage.getItem('loginAttempts') || 0;

// Получаем элемент с id "loginError" (должен быть на странице)
let loginErrorElement = document.getElementById('loginError');

// Проверяем, существует ли элемент и содержит ли он текст (означает ошибку)
if (loginErrorElement && loginErrorElement.textContent.trim() !== '') {
    loginAttempts++;
    localStorage.setItem('loginAttempts', loginAttempts);
}

if (loginAttempts >= 2) {
    document.getElementById('registerLink').style.display = 'none';
    document.getElementById('forgotPasswordLink').style.display = 'block';
} else {
    localStorage.removeItem('loginAttempts'); // Очищаем localStorage, если попыток меньше 2
}

// Функции для переключения между формами 
function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'none'; // Скрываем форму восстановления пароля
    document.getElementById('registerLink').style.display = 'block';
    document.getElementById('loginLink').style.display = 'none';
    document.getElementById('forgotPasswordLink').style.display = 'none'; // Скрываем ссылку "Забыли пароль?"
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('forgotPasswordForm').style.display = 'none'; // Скрываем форму восстановления пароля
    document.getElementById('registerLink').style.display = 'none';
    document.getElementById('loginLink').style.display = 'block';
    document.getElementById('forgotPasswordLink').style.display = 'none'; // Скрываем ссылку "Забыли пароль?"
}

function showForgotPasswordForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'block';
    document.getElementById('registerLink').style.display = 'none';
    document.getElementById('loginLink').style.display = 'none';
    document.getElementById('forgotPasswordLink').style.display = 'none'; // Скрываем ссылку "Забыли пароль?"
}