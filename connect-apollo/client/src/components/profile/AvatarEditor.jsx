import React, { useState, useCallback } from 'react';
import Modal from '../common/Modal';
import Cropper from 'react-easy-crop';

const AvatarEditor = ({ 
  isOpen, 
  image, 
  onClose, 
  onSave,
  username 
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [filters, setFilters] = useState({ 
    brightness: 100, 
    contrast: 100, 
    saturate: 100, 
    blur: 0 
  });

  const createImage = useCallback((url) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });
  }, []);

  const getCroppedImg = useCallback(async (imageSrc, pixelCrop, filters) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) blur(${filters.blur}px)`;
    ctx.drawImage(
      image, 
      pixelCrop.x, 
      pixelCrop.y, 
      pixelCrop.width, 
      pixelCrop.height, 
      0, 
      0, 
      pixelCrop.width, 
      pixelCrop.height
    );
    
    return new Promise((resolve) => { 
      canvas.toBlob((blob) => { 
        if (blob) resolve(blob); 
      }, 'image/webp', 0.8); 
    });
  }, [createImage]);

  const handleSave = async () => {
    if (!croppedAreaPixels || !image) return;
    
    const croppedImageBlob = await getCroppedImg(image, croppedAreaPixels, filters);
    await onSave(croppedImageBlob);
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setFilters({ brightness: 100, contrast: 100, saturate: 100, blur: 0 });
  };

  if (!isOpen || !image) return null;

  return (
    <Modal title="Редактор Аватара" onClose={onClose}>
      <div className="avatar-editor-content">
        <div className="crop-container">
          <Cropper 
            image={image} 
            crop={crop} 
            zoom={zoom} 
            aspect={1} 
            onCropChange={(crop) => setCrop(crop)} 
            onZoomChange={(zoom) => setZoom(zoom)} 
            onCropComplete={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)} 
            imageStyle={{ 
              filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) blur(${filters.blur}px)` 
            }} 
          />
        </div>
        
        <div className="editor-controls">
          <div className="slider-group">
            <label>Zoom</label>
            <input 
              type="range" 
              min={1} 
              max={3} 
              step={0.1} 
              value={zoom} 
              onChange={(e) => setZoom(e.target.value)} 
            />
          </div>
          <div className="slider-group">
            <label>Яркость</label>
            <input 
              type="range" 
              min={0} 
              max={200} 
              value={filters.brightness} 
              onChange={(e) => setFilters(p => ({ ...p, brightness: e.target.value }))} 
            />
          </div>
          <div className="slider-group">
            <label>Контраст</label>
            <input 
              type="range" 
              min={0} 
              max={200} 
              value={filters.contrast} 
              onChange={(e) => setFilters(p => ({ ...p, contrast: e.target.value }))} 
            />
          </div>
          <div className="slider-group">
            <label>Насыщ.</label>
            <input 
              type="range" 
              min={0} 
              max={200} 
              value={filters.saturate} 
              onChange={(e) => setFilters(p => ({ ...p, saturate: e.target.value }))} 
            />
          </div>
          <div className="slider-group">
            <label>Размытие</label>
            <input 
              type="range" 
              min={0} 
              max={10} 
              step={0.1} 
              value={filters.blur} 
              onChange={(e) => setFilters(p => ({ ...p, blur: e.target.value }))} 
            />
          </div>
        </div>
        
        <div className="editor-actions" style={{display: 'flex', gap: 10, marginTop: 15}}>
          <button className="btn-secondary" onClick={handleReset} style={{flex: 1}}>
            Сбросить
          </button>
          <button className="btn-primary" onClick={handleSave} style={{flex: 1}}>
            Применить
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AvatarEditor;