// client/src/App.jsx
import { useState, useEffect } from "react";
import "./App.css";
import io from "socket.io-client";
import Chat from "./chat";

// --- ИЗМЕНЕНИЕ: Подключаемся к URL из переменной окружения ---
const socket = io.connect(process.env.REACT_APP_BACKEND_URL || "http://localhost:3001");

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("General");
  const [showChat, setShowChat] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Состояние загрузки

  // Проверка сессии при загрузке страницы
  useEffect(() => {
    const storedUser = localStorage.getItem("apollo_user");
    const storedRoom = localStorage.getItem("apollo_room");

    if (storedUser) {
      setUsername(storedUser);
      setRoom(storedRoom || "General");
      
      // Восстанавливаем соединение с сервером
      socket.emit("login_user", storedUser);
      socket.emit("join_room", { username: storedUser, room: storedRoom || "General" });
      
      setShowChat(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    if (username !== "") {
      // Сохраняем в память браузера
      localStorage.setItem("apollo_user", username);
      localStorage.setItem("apollo_room", room);

      socket.emit("login_user", username);
      socket.emit("join_room", { username, room });
      setShowChat(true);
    }
  };

  if (isLoading) {
      return <div className="App">Загрузка...</div>;
  }

  return (
    <div className="App">
      {!showChat ? (
        <div className="joinChatContainer">
          <h3>Connect Apollo</h3>
          <input
            type="text"
            placeholder="Ваш Никнейм"
            onChange={(event) => setUsername(event.target.value)}
          />
          <button onClick={handleLogin}>Войти</button>
        </div>
      ) : (
        <Chat socket={socket} username={username} room={room} setRoom={setRoom} />
      )}
    </div>
  );
}

export default App;