import React, { useRef } from 'react';
import Modal from '../common/Modal';
import { IconBell, IconCamera, IconMic, IconFolder, IconShare } from '../common/Icons';
import { useUIStore } from '../../stores/uiStore';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';

const SettingsModal = () => {
  const setActiveModal = useUIStore(s => s.setActiveModal);
  const setImageModalSrc = useUIStore(s => s.setImageModalSrc);

  const myProfile = useProfileStore(s => s.myProfile);
  const setMyProfile = useProfileStore(s => s.setMyProfile);
  const profileForm = useProfileStore(s => s.profileForm);
  const setProfileForm = useProfileStore(s => s.setProfileForm);
  const avatarHistory = useProfileStore(s => s.avatarHistory);
  const isMediaExpanded = useProfileStore(s => s.isMediaExpanded);
  const setIsMediaExpanded = useProfileStore(s => s.setIsMediaExpanded);
  const setAvatarEditor = useProfileStore(s => s.setAvatarEditor);

  const username = useAuthStore(s => s.username);
  const socket = useAuthStore(s => s.socket);
  const handleLogout = useAuthStore(s => s.handleLogout);

  const avatarInputRef = useRef(null);
  const profileMediaInputRef = useRef(null);

  const requestNotificationPermission = () => {
    socket.emit("update_profile", { 
      ...myProfile, 
      notifications_enabled: !profileForm.notifications_enabled 
    });
    setProfileForm(prev => ({ 
      ...prev, 
      notifications_enabled: !prev.notifications_enabled 
    }));
  };

  const requestMediaPermissions = async (type) => {
    try {
      const constraints = type === 'video'
        ? { audio: true, video: { facingMode: "user" } }
        : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach(track => track.stop());
      alert("Доступ к " + (type === 'video' ? "камере и микрофону" : "микрофону") + " получен!");
    } catch (err) {
      alert("Доступ отклонен или устройство не поддерживается.");
    }
  };

  const requestFilePermission = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => alert("Доступ к файлам подтвержден!");
    input.click();
  };

  const copyProfileLink = () => {
    const link = `${window.location.origin}?user=${username}`;
    navigator.clipboard.writeText(link);
    alert("Ссылка на профиль скопирована!");
  };

  const saveProfile = () => {
    if (profileForm.username !== username) {
      const usernameRegex = /^[a-zA-Z0-9]{3,}$/;
      if (!usernameRegex.test(profileForm.username)) {
        alert("Nametag должен содержать только латинские буквы и цифры, минимум 3 символа.");
        return;
      }
    }
    
    socket.emit("update_profile", {
      username,
      bio: profileForm.bio,
      phone: profileForm.phone,
      display_name: profileForm.display_name,
      notifications_enabled: profileForm.notifications_enabled,
      newUsername: profileForm.username
    });
    setActiveModal(null);
  };

  const handleProfileMediaSelect = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('username', username);
      const localUrl = URL.createObjectURL(file);
      const tempId = Date.now();
      
      const tempMediaItem = { id: tempId, url: localUrl, type: file.type.startsWith('video') ? 'video' : 'image', temp: true };
      
      setMyProfile({ ...myProfile, media: [...(myProfile.media || []), tempMediaItem] });
      
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/upload-profile-media`, { 
          method: 'POST', 
          body: formData 
        });
        const data = await res.json();
        if (data.url) {
          setMyProfile(prev => ({
            ...prev,
            media: prev.media.map(m => m.id === tempId ? { ...m, url: data.url, temp: false } : m)
          }));
        }
      } catch (e) {
        console.error(e);
        alert("Ошибка загрузки медиа");
        setMyProfile(prev => ({
          ...prev,
          media: prev.media.filter(m => m.id !== tempId)
        }));
      }
    }
  };

  const onAvatarFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarEditor({ 
          isOpen: true, 
          image: reader.result, 
          crop: { x: 0, y: 0 }, 
          zoom: 1, 
          filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 } 
        });
        setActiveModal(null);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Modal title="My Profile" onClose={() => setActiveModal(null)}>
      <div className="profile-hero">
        <div className="profile-avatar-background" style={{
          backgroundImage: myProfile.avatar_url ? `url(${myProfile.avatar_url})` : 'none',
          backgroundColor: '#333'
        }}>
          {!myProfile.avatar_url && username[0].toUpperCase()}
        </div>
        <div className="ProfName">
          <div className="profile-name">{myProfile.display_name || username}</div>
          <div className="profile-status">@{username}</div>
        </div>
        <div className="btns">
          <button className="change-avatar-btn" onClick={() => avatarInputRef.current.click()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M4 4H2v16h20V4H4zm16 2v12H4V6h16zM8 8H6v2h2V8zm4 0h4v2h-4V8zm-2 2h2v4h-2v-4zm6 4h2v-4h-2v4zm0 0h-4v2h4v-2z"/></svg>
          </button>
        </div>
      </div>

      <div style={{ color: "#2b95ff", padding: "15px 10px 5px 10px", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>Аккаунт</div>

      <div className="settings-list">
        <div className="settings-item">
          <div className="form-container" style={{ flex: 1, padding: 0, margin: 0 }}>
            <div className="input-group">
              <label>Display Name</label>
              <input className="modal-input" style={{ padding: "5px 0", borderBottom: "none" }} value={profileForm.display_name} onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })} placeholder="Your Name" />
            </div>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M1 2h8.58l1.487 6.69l-1.86 1.86a14.08 14.08 0 0 0 4.243 4.242l1.86-1.859L22 14.42V23h-1a19.91 19.91 0 0 1-10.85-3.196a20.101 20.101 0 0 1-5.954-5.954A19.91 19.91 0 0 1 1 3V2Zm2.027 2a17.893 17.893 0 0 0 2.849 8.764a18.102 18.102 0 0 0 5.36 5.36A17.892 17.892 0 0 0 20 20.973v-4.949l-4.053-.9l-2.174 2.175l-.663-.377a16.073 16.073 0 0 1-6.032-6.032l-.377-.663l2.175-2.174L7.976 4H3.027Z"/></svg></div>
          <div className="form-container" style={{ flex: 1, padding: 0, margin: 0 }}>
            <div className="input-group">
              <label>Mobile</label>
              <input className="modal-input" style={{ padding: "5px 0", borderBottom: "none" }} value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="Add phone number" />
            </div>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M21 1v22H3V1h18Zm-8 2v6.5l-3-2.25L7 9.5V3H5v18h14V3h-6ZM9 3v2.5l1-.75l1 .75V3H9Zm-2 9h10v2H7v-2Zm0 4h8v2H7v-2Z"/></svg></div>
          <div className="form-container" style={{ flex: 1, padding: 0, margin: 0 }}>
            <div className="input-group">
              <label>Bio</label>
              <input className="modal-input" style={{ padding: "5px 0", borderBottom: "none" }} value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="Add a few words about yourself" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#2b95ff", padding: "15px 10px 5px 10px", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>Настройки</div>

      <div className="settings-list">
        <div className="settings-item" onClick={requestNotificationPermission}>
          <div className="settings-icon"><IconBell hasUnread={false}/></div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="settings-label">Push-уведомления</div>
            <div className={`toggle-switch ${profileForm.notifications_enabled ? 'on' : ''}`}><div className="knob"></div></div>
          </div>
        </div>
        <div className="settings-item" onClick={() => requestMediaPermissions('video')}>
          <div className="settings-icon"><IconCamera /></div>
          <div className="settings-label">Доступ к камере и микрофону</div>
        </div>
        <div className="settings-item" onClick={() => requestMediaPermissions('audio')}>
          <div className="settings-icon"><IconMic /></div>
          <div className="settings-label">Доступ к микрофону</div>
        </div>
        <div className="settings-item" onClick={requestFilePermission}>
          <div className="settings-icon"><IconFolder /></div>
          <div className="settings-label">Доступ к файлам</div>
        </div>
        <div className="settings-item" onClick={copyProfileLink}>
          <div className="settings-icon"><IconShare/></div>
          <div className="settings-label">Поделиться профилем</div>
        </div>
      </div>

      <div className="avatar-history" style={{ padding: "0 20px" }}>
        <h4>История аватаров</h4>
        <div className="avatar-history-container">
          {avatarHistory.map((avatar) => (
            <div key={avatar.id} className="avatar-history-item">
              <img src={avatar.avatar_url} alt="old avatar" onClick={() => setImageModalSrc(avatar.avatar_url)} />
              <button className="delete-avatar-btn" onClick={() => socket.emit("delete_avatar", { avatarId: avatar.id })}>⨉</button>
            </div>
          ))}
        </div>
      </div>

      <div className="profile-media-section">
        <div className="profile-media-header"><h4>Медиа профиля ({myProfile.media ? myProfile.media.length : 0})</h4></div>
        <div className="media-grid">
          <div className="media-grid-add-btn" onClick={() => profileMediaInputRef.current.click()}>+</div>
          {myProfile.media && (isMediaExpanded ? myProfile.media : myProfile.media.slice(-5).reverse()).map((item, idx) => (
            <div key={idx} className="media-grid-item" onClick={() => setImageModalSrc(item.url)}>
              {item.temp && <div className="uploading-overlay"><div className="spinner"></div></div>}
              {item.type === 'video' ? <video src={item.url} muted /> : <img src={item.url} alt="media" />}
            </div>
          ))}
        </div>
        {myProfile.media && myProfile.media.length > 5 && (
          <button className="media-toggle-btn" onClick={() => setIsMediaExpanded(!isMediaExpanded)}>
            {isMediaExpanded ? "Свернуть" : `Показать все (${myProfile.media.length})`}
          </button>
        )}
      </div>

      <div style={{ padding: "20px" }}>
        <button className="btn-primary" style={{ width: "100%" }} onClick={saveProfile}>Save Changes</button>
        <button className="btn-danger" style={{ marginTop: 10, textAlign: "center", width: "100%" }} onClick={handleLogout}>Log Out</button>
      </div>

      {/* Скрытые инпуты */}
      <input type="file" ref={avatarInputRef} className="hidden-input" onChange={onAvatarFileChange} accept="image/*" />
      <input type="file" ref={profileMediaInputRef} className="hidden-input" accept="image/*,video/*" onChange={handleProfileMediaSelect} />
    </Modal>
  );
};

export default SettingsModal;