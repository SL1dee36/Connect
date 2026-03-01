import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles/main.css";
import io from "socket.io-client";
import Auth from "./Auth";
import UserAgreement from "./legal/UserAgreement";
import License from "./legal/License";
import { jwtDecode } from "jwt-decode";
import { registerPushNotifications } from "./utils/pushSubscription";
import { useAuthStore } from "./stores/authStore";
import SocketManager from "./components/SocketManager";
import { useUIStore } from "./stores/uiStore";
import { useChatStore } from "./stores/chatStore";


import Sidebar from "./components/sidebar/Sidebar";
import ChatLayout from "./components/chat/ChatLayout";
import ModalsContainer from "./components/common/ModalsContainer";
import CallModal from "./components/common/CallModal";
import DragDropOverlay from "./components/common/DragDropOverlay";


const socket = io.connect(import.meta.env.VITE_BACKEND_URL || "http://localhost:3001", {
  autoConnect: false
});

const ChatContainer = () => {
  const isMobile = useUIStore(s => s.isMobile);
  const isSelectionMode = useUIStore(s => s.isSelectionMode);
  const isDragOverlayOpen = useUIStore(s => s.isDragOverlayOpen);
  const setIsDragOverlayOpen = useUIStore(s => s.setIsDragOverlayOpen);
  const dragFiles = useUIStore(s => s.dragFiles);
  const setDragFiles = useUIStore(s => s.setDragFiles);
  const inAppNotif = useUIStore(s => s.inAppNotif);
  const hideInAppNotif = useUIStore(s => s.hideInAppNotif);
  
  const setAttachedFiles = useChatStore(s => s.setAttachedFiles);
  const isUploading = useChatStore(s => s.isUploading);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOverlayOpen) setIsDragOverlayOpen(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget === null || e.relatedTarget === document.documentElement) {
        setIsDragOverlayOpen(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setDragFiles([...(dragFiles || []), ...droppedFiles].slice(0, 10));
      setIsDragOverlayOpen(true);
    } else {
      setIsDragOverlayOpen(false);
    }
  };

  useEffect(() => {
    const handleResize = () => useUIStore.getState().setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      className={`main-layout ${isMobile ? "mobile-mode" : ""} ${isSelectionMode ? "selection-mode-active" : ""}`} 
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    >
      <div className={`tg-in-app-notification ${inAppNotif?.visible ? 'visible' : ''}`} onClick={hideInAppNotif}>
      </div>

      <Sidebar />
      <ChatLayout />
      <ModalsContainer />        
      <CallModal />
      <DragDropOverlay 
        isOpen={isDragOverlayOpen}
        files={dragFiles}
        onCancel={() => { setIsDragOverlayOpen(false); setDragFiles([]); }}
        onRemoveFile={(index) => {
            const newFiles = dragFiles.filter((_, i) => i !== index);
            setDragFiles(newFiles);
            if (newFiles.length <= 1) setIsDragOverlayOpen(false);
        }}
        onSend={() => {
            setAttachedFiles(prev => [...prev, ...dragFiles].slice(0, 10));
            setIsDragOverlayOpen(false);
            setDragFiles([]);
        }}
        isUploading={isUploading}
      />
    </div>
  );
};

const MainApp = () => {
  const username = useAuthStore(s => s.username);
  const setUsername = useAuthStore(s => s.setUsername);
  const setSocket = useAuthStore(s => s.setSocket);
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NAVIGATE' && event.data.room) {
          useChatStore.getState().setRoom(event.data.room);
        }
      });
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("apollo_token");
    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        if (decodedUser.exp * 1000 > Date.now()) {
          setUsername(decodedUser.username);
          setSocket(socket);
          
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
    
    setUsername(decodedUser.username);
    setSocket(socket);
    
    socket.auth = { token };
    socket.connect();
    socket.emit("authenticate", { token });
    registerPushNotifications(token);
  };

  if (isLoading) {
    return <div className="App">Загрузка...</div>;
  }

  if (!username) {
    return (
      <div className="App">
        <Auth onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="App">
      <SocketManager />
      <ChatContainer />
    </div>
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