import React from "react";
import Modal from "../common/Modal";
import { useUIStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useAuthStore } from "../../stores/authStore";
import { useChatStore } from "../../stores/chatStore";

const NotificationsModal = () => {
    const setActiveModal = useUIStore(s => s.setActiveModal);
    const isMobile = useUIStore(s => s.isMobile);
    const setSwipeX = useUIStore(s => s.setSwipeX);
    const setShowMobileChat = useUIStore(s => s.setShowMobileChat);
    
    const notifications = useSettingsStore(s => s.notifications);
    const setNotifications = useSettingsStore(s => s.setNotifications);
    const setHasUnreadNotifs = useSettingsStore(s => s.setHasUnreadNotifs);
    
    const socket = useAuthStore(s => s.socket);
    const setRoom = useChatStore(s => s.setRoom);

    const switchChat = (targetName) => {
      setRoom(targetName);
      if (isMobile) {
        setSwipeX(0);
        setShowMobileChat(true);
      }
      setActiveModal(null);
    };

    return (
        <Modal title="Уведомления" onClose={() => { setActiveModal(null); setHasUnreadNotifs(false); }}>
          <div className="settings-list" style={{padding: 0 , marginTop: '100px'}}>
            {notifications.length === 0 && (<div style={{textAlign: 'center', padding: 20, color: '#888'}}>Нет уведомлений</div>)}
            {notifications.map((notif) => (
              <div key={notif.id} className="settings-item" style={{ backgroundColor: notif.is_read ? 'transparent' : 'rgba(43, 149, 255, 0.1)', borderBottom: '1px solid #333', flexDirection: 'column', alignItems: 'flex-start', gap: 5 }}>
                <div style={{display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{fontWeight: 'bold', fontSize: 14}}>{notif.type === 'friend_request' ? "Заявка в друзья" : (notif.type === 'mention' ? "Упоминание" : "Уведомление")}</span>
                  <button onClick={() => { socket.emit("delete_notification", {id: notif.id}); setNotifications(prev => prev.filter(n => n.id !== notif.id)); }} style={{background: 'none', border: 'none', color: '#666', cursor: 'pointer'}}>&times;</button>
                </div>
                <div style={{fontSize: 14, color: '#ddd'}}>
                  {notif.type === 'friend_request' ? `Пользователь ${notif.content} хочет добавить вас в друзья.` : notif.content}
                </div>
                {notif.type === 'mention' && (
                  <button className="btn-accept" style={{marginTop: 5, padding: '5px 10px', fontSize: 12}} onClick={() => switchChat(notif.data)}>Перейти к чату</button>
                )}
                {notif.type === 'friend_request' && (
                  <div className="notification-actions" style={{marginTop: 5, display: 'flex', gap: 10}}>
                    <button className="btn-accept" onClick={() => { socket.emit("accept_friend_request", { notifId: notif.id, fromUsername: notif.content }); setNotifications(prev => prev.filter(n => n.id !== notif.id)); }}>Принять</button>
                    <button className="btn-decline" onClick={() => { socket.emit("decline_friend_request", { notifId: notif.id }); setNotifications(prev => prev.filter(n => n.id !== notif.id)); }}>Отклонить</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Modal>
    );
}

export default NotificationsModal;