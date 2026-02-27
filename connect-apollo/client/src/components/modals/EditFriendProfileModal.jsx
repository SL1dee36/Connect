import React from 'react';
import { useApp } from '../../context/AppContext';
import Modal from '../common/Modal';

const EditFriendProfileModal = () => {
  const { 
    setActiveModal, 
    viewProfileData, 
    friendOverrideForm, 
    setFriendOverrideForm, 
    friendAvatarInputRef, 
    handleSaveFriendOverride 
  } = useApp();

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