import React from 'react';
import { IconReply, IconCopy, IconTrash } from '../common/Icons';

const ContextMenu = ({ x, y, msg, onClose, onReply, onCopy, onDeleteRequest, canDelete }) => {
  return (
    <div
      className="context-menu-container"
      style={{
        position: 'fixed', top: y, left: x, zIndex: 9999,
        background: '#252525', borderRadius: 8, border: '1px solid #333',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)', overflow: 'hidden', minWidth: 150
      }}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="menu-item" onClick={onReply} style={{padding: '10px 15px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'white'}}>
        <IconReply/> Ответить
      </div>
      <div className="menu-item" onClick={onCopy} style={{padding: '10px 15px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'white'}}>
        <IconCopy/> Копировать
      </div>
      {canDelete && (
        <div className="menu-item" onClick={onDeleteRequest} style={{padding: '10px 15px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: '#ff4d4d'}}>
          <IconTrash/> Удалить
        </div>
      )}
    </div>
  );
};

export default ContextMenu;