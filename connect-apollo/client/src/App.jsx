// client/src/App.jsx

import { useState, useEffect } from "react";
import "./App.css";
import io from "socket.io-client";
import Chat from "./Chat";
import Auth from "./Auth";
import { jwtDecode } from "jwt-decode";
import { registerPushNotifications } from "./pushSubscription"; // Импорт функции подписки

const socket = io.connect(import.meta.env.VITE_BACKEND_URL || "http://localhost:3001", {
  autoConnect: false
});

function App() {
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState("General");
  const [isLoading, setIsLoading] = useState(true);

  // Слушаем сообщения от SW (клик по уведомлению)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NAVIGATE' && event.data.room) {
          setRoom(event.data.room);
        }
      });
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("apollo_token");
    const storedRoom = localStorage.getItem("apollo_room");

    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        if (decodedUser.exp * 1000 > Date.now()) {
          setUser(decodedUser);
          setRoom(storedRoom || "General");
          socket.auth = { token };
          socket.connect();
          socket.emit("authenticate", { token });
          
          // Пробуем подписаться на Push тихо (если уже разрешено)
          registerPushNotifications(token);
        } else {
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
    
    socket.auth = { token };
    socket.connect();
    socket.emit("authenticate", { token });

    // Запрашиваем разрешение на Push после входа
    registerPushNotifications(token);
  };

  const handleLogout = () => {
    localStorage.removeItem("apollo_token");
    setUser(null);
    socket.disconnect();
    window.location.reload();
  };
  
  if (isLoading) {
      return <div className="App">Загрузка...</div>;
  }

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