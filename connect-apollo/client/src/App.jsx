// client/src/App.jsx

import { useState, useEffect } from "react";
import "./App.css";
import io from "socket.io-client";
import Chat from "./Chat";
import Auth from "./Auth"; // <-- НОВОЕ
import { jwtDecode } from "jwt-decode"; // <-- НОВОЕ

const socket = io.connect(import.meta.env.VITE_BACKEND_URL || "http://localhost:3001", {
  autoConnect: false // <-- ВАЖНО: не подключаемся автоматически
});

function App() {
  const [user, setUser] = useState(null); // <-- Теперь храним объект user, а не просто имя
  const [room, setRoom] = useState("General");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("apollo_token");
    const storedRoom = localStorage.getItem("apollo_room");

    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        // Проверяем, не истек ли срок действия токена
        if (decodedUser.exp * 1000 > Date.now()) {
          setUser(decodedUser);
          setRoom(storedRoom || "General");
          socket.auth = { token }; // <-- Добавляем токен для аутентификации при подключении
          socket.connect();
          // Отправляем токен для аутентификации после подключения
          socket.emit("authenticate", { token });
        } else {
          // Токен истек, чистим
          localStorage.removeItem("apollo_token");
        }
      } catch (e) {
        console.error("Invalid token:", e);
        localStorage.removeItem("apollo_token");
      }
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (token) => {
    localStorage.setItem("apollo_token", token);
    const decodedUser = jwtDecode(token);
    setUser(decodedUser);
    
    // Подключаемся с токеном
    socket.auth = { token };
    socket.connect();
    socket.emit("authenticate", { token });
  };

  const handleLogout = () => {
    localStorage.removeItem("apollo_token");
    setUser(null);
    socket.disconnect();
    window.location.reload(); // Перезагружаем для чистого состояния
  };
  
  if (isLoading) {
      return <div className="App">Загрузка...</div>;
  }

  // Обновляем логику выхода в компоненте Chat
  const ChatWithLogout = () => <Chat socket={socket} username={user.username} room={room} setRoom={setRoom} handleLogout={handleLogout} />;

  return (
    <div className="App">
      {!user ? (
        <Auth onLoginSuccess={handleLoginSuccess} />
      ) : (
        <ChatWithLogout />
      )}
    </div>
  );
}

export default App;