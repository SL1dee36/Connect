import React, { useState, useRef } from 'react';
import Modal from '../common/Modal';
import { IconCamera } from '../common/Icons';

const CreateGroupContent = ({ username, socket, onClose }) => {
  const[groupName, setGroupName] = useState("");
  const [groupUsername, setGroupUsername] = useState("");
  const[isPrivate, setIsPrivate] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const[isCreating, setIsCreating] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return alert("Введите название группы");
    setIsCreating(true);

    let finalAvatarUrl = "";

    if (avatarFile) {
      const formData = new FormData();
      formData.append('file', avatarFile);
      formData.append('type', 'group_avatar');
      
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/upload-group-avatar`, { 
          method: 'POST', 
          body: formData 
        });
        const data = await res.json();
        if (data.url) finalAvatarUrl = data.url;
      } catch (e) {
        console.error("Ошибка загрузки аватарки", e);
      }
    }

    socket.emit("create_group", { 
      room: groupName,               // Имя группы (Отображаемое)
      group_username: groupUsername, // Ссылка (например: my_group)
      is_private: isPrivate,         // true/false
      avatar_url: finalAvatarUrl,    // Ссылка на загруженную картинку
      owner: username                // Кто создатель
    });

    setIsCreating(false);
    onClose();
  };

  return (
    <Modal title="Создать группу" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
        
        {/* Аватарка */}
        <div 
          className="profile-avatar-large" 
          onClick={() => fileInputRef.current.click()}
          style={{ 
            backgroundImage: avatarPreview ? `url(${avatarPreview})` : 'none',
            cursor: 'pointer',
            marginTop: '20px',
            border: '2px dashed #444'
          }}
        >
          {!avatarPreview && <IconCamera />}
        </div>
        <input type="file" ref={fileInputRef} className="hidden-input" accept="image/*" onChange={handleFileChange} />

        <div className="form-container" style={{ width: '100%', marginTop: '20px' }}>
          {/* Название */}
          <div className="input-group">
            <label>Название группы</label>
            <input 
              className="modal-input" 
              placeholder="Моя супер группа" 
              value={groupName} 
              onChange={(e) => setGroupName(e.target.value)} 
            />
          </div>

          {/* Username (Ссылка) */}
          <div className="input-group" style={{ marginTop: '15px' }}>
            <label>Ссылка (username)</label>
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #444' }}>
              <span style={{ color: '#888', paddingRight: '5px', fontSize: '16px' }}>@</span>
              <input 
                className="modal-input" 
                style={{ borderBottom: 'none', paddingLeft: 0 }}
                placeholder="my_super_group" 
                value={groupUsername} 
                onChange={(e) => setGroupUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              />
            </div>
            <span style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Люди смогут найти вашу группу по этой ссылке.
            </span>
          </div>

          {/* Приватность */}
          <div className="settings-item" style={{ padding: '15px 0', borderBottom: 'none', marginTop: '10px' }}>
            <div className="settings-label">
              <div style={{ fontSize: '15px' }}>Приватная группа</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                Только по приглашению
              </div>
            </div>
            <div className={`toggle-switch ${isPrivate ? 'on' : ''}`} onClick={() => setIsPrivate(!isPrivate)}>
              <div className="knob"></div>
            </div>
          </div>

          <button 
            className="btn-primary" 
            onClick={handleCreate}
            disabled={isCreating}
            style={{ marginTop: '20px' }}
          >
            {isCreating ? 'Создание...' : 'Создать группу'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateGroupContent;