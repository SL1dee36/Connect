import React from 'react';
import { useApp } from '../../context/AppContext';
import Modal from '../common/Modal';
import Cropper from 'react-easy-crop';

const AvatarEditorModal = () => {
  const { avatarEditor, setAvatarEditor, handleSaveAvatar } = useApp();

  if (!avatarEditor.isOpen) return null;

  return (
    <Modal title="Редактор Аватара" onClose={() => setAvatarEditor({ ...avatarEditor, isOpen: false })}>
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