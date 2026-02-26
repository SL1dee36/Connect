import React, { useState, useRef } from 'react';
import Modal from '../common/Modal';
import AvatarEditor from './AvatarEditor';
import { 
  IconBell, 
  IconCamera, 
  IconMic, 
  IconFolder, 
  IconShare 
} from '../common/Icons';

const MyProfile = ({ 
  isOpen, 
  onClose, 
  myProfile, 
  username, 
  socket, 
  onSave,
  onLogout,
  avatarInputRef 
}) => {
  const [profileForm, setProfileForm] = useState({
    bio: myProfile?.bio || "",
    phone: myProfile?.phone || "",
    display_name: myProfile?.display_name || username,
    username: username,
    notifications_enabled: myProfile?.notifications_enabled ?? 1
  });
  const [isMediaExpanded, setIsMediaExpanded] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarImage, setAvatarImage] = useState(null);
  const profileMediaInputRef = useRef(null);

  React.useEffect(() => {
    if (myProfile) {
      setProfileForm({
        bio: myProfile.bio || "",
        phone: myProfile.phone || "",
        display_name: myProfile.display_name || username,
        username: username,
        notifications_enabled: myProfile.notifications_enabled ?? 1
      });
    }
  }, [myProfile, username]);

  const getAvatarStyle = (imgUrl) => {
    return imgUrl 
      ? { 
          backgroundImage: `url(${imgUrl})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          backgroundColor: '#333', 
          color: 'transparent' 
        } 
      : { backgroundColor: '#333' };
  };

  const onFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setAvatarImage(reader.result);
        setShowAvatarEditor(true);
      }, false);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = async (croppedBlob) => {
    const formData = new FormData();
    formData.append('avatar', croppedBlob, 'avatar.webp');
    formData.append('username', username);
    
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/upload-avatar`, { 
        method: 'POST', 
        body: formData 
      });
      const data = await res.json();
      if (data.profile) {
        onSave({ ...myProfile, ...data.profile });
        socket.emit("get_avatar_history", username);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setShowAvatarEditor(false);
      setAvatarImage(null);
    }
  };

  const handleProfileMediaSelect = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadProfileMedia(e.target.files[0]);
    }
  };

  const uploadProfileMedia = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', username);
    const localUrl = URL.createObjectURL(file);
    const tempMediaItem = { 
      id: Date.now(), 
      url: localUrl, 
      type: file.type.startsWith('video') ? 'video' : 'image', 
      temp: true 
    };
    
    const updatedProfile = {
      ...myProfile,
      media: [...(myProfile.media || []), tempMediaItem]
    };
    onSave(updatedProfile);
    
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/upload-profile-media`, { 
        method: 'POST', 
        body: formData 
      });
      const data = await res.json();
      if (data.url) {
        onSave({
          ...myProfile,
          media: myProfile.media.map(m => 
            m.id === tempMediaItem.id ? { ...m, url: data.url, temp: false } : m
          )
        });
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка загрузки медиа");
      onSave({
        ...myProfile,
        media: myProfile.media.filter(m => m.id !== tempMediaItem.id)
      });
    }
  };

  const requestNotificationPermission = async () => {
    // Логика запроса уведомлений
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
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal title="My Profile" onClose={onClose}>
        <div className="profile-hero">
          <div 
            className="profile-avatar-background" 
            style={getAvatarStyle(myProfile?.avatar_url)}
            onClick={() => avatarInputRef?.current?.click()}
          >
            {!myProfile?.avatar_url && username[0].toUpperCase()}
          </div>
          <div className="ProfName">
            <div className="profile-name">{myProfile?.display_name || username}</div>
            <div className="profile-status">@{username}</div>
          </div>
        </div>

        <div style={{ color: "#2b95ff", padding: "15px 10px 5px 10px", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>
          Аккаунт
        </div>
        
        <div className="settings-list">
          <div className="settings-item">
            <div className="form-container" style={{ flex: 1, padding: 0, margin: 0 }}>
              <div className="input-group">
                <label>Display Name</label>
                <input 
                  className="modal-input" 
                  style={{ padding: "5px 0", borderBottom: "none" }} 
                  value={profileForm.display_name} 
                  onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })} 
                  placeholder="Your Name" 
                />
              </div>
            </div>
          </div>
          
          <div className="settings-item">
            <div className="settings-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
                <path fill="#ffffff" d="M4 4h16v12H8V8h8v6h2V6H6v12h14v2H4V4zm10 10v-4h-4v4h4z"/>
              </svg>
            </div>
            <div className="form-container" style={{ flex: 1, padding: 0, margin: 0 }}>
              <div className="input-group">
                <label>Nametag</label>
                <input 
                  className="modal-input" 
                  style={{ padding: "5px 0", borderBottom: "none" }} 
                  value={profileForm.username} 
                  onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })} 
                  placeholder="@username" 
                />
              </div>
            </div>
          </div>
          
          <div className="settings-item">
            <div className="settings-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
                <path fill="#ffffff" d="M1 2h8.58l1.487 6.69l-1.86 1.86a14.08 14.08 0 0 0 4.243 4.242l1.86-1.859L22 14.42V23h-1a19.91 19.91 0 0 1-10.85-3.196a20.101 20.101 0 0 1-5.954-5.954A19.91 19.91 0 0 1 1 3V2Zm2.027 2a17.893 17.893 0 0 0 2.849 8.764a18.102 18.102 0 0 0 5.36 5.36A17.892 17.892 0 0 0 20 20.973v-4.949l-4.053-.9l-2.174 2.175l-.663-.377a16.073 16.073 0 0 1-6.032-6.032l-.377-.663l2.175-2.174L7.976 4H3.027Z"/>
              </svg>
            </div>
            <div className="form-container" style={{ flex: 1, padding: 0, margin: 0 }}>
              <div className="input-group">
                <label>Mobile</label>
                <input 
                  className="modal-input" 
                  style={{ padding: "5px 0", borderBottom: "none" }} 
                  value={profileForm.phone} 
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} 
                  placeholder="Add phone number" 
                />
              </div>
            </div>
          </div>
          
          <div className="settings-item">
            <div className="settings-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
                <path fill="#ffffff" d="M21 1v22H3V1h18Zm-8 2v6.5l-3-2.25L7 9.5V3H5v18h14V3h-6ZM9 3v2.5l1-.75l1 .75V3H9Zm-2 9h10v2H7v-2Zm0 4h8v2H7v-2Z"/>
              </svg>
            </div>
            <div className="form-container" style={{ flex: 1, padding: 0, margin: 0 }}>
              <div className="input-group">
                <label>Bio</label>
                <input 
                  className="modal-input" 
                  style={{ padding: "5px 0", borderBottom: "none" }} 
                  value={profileForm.bio} 
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} 
                  placeholder="Add a few words about yourself" 
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ color: "#2b95ff", padding: "15px 10px 5px 10px", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>
          Настройки
        </div>
        
        <div className="settings-list">
          <div className="settings-item" onClick={requestNotificationPermission}>
            <div className="settings-icon"><IconBell hasUnread={false}/></div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="settings-label">Push-уведомления</div>
              <div className={`toggle-switch ${profileForm.notifications_enabled ? 'on' : ''}`}>
                <div className="knob"></div>
              </div>
            </div>
          </div>
          
          <div className="settings-item" onClick={() => requestMediaPermissions('video')}>
            <div className="settings-icon"><IconCamera /></div>
            <div className="settings-label">Доступ к камере и микрофону</div>
            <div style={{fontSize: 12, color: '#2b95ff'}}>Запросить</div>
          </div>
          
          <div className="settings-item" onClick={() => requestMediaPermissions('audio')}>
            <div className="settings-icon"><IconMic /></div>
            <div className="settings-label">Доступ к микрофону</div>
            <div style={{fontSize: 12, color: '#2b95ff'}}>Запросить</div>
          </div>
          
          <div className="settings-item" onClick={requestFilePermission}>
            <div className="settings-icon"><IconFolder /></div>
            <div className="settings-label">Доступ к галерее и файлам</div>
            <div style={{fontSize: 12, color: '#2b95ff'}}>Запросить</div>
          </div>
          
          <div className="settings-item" onClick={copyProfileLink}>
            <div className="settings-icon"><IconShare/></div>
            <div className="settings-label">Поделиться профилем</div>
          </div>
        </div>

        {myProfile?.media && myProfile.media.length > 0 && (
          <div className="profile-media-section">
            <div className="profile-media-header">
              <h4>Медиа профиля ({myProfile.media.length})</h4>
            </div>
            <div className="media-grid">
              <div className="media-grid-add-btn" onClick={() => profileMediaInputRef.current.click()}>+</div>
              {(isMediaExpanded ? myProfile.media : myProfile.media.slice(-5).reverse()).map((item, idx) => (
                <div key={idx} className="media-grid-item" onClick={() => {}}>
                  {item.temp && <div className="uploading-overlay"><div className="spinner"></div></div>}
                  {item.type === 'video' ? <video src={item.url} muted /> : <img src={item.url} alt="media" />}
                </div>
              ))}
            </div>
            {myProfile.media.length > 5 && (
              <button className="media-toggle-btn" onClick={() => setIsMediaExpanded(!isMediaExpanded)}>
                {isMediaExpanded ? "Свернуть" : `Показать все (${myProfile.media.length})`}
              </button>
            )}
            <input 
              type="file" 
              ref={profileMediaInputRef} 
              className="hidden-input" 
              accept="image/*,video/*" 
              onChange={handleProfileMediaSelect} 
            />
          </div>
        )}

        <div style={{ padding: "20px" }}>
          <button className="btn-primary" style={{ width: "100%" }} onClick={saveProfile}>
            Save Changes
          </button>
          <button className="btn-danger" style={{ marginTop: 10, textAlign: "center", width: "100%" }} onClick={onLogout}>
            Log Out
          </button>
        </div>
      </Modal>

      <AvatarEditor 
        isOpen={showAvatarEditor}
        image={avatarImage}
        onClose={() => {
          setShowAvatarEditor(false);
          setAvatarImage(null);
        }}
        onSave={handleSaveAvatar}
        username={username}
      />
      
      <input 
        type="file" 
        ref={avatarInputRef} 
        className="hidden-input" 
        onChange={onFileChange} 
        accept="image/*" 
      />
    </>
  );
};

export default MyProfile;