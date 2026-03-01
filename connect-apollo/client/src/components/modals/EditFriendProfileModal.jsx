import React, { useRef } from 'react';
import Modal from '../common/Modal';
import { useUIStore } from '../../stores/uiStore';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';

const EditFriendProfileModal = () => {
  const setActiveModal = useUIStore(s => s.setActiveModal);
  
  const viewProfileData = useProfileStore(s => s.viewProfileData);
  const friendOverrideForm = useProfileStore(s => s.friendOverrideForm);
  const setFriendOverrideForm = useProfileStore(s => s.setFriendOverrideForm);
  
  const socket = useAuthStore(s => s.socket);
  const friendAvatarInputRef = useRef(null);

  const handleSaveFriendOverride = async (isReset = false) => {
    if (!viewProfileData) return;
    const formData = new FormData();
    formData.append('friend_username', viewProfileData.username);
    
    if (isReset) {
      formData.append('reset', 'true');
    } else {
      formData.append('local_display_name', friendOverrideForm.local_display_name);
      if (friendOverrideForm.local_avatar_file) {
        formData.append('local_avatar', friendOverrideForm.local_avatar_file);
      } else {
        formData.append('local_avatar_url', friendOverrideForm.preview_avatar);
      }
    }

    try {
      const token = localStorage.getItem("apollo_token");
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/update-friend-override`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        socket.emit("get_initial_data");
        socket.emit("get_user_profile", viewProfileData.username);
        setActiveModal('userProfile');
      } else {
        alert("Ошибка сохранения");
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая ошибка");
    }
  };

  return (
    <Modal title="Редактировать контакт" onClose={() => setActiveModal('userProfile')}>
      <div style={{ padding: 20 }}>
        <div className="form-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <div className="profile-avatar-large" style={{
              backgroundImage: friendOverrideForm.preview_avatar ? `url(${friendOverrideForm.preview_avatar})` : 'none',
              backgroundColor: '#333',
              width: 80,
              height: 80,
              cursor: 'pointer'
            }} onClick={() => friendAvatarInputRef.current.click()}>
              {!friendOverrideForm.preview_avatar && viewProfileData.username[0].toUpperCase()}
            </div>
            <input type="file" ref={friendAvatarInputRef} className="hidden-input" accept="image/*" onChange={(e) => {
              if (e.target.files[0]) {
                const file = e.target.files[0];
                setFriendOverrideForm(prev => ({ ...prev, local_avatar_file: file, preview_avatar: URL.createObjectURL(file) }));
              }
            }} />
            <div className="input-group" style={{ flex: 1 }}>
              <label>Локальное имя</label>
              <input className="modal-input" value={friendOverrideForm.local_display_name} onChange={(e) => setFriendOverrideForm(prev => ({ ...prev, local_display_name: e.target.value }))} />
            </div>
          </div>
          <button className="btn-primary" onClick={() => handleSaveFriendOverride(false)}>Сохранить</button>
          <button className="btn-danger" onClick={() => handleSaveFriendOverride(true)}>Сбросить изменения</button>
        </div>
      </div>
    </Modal>
  );
};

export default EditFriendProfileModal;