import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"; // Импортируем роутинг
import "./App.css";
import "./custom/style/CallStyle.css"
// import "./legal/temp.css";
import io from "socket.io-client";
import Chat from "./Chat";
import Auth from "./Auth";
import UserAgreement from "./legal/UserAgreement";
import License from "./legal/License";
import { jwtDecode } from "jwt-decode";
import { registerPushNotifications } from "./custom/pushSubscription";

const socket = io.connect(import.meta.env.VITE_BACKEND_URL || "http://localhost:3001", {
  autoConnect: false
});

const MainApp = () => {
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState("General");
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="App">
      {!user ? (
        <Auth onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Chat socket={socket} username={user.username} room={room} setRoom={setRoom} handleLogout={handleLogout} />
      )}
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Главная страница с чатом и авторизацией */}
        <Route path="/" element={<MainApp />} />
        
        {/* Новые страницы */}
        <Route path="/terms" element={<UserAgreement />} />
        <Route path="/license" element={<License />} />
        
        {/* Любой неизвестный путь редиректим на главную */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;