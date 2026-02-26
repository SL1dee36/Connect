import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { 
  IconMessage, 
  IconCall, 
  IconLightning, 
  IconMore, 
  IconShare 
} from '../common/Icons';

const UserProfile = ({ 
  isOpen, 
  onClose, 
  targetUsername, 
  currentUsername, 
  socket,
  onSwitchChat,
  onStartCall 
}) => {
  const [profile, setProfile] = useState(null);
  const [isMediaExpanded, setIsMediaExpanded] = useState(false);

  useEffect(() => {
    if (isOpen && targetUsername) {
      socket.emit("get_user_profile", targetUsername);
      
      const handleProfileData = (data) => {
        setProfile({ ...data, media: data.media || [] });
      };
      
      socket.on("user_profile_data", handleProfileData);
      
      return () => {
        socket.off("user_profile_data", handleProfileData);
      };
    }
  }, [isOpen, targetUsername, socket]);

  const handleWriteMessage = () => {
    const roomId = [currentUsername, targetUsername].sort().join("_");
    onSwitchChat(roomId);
    onClose();
  };

  const handleCall = () => {
    const roomId = [currentUsername, targetUsername].sort().join("_");
    if (onStartCall) {
      onStartCall(roomId, true);
    }
    onClose();
  };

  const copyProfileLink = () => {
    const link = `${window.location.origin}?user=${targetUsername}`;
    navigator.clipboard.writeText(link);
    alert("Ссылка на профиль скопирована!");
  };

  const handleRemoveFriend = () => {
    if (window.confirm(`Удалить ${profile?.display_name || targetUsername}?`)) {
      socket.emit("remove_friend", targetUsername);
      onClose();
    }
  };

  const handleBlockUser = () => {
    if (window.confirm(`Заблокировать ${profile?.display_name || targetUsername}?`)) {
      socket.emit("block_user", targetUsername);
      onClose();
    }
  };

  if (!isOpen || !profile) return null;

  return (
    <Modal title="Info" onClose={onClose}>
      <div className="profile-hero">
        <div 
          className="profile-avatar-background" 
          style={{
            backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : 'none',
            backgroundColor: '#333'
          }}
        >
          {!profile.avatar_url && profile.display_name?.[0]?.toUpperCase()}
        </div>
        <div className="ProfName">
          <div className="profile-name">{profile.display_name}</div>
          <div className="profile-status">@{profile.username}</div>
        </div>
        <div className="btns">
          <button className="change-avatar-btn" title="Написать сообщение" onClick={handleWriteMessage}>
            <IconMessage />
          </button>
          <button className="change-avatar-btn" title="Позвонить" onClick={handleCall}>
            <IconCall />
          </button>
          <button className="change-avatar-btn" title="Boost">
            <IconLightning />
          </button>
          <button className="change-avatar-btn" title="Еще">
            <IconMore />
          </button>
        </div>
      </div>

      <div className="settings-list">
        {profile.badges && profile.badges.length > 0 && (
          <div className="settings-item" style={{justifyContent:'center'}}>
            {profile.badges.map((b, i) => (
              <div 
                key={i} 
                title={b.name} 
                style={{width: 24, height: 24}} 
                dangerouslySetInnerHTML={{__html: b.svg_content}} 
              />
            ))}
          </div>
        )}
        
        {profile.bio && (
          <div className="settings-item">
            <div className="settings-label">
              <div style={{ fontSize: "16px" }}>{profile.bio}</div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>Bio</div>
            </div>
          </div>
        )}
        
        {profile.phone && (
          <div className="settings-item">
            <div className="settings-label">
              <div style={{ fontSize: "16px" }}>{profile.phone}</div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>Mobile</div>
            </div>
          </div>
        )}
        
        <div className="settings-item" onClick={copyProfileLink}>
          <div className="settings-icon"><IconShare/></div>
          <div className="settings-label">Поделиться профилем</div>
        </div>
      </div>

      {profile.media && profile.media.length > 0 && (
        <div className="profile-media-section">
          <div className="profile-media-header">
            <h4>Медиа ({profile.media.length})</h4>
          </div>
          <div className="media-grid">
            {(isMediaExpanded ? profile.media : profile.media.slice(-6).reverse()).map((item, idx) => (
              <div key={idx} className="media-grid-item">
                {item.type === 'video' ? <video src={item.url} muted /> : <img src={item.url} alt="media" />}
              </div>
            ))}
          </div>
          {profile.media.length > 6 && (
            <button className="media-toggle-btn" onClick={() => setIsMediaExpanded(!isMediaExpanded)}>
              {isMediaExpanded ? "Свернуть" : `Показать все (${profile.media.length})`}
            </button>
          )}
        </div>
      )}

      <div style={{ marginTop: "10px", background: "#212121", padding: "0 15px" }}>
        {profile.isFriend && (
          <div 
            className="settings-item" 
            onClick={handleRemoveFriend} 
            style={{ color: "#ff5959" }}
          >
            <span className="settings-icon" style={{ color: "#ff5959" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="#ffffff" d="m8.4 17l3.6-3.6l3.6 3.6l1.4-1.4l-3.6-3.6L17 8.4L15.6 7L12 10.6L8.4 7L7 8.4l3.6 3.6L7 15.6L8.4 17ZM5 21q-.825 0-1.413-.588T3 19V5q0-.825.588-1.413T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.588 1.413T19 21H5Zm0-2h14V5H5v14ZM5 5v14V5Z"/>
              </svg>
            </span> 
            Delete Contact
          </div>
        )}
        <div 
          className="settings-item" 
          onClick={handleBlockUser} 
          style={{ color: "#ff5959", border: "none" }}
        >
          <span className="settings-icon" style={{ color: "#ff5959" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
              <path fill="#ffffff" d="M12 22q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35-3.175 2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Zm0-2q3.35 0 5.675-2.325T20 12q0-1.35-.438-2.6T18.3 7.1L7.1 18.3q1.05.825 2.3 1.263T12 20Zm-6.3-3.1L16.9 5.7q-1.05-.825-2.3-1.262T12 4Q8.65 4 6.325 6.325T4 12q0 1.35.437 2.6T5.7 16.9Z"/>
            </svg>
          </span> 
          Block User
        </div>
      </div>
    </Modal>
  );
};

export default UserProfile;