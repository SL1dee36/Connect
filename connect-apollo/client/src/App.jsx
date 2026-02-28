import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles/main.css";
import io from "socket.io-client";
import Auth from "./Auth";
import UserAgreement from "./legal/UserAgreement";
import License from "./legal/License";
import { jwtDecode } from "jwt-decode";
import { registerPushNotifications } from "./utils/pushSubscription";

import { AppProvider, useApp } from "./context/AppContext";
import Sidebar from "./components/sidebar/Sidebar";
import ChatLayout from "./components/chat/ChatLayout";
import ModalsContainer from "./components/common/ModalsContainer";
import CallModal from "./components/common/CallModal";
import DragDropOverlay from "./components/common/DragDropOverlay";

const socket = io.connect(import.meta.env.VITE_BACKEND_URL || "http://localhost:3001", {
  autoConnect: false
});

const ChatContainer = () => {
  const appState = useApp();

  // Глобальные обработчики для Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!appState.isDragOverlayOpen) {
      appState.setIsDragOverlayOpen(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Закрываем оверлей только если мышь покинула пределы окна браузера
    if (e.relatedTarget === null || e.relatedTarget === document.documentElement) {
        appState.setIsDragOverlayOpen(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      
      // Добавляем новые файлы к уже существующим (максимум 10)
      appState.setDragFiles(prev => {
          const combined = [...(prev || []), ...droppedFiles];
          return combined.slice(0, 10); 
      });
      
      appState.setIsDragOverlayOpen(true);
    } else {
      appState.setIsDragOverlayOpen(false);
    }
  };

  return (
    <div 
      className={`main-layout ${appState.isMobile ? "mobile-mode" : ""} ${appState.isSelectionMode ? "selection-mode-active" : ""}`} 
      style={{ touchAction: "pan-y" }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      
      <div className={`tg-in-app-notification ${appState.inAppNotif?.visible ? 'visible' : ''}`} onClick={appState.handleInAppNotifClick}>
        <div className="tg-notif-avatar" style={appState.inAppNotif?.avatar ? {backgroundImage: `url(${appState.inAppNotif.avatar})`} : {}}>
            {!appState.inAppNotif?.avatar && appState.inAppNotif?.title?.[0]?.toUpperCase()}
        </div>
        <div className="tg-notif-content">
            <div className="tg-notif-title">{appState.inAppNotif?.title}</div>
            <div className="tg-notif-body">{appState.inAppNotif?.body}</div>
        </div>
      </div>

      <Sidebar {...appState} />
      <ChatLayout {...appState} />
      
      <ModalsContainer />        
      <CallModal />
      <DragDropOverlay 
        isOpen={appState.isDragOverlayOpen}
        files={appState.dragFiles}
        onCancel={() => {
            appState.setIsDragOverlayOpen(false);
            appState.setDragFiles([]);
        }}
        onRemoveFile={(index) => {
            appState.setDragFiles(prev => prev.filter((_, i) => i !== index));
            if (appState.dragFiles.length <= 1) {
                appState.setIsDragOverlayOpen(false);
            }
        }}
        onSend={() => {
            appState.setAttachedFiles(prev => {
                const combined = [...prev, ...appState.dragFiles];
                return combined.slice(0, 10);
            });
            appState.setIsDragOverlayOpen(false);
            appState.setDragFiles([]);
        }}
        isUploading={appState.isUploading}
      />
    </div>
  );
};

const MainApp = () => {
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NAVIGATE' && event.data.room) {
          setRoom(event.data.room);
        }
      });
    }
  },[]);

  useEffect(() => {
    const token = localStorage.getItem("apollo_token");
    const storedRoom = localStorage.getItem("apollo_room");

    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        if (decodedUser.exp * 1000 > Date.now()) {
          setUser(decodedUser);
          setRoom(storedRoom || "");
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
  },[]);

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

  if (!user) {
    return (
      <div className="App">
        <Auth onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <AppProvider socket={socket} username={user?.username} handleLogout={handleLogout}>
      <div className="App">
        <ChatContainer />
      </div>
    </AppProvider>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/terms" element={<UserAgreement />} />
        <Route path="/license" element={<License />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;