import React, { useState, useEffect } from "react";
import './style/DragDropOverlay.css';

const DragDropOverlay = ({
    isOpen,
    files,
    onSend,
    onCancel,
    onRemoveFile,
    isUploading
}) => {
    const [previewUrls, setPreviewUrls] = useState([]);

    useEffect(() => {
        if (files.length > 0) {
            const urls = files.map((file, index) => ({
                url: URL.createObjectURL(file),
                name: file.name,
                type: file.type,
                size: file.size,
                index: index
            }));

            setPreviewUrls(urls);

            return () => {
                urls.forEach(item => URL.revokeObjectURL(item.url));
            };
        } else {
            setPreviewUrls([]);
        }
    }, [files]);

    if (!isOpen || files.length === 0) return null;

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎬';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('zip') || type.includes('rar')) return '📦';
    return '📎';
  };

  return (
    <div className="drag-drop-overlay">
      <div className="drag-drop-content">
        <div className="drag-drop-header">
          <h3>📎 Файлы для отправки ({files.length})</h3>
          <button className="close-overlay-btn" onClick={onCancel}>×</button>
        </div>

        <div className="drag-drop-files">
          {previewUrls.map((file, index) => (
            <div key={index} className="drag-drop-file-item">
              {file.type.startsWith('image/') ? (
                <img src={file.url} alt={file.name} className="file-preview-image" />
              ) : (
                <div className="file-preview-icon">
                  {getFileIcon(file.type)}
                </div>
              )}
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-size">{formatFileSize(file.size)}</div>
              </div>
              {}
              <button 
                className="file-remove-btn"
                onClick={() => onRemoveFile && onRemoveFile(file.index)}
                title="Удалить файл"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="drag-drop-actions">
          <button 
            className="btn-cancel" 
            onClick={onCancel}
            disabled={isUploading}
          >
            Отменить
          </button>
          <button 
            className="btn-send" 
            onClick={onSend}
            disabled={isUploading || files.length === 0}
          >
            {isUploading ? (
              <>
                <div className="spinner-small"></div>
                Отправка...
              </>
            ) : (
              <>
                Отправить {files.length > 1 ? `(${files.length})` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DragDropOverlay;

