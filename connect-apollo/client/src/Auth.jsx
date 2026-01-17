import React, { useState } from 'react';
import { Link } from 'react-router-dom'; 
import "./legal/Legal.css";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

function Auth({ onLoginSuccess }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Пожалуйста, заполните все поля.');
      return;
    }
    setLoading(true);
    setError('');

    const url = isLoginMode ? `${BACKEND_URL}/login` : `${BACKEND_URL}/register`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Что-то пошло не так');
      }

      onLoginSuccess(data.token);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2 className="form-title">{isLoginMode ? 'Вход' : 'Регистрация'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group-auth">
            <input
              type="text"
              placeholder="Имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="auth-input"
            />
          </div>
          <div className="input-group-auth">
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Загрузка...' : (isLoginMode ? 'Войти' : 'Создать аккаунт')}
          </button>
        </form>
        <p className="toggle-auth">
          {isLoginMode ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
          <button onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}>
            {isLoginMode ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
        <div className="LegalLinks">
            <Link to="/terms" style={{ color: '#888', textDecoration: 'none' }}>Соглашение</Link>
            <Link to="/license" style={{ color: '#888', textDecoration: 'none' }}>Лицензия</Link>
        </div>
      </div>
    </div>
  );
}

export default Auth;