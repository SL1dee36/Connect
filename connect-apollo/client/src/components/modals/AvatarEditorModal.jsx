import React, { useCallback } from 'react';
import Modal from '../common/Modal';
import Cropper from 'react-easy-crop';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

const AvatarEditorModal = () => {
  const avatarEditor = useProfileStore(s => s.avatarEditor);
  const setAvatarEditor = useProfileStore(s => s.setAvatarEditor);
  const setMyProfile = useProfileStore(s => s.setMyProfile);
  
  const username = useAuthStore(s => s.username);
  const socket = useAuthStore(s => s.socket);
  const setActiveModal = useUIStore(s => s.setActiveModal);

  const createImage = useCallback((url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', (error) => reject(error));
      img.setAttribute('crossOrigin', 'anonymous');
      img.src = url;
    });
  }, []);

  const getCroppedImg = useCallback(async (imageSrc, pixelCrop, filters) => {
    const img = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) blur(${filters.blur}px)`;
    ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/webp', 0.8);
    });
  }, [createImage]);

  const handleSaveAvatar = async () => {
    if (!avatarEditor.croppedAreaPixels || !avatarEditor.image) return;
    
    const croppedImageBlob = await getCroppedImg(avatarEditor.image, avatarEditor.croppedAreaPixels, avatarEditor.filters);
    const formData = new FormData();
    formData.append('avatar', croppedImageBlob, 'avatar.webp');
    formData.append('username', username);

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/upload-avatar`, { 
        method: 'POST', 
        body: formData 
      });
      const data = await res.json();
      if (data.profile) {
        setMyProfile(prev => ({ ...prev, ...data.profile }));
        socket.emit("get_avatar_history", username);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAvatarEditor({ ...avatarEditor, isOpen: false, image: null });
      setActiveModal('settings');
    }
  };

  if (!avatarEditor.isOpen) return null;

  return (
    <Modal title="Редактор Аватара" onClose={() => {
      setAvatarEditor({ ...avatarEditor, isOpen: false, image: null });
      setActiveModal('settings');
    }}>
      <div className="avatar-editor-content">
        <div className="crop-container">
          <Cropper
            image={avatarEditor.image}
            crop={avatarEditor.crop}
            zoom={avatarEditor.zoom}
            aspect={1}
            onCropChange={(crop) => setAvatarEditor((p) => ({ ...p, crop }))}
            onZoomChange={(zoom) => setAvatarEditor((p) => ({ ...p, zoom }))}
            onCropComplete={(_, croppedAreaPixels) => setAvatarEditor((p) => ({ ...p, croppedAreaPixels }))}
            imageStyle={{ filter: `brightness(${avatarEditor.filters.brightness}%) contrast(${avatarEditor.filters.contrast}%) saturate(${avatarEditor.filters.saturate}%) blur(${avatarEditor.filters.blur}px)` }}
          />
        </div>
        <div className="editor-controls">
          <div className="slider-group">
            <label>Zoom</label>
            <input type="range" min={1} max={3} step={0.1} value={avatarEditor.zoom} onChange={(e) => setAvatarEditor((p) => ({ ...p, zoom: e.target.value }))} />
          </div>
          <div className="slider-group">
            <label>Яркость</label>
            <input type="range" min={0} max={200} value={avatarEditor.filters.brightness} onChange={(e) => setAvatarEditor((p) => ({ ...p, filters: { ...p.filters, brightness: e.target.value } }))} />
          </div>
          <div className="slider-group">
            <label>Контраст</label>
            <input type="range" min={0} max={200} value={avatarEditor.filters.contrast} onChange={(e) => setAvatarEditor((p) => ({ ...p, filters: { ...p.filters, contrast: e.target.value } }))} />
          </div>
          <div className="slider-group">
            <label>Насыщ.</label>
            <input type="range" min={0} max={200} value={avatarEditor.filters.saturate} onChange={(e) => setAvatarEditor((p) => ({ ...p, filters: { ...p.filters, saturate: e.target.value } }))} />
          </div>
          <div className="slider-group">
            <label>Размытие</label>
            <input type="range" min={0} max={10} step={0.1} value={avatarEditor.filters.blur} onChange={(e) => setAvatarEditor((p) => ({ ...p, filters: { ...p.filters, blur: e.target.value } }))} />
          </div>
        </div>
        <button className="btn-primary" onClick={handleSaveAvatar}>Применить</button>
      </div>
    </Modal>
  );
};

export default AvatarEditorModal;